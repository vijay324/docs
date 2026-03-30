import { AxiosError } from 'axios';
import {
  DEFAULT_API_ERROR_MESSAGE,
  extractApiErrorMessage,
  extractErrorMessageFromResponseData,
  NETWORK_CONNECTION_ERROR_MESSAGE,
} from "./api-error";



export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
  timestamp: Date;
  context?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle different types of errors
  handleError(error: any, context?: string): AppError {
    const appError = this.parseError(error, context);
    

    // Log error to console
    console.error(`[${context || 'Error'}]:`, appError.message, appError);

    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(appError);
    }
    
    return appError;
  }

  private parseError(error: any, context?: string): AppError {
    const timestamp = new Date();
    
    // Axios/HTTP errors
    if (error?.isAxiosError || error?.response) {
      const axiosError = error as AxiosError<any>;
      return {
        message: this.getHttpErrorMessage(axiosError),
        code: axiosError.code,
        statusCode: axiosError.response?.status,
        details: axiosError.response?.data,
        timestamp,
        context,
      };
    }
    
    // Network errors
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
      return {
        message: NETWORK_CONNECTION_ERROR_MESSAGE,
        code: 'NETWORK_ERROR',
        timestamp,
        context,
      };
    }
    
    // Timeout errors
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return {
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT_ERROR',
        timestamp,
        context,
      };
    }
    
    // Validation errors
    if (error?.name === 'ValidationError' || error?.errors) {
      return {
        message: 'Please check your input and try again.',
        code: 'VALIDATION_ERROR',
        details: error.errors,
        timestamp,
        context,
      };
    }
    
    // Authentication errors
    if (error?.message?.includes('Unauthorized') || error?.status === 401) {
      return {
        message: 'Your session has expired. Please log in again.',
        code: 'AUTH_ERROR',
        statusCode: 401,
        timestamp,
        context,
      };
    }
    
    // Permission errors
    if (error?.status === 403) {
      return {
        message: 'You do not have permission to perform this action.',
        code: 'PERMISSION_ERROR',
        statusCode: 403,
        timestamp,
        context,
      };
    }
    
    // Generic error
    return {
      message: extractApiErrorMessage(error, DEFAULT_API_ERROR_MESSAGE),
      code: 'UNKNOWN_ERROR',
      details: error,
      timestamp,
      context,
    };
  }

  private getHttpErrorMessage(error: AxiosError<any>): string {
    const data = error.response?.data;
    const backendMessage = extractErrorMessageFromResponseData(data);
    if (backendMessage) {
      return backendMessage;
    }

    return extractApiErrorMessage(error, DEFAULT_API_ERROR_MESSAGE);
  }

  private logError(error: AppError): void {
    // Add to in-memory log (limited to last 100 errors)
    this.errorLog.unshift(error);
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(0, 100);
    }
    
    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error in ${error.context || 'Unknown Context'}`);
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Status:', error.statusCode);
      console.error('Details:', error.details);
      console.error('Timestamp:', error.timestamp);
      console.groupEnd();
    }
  }



  private extractValidationErrors(error: AppError): string[] {
    const errors: string[] = [];
    
    if (error.details) {
      if (Array.isArray(error.details)) {
        return error.details.map(err => typeof err === 'string' ? err : err.message || 'Validation error');
      } else if (typeof error.details === 'object') {
        // Handle object with error properties
        Object.keys(error.details).forEach(key => {
          const detail = error.details[key];
          if (typeof detail === 'string') {
            errors.push(detail);
          } else if (detail?.message) {
            errors.push(detail.message);
          }
        });
      }
    }
    
    return errors.length > 0 ? errors : [error.message];
  }

  private getErrorTitle(error: AppError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Connection Failed';
      case 'TIMEOUT_ERROR':
        return 'Request Timeout';
      case 'AUTH_ERROR':
        return 'Authentication Required';
      case 'PERMISSION_ERROR':
        return 'Access Denied';
      case 'VALIDATION_ERROR':
        return 'Validation Error';
      default:
        return 'Error';
    }
  }

  private reportError(error: AppError): void {
    // In production, send to monitoring service (e.g., Sentry, LogRocket)
    // This is a placeholder for actual error reporting
    try {
      // Example: Sentry.captureException(error);
      console.log('Error reported to monitoring service:', error);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  // Public methods for error management
  getRecentErrors(limit = 10): AppError[] {
    return this.errorLog.slice(0, limit);
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Retry mechanism for failed operations
  async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000,
    backoff = 2
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // Don't retry on client errors (4xx) except 408, 429
        if ((error as any)?.response?.status >= 400 && (error as any)?.response?.status < 500) {
          if ((error as any)?.response?.status !== 408 && (error as any)?.response?.status !== 429) {
            throw error;
          }
        }
        
        // Wait before retry with exponential backoff
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError;
  }

  // Check if error is retryable
  isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
      return true;
    }
    
    // Timeout errors are retryable
    if (error?.code === 'ECONNABORTED') {
      return true;
    }
    
    // 5xx server errors are retryable
    if (error?.response?.status >= 500) {
      return true;
    }
    
    // 408 (timeout) and 429 (rate limit) are retryable
    if (error?.response?.status === 408 || error?.response?.status === 429) {
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions
export const handleApiError = (error: any, context?: string) => {
  return errorHandler.handleError(error, context);
};

export const retryOperation = <T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000,
  backoff = 2
) => {
  return errorHandler.retry(operation, maxAttempts, delay, backoff);
};
