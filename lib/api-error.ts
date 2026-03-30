export const DEFAULT_API_ERROR_MESSAGE =
  "Unable to process your request. Please try again.";
export const NETWORK_CONNECTION_ERROR_MESSAGE =
  "Unable to connect to the server. Please check your internet connection.";
export const FRONTEND_BACKEND_CONNECTION_ERROR_MESSAGE =
  "Frontend-backend connection failed.";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === "object" ? (value as UnknownRecord) : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

export const extractErrorMessageFromResponseData = (
  responseData: unknown,
): string | undefined => {
  const data = asRecord(responseData);
  if (!data) return undefined;

  const directMessage = asString(data.message);
  if (directMessage) return directMessage;

  const errorValue = data.error;
  const stringError = asString(errorValue);
  if (stringError) return stringError;

  const errorObject = asRecord(errorValue);
  if (!errorObject) return undefined;

  return (
    asString(errorObject.message) ||
    asString(errorObject.error) ||
    asString(errorObject.title)
  );
};

export const extractApiErrorMessage = (
  error: unknown,
  fallback: string = DEFAULT_API_ERROR_MESSAGE,
): string => {
  const errorRecord = asRecord(error);
  if (!errorRecord) {
    return asString(error) || fallback;
  }

  const appErrorMessage = extractErrorMessageFromResponseData(errorRecord.appError);
  if (appErrorMessage) return appErrorMessage;

  const response = asRecord(errorRecord.response);
  const responseDataMessage = extractErrorMessageFromResponseData(response?.data);
  if (responseDataMessage) return responseDataMessage;

  const detailsMessage = extractErrorMessageFromResponseData(errorRecord.details);
  if (detailsMessage) return detailsMessage;

  const code = asString(errorRecord.code);
  const message = asString(errorRecord.message);

  if (
    code === "ERR_NETWORK" ||
    code === "NETWORK_ERROR" ||
    message?.includes("Network Error") ||
    message?.includes("Failed to fetch")
  ) {
    return NETWORK_CONNECTION_ERROR_MESSAGE;
  }

  if (code === "ECONNABORTED" || message?.toLowerCase().includes("timeout")) {
    return "The request timed out. Please try again.";
  }

  // Axios and fetch errors often include generic text like:
  // "Request failed with status code 500". Use status-aware messages instead.
  const status = (response?.status as number | undefined) || (errorRecord.status as number | undefined);
  if (status) {
    switch (status) {
      case 400:
        return "Invalid request. Please review your input and try again.";
      case 401:
        return "Authentication failed. Please sign in and try again.";
      case 403:
        return "You do not have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 409:
        return "Conflict detected. The resource already exists or was modified.";
      case 422:
        return "Validation failed. Please correct the highlighted fields.";
      case 429:
        return "Rate limit exceeded. Please wait 15 minutes and try again.";
      case 500:
      case 502:
      case 503:
      case 504:
        return "Service is temporarily unavailable. Please try again later.";
      default:
        break;
    }
  }

  if (!response && (message?.includes("fetch") || message?.includes("connection"))) {
    return FRONTEND_BACKEND_CONNECTION_ERROR_MESSAGE;
  }

  return message || fallback;
};
