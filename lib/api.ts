import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  isAxiosError,
} from "axios";
import { API_CONFIG } from "@/utils/api-config";
import { AWS_CONFIG, } from "@/utils/aws-config";
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "@/utils/types";
import { errorHandler } from "./error-handler";
import { extractErrorMessageFromResponseData } from "./api-error";
import { employeeTrustedDevice } from "./employee-trusted-device";

// SECURITY: Removed client-side encryption - TLS provides proper encryption

/**
 * API Client (Better Auth + direct API)
 *
 * Authenticated requests go to `NEXT_PUBLIC_API_URL` / `BACKEND_URL` under `/api/v1`
 * with `credentials: 'include'` so the Better Auth session cookie (set on the API
 * origin) is sent with each call.
 */

class ApiClient {
  private shouldSkipAuthRedirect(config?: AxiosRequestConfig): boolean {
    const headers = config?.headers as
      | Record<string, string | boolean | undefined>
      | undefined;

    const value =
      headers?.["X-Skip-Auth-Redirect"] ??
      headers?.["x-skip-auth-redirect"];

    return value === true || value === "true";
  }

  private normalizeErrorResponse(error: any): void {
    const responseData = error?.response?.data;
    const normalizedMessage = extractErrorMessageFromResponseData(responseData);

    if (!responseData || !normalizedMessage || typeof responseData !== "object") {
      return;
    }

    if (typeof responseData.error === "object") {
      responseData.error = normalizedMessage;
    }

    if (!responseData.message) {
      responseData.message = normalizedMessage;
    }
  }

  private readonly client: AxiosInstance;
  private readonly requestQueue: Map<string, Promise<any>> = new Map();

  // Enhanced input sanitization helper - COMPREHENSIVE XSS PROTECTION
  private sanitizeInput(data: any): any {
    if (data === null || data === undefined) return data;

    if (typeof data === "string") {
      return (
        data
          // Remove script tags (all variations)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<script>/gi, "")
          .replace(/<\/script>/gi, "")
          // Remove javascript: protocol (all variations)
          .replace(/javascript:/gi, "")
          .replace(/JAVASCRIPT:/gi, "")
          .replace(
            /&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;/gi,
            "",
          ) // HTML entity encoding
          // Remove event handlers (onclick, onerror, etc.)
          .replace(/on\w+\s*=/gi, "")
          // Remove data: URLs that could execute scripts
          .replace(/data:text\/html/gi, "")
          // Remove iframe tags
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
          // Remove object/embed tags
          .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
          .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
          // Remove style tags with expressions
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          // Remove dangerous CSS expressions
          .replace(/expression\s*\(/gi, "")
          // SECURITY: Removed aggressive SQL keyword removal - this was causing false positives
          // SQL injection protection is handled by MongoDB sanitization and parameterized queries
          // Removing SQL keywords from user content breaks legitimate use cases
          // Remove null bytes
          .replace(/\0/g, "")
          // Trim whitespace
          .trim()
      );
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeInput(item));
    }

    if (typeof data === "object") {
      const sanitized: any = {};
      for (const key in data) {
        if (Object.hasOwn(data, key)) {
          sanitized[key] = this.sanitizeInput(data[key]);
        }
      }
      return sanitized;
    }

    return data;
  }

  constructor() {
    const versionConfig =
      API_CONFIG.VERSION_CONFIG[
        API_CONFIG.VERSION as keyof typeof API_CONFIG.VERSION_CONFIG
      ];
    const timeout = AWS_CONFIG.isAWS
      ? AWS_CONFIG.settings.timeout
      : versionConfig.timeout;

    this.client = axios.create({
      timeout: timeout,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest", // CSRF protection
        ...(AWS_CONFIG.isAWS ? AWS_CONFIG.settings.headers : {}),
      },
      withCredentials: true, // Better Auth session cookie (API origin)
    });

    // Clean up any legacy token cookies on initialization
    if (typeof window !== "undefined") {
      document.cookie =
        "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("accessToken");
    }

    this.client.interceptors.request.use(
      (config) => {
        const origin = API_CONFIG.BASE_URL.replace(/\/$/, "");
        config.baseURL = `${origin}/api/v1`;
        config.withCredentials = true;

        if (typeof window !== "undefined") {
          const trusted = employeeTrustedDevice.getToken();
          if (trusted) {
            config.headers = config.headers ?? {};
            (config.headers as Record<string, string>)["X-Employee-Trusted-Device"] =
              trusted;
          }
        }

        return config;
      },
      (error) => {
        console.error("🚨 API Request Error:", error);
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      },
    );

    // Response interceptor to handle authentication errors and HTTP 304 responses
    this.client.interceptors.response.use(
      (response) => {
        // Handle HTTP 304 (Not Modified) responses
        if (response.status === 304) {
          console.warn("⚠️ Received HTTP 304 response - handling cached data");

          // For 304 responses, the browser should use cached data
          // If response.data is empty, we need to handle this gracefully
          if (!response.data) {
            console.log(
              "🔄 HTTP 304 with empty data - will be handled by React Query cache",
            );
            // Set a flag to indicate this is a cached response
            response.data = { _isCachedResponse: true };
          }
        }
        return response;
      },
      async (error) => {
        this.normalizeErrorResponse(error);

        // Handle 401 errors - clear tokens and redirect to login
        if (
          error.response?.status === 401 &&
          !this.shouldSkipAuthRedirect(error.config)
        ) {
          // Check if we're already on the sign-in page to avoid redirect loops
          const isOnSignInPage =
            typeof window !== "undefined" &&
            (window.location.pathname === "/auth/sign-in" ||
              window.location.pathname.includes("/auth/sign-in"));

          // Only clear tokens and redirect if not on sign-in page
          if (!isOnSignInPage) {
            // Clear local cached data
            if (typeof window !== "undefined") {
              localStorage.removeItem("flotick_user_data");
              localStorage.removeItem("flotick_organization");
              employeeTrustedDevice.clearToken();
            }

            // Check if it's a network error (server down)
            if (
              !error.response &&
              (error.code === "NETWORK_ERROR" ||
                error.message?.includes("Network Error"))
            ) {
              // Server is down - redirect to sign-in after a brief delay
              setTimeout(() => {
                if (typeof window !== "undefined") {
                  window.location.href =
                    "/auth/sign-in?reason=server_unavailable";
                }
              }, 1000);
            } else {
              // Invalid or expired token - redirect to sign-in
              setTimeout(() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/auth/sign-in?reason=session_expired";
                }
              }, 500);
            }
          }

          return Promise.reject(
            error instanceof Error ? error : new Error(String(error)),
          );
        }

        if (isAxiosError(error)) {
          return Promise.reject(error);
        }

        // Handle other errors with error handler
        const appError = errorHandler.handleError(error, "API Request");

        // Create an error object that preserves the status and details
        const terminalError = new Error(appError.message || "Request failed");
        (terminalError as any).status = appError.statusCode;
        (terminalError as any).details = appError.details;
        (terminalError as any).code = appError.code;
        (terminalError as any).appError = appError;

        // Also preserve original axios structure if possible for hooks that expect it
        if (error.response) {
          (terminalError as any).response = error.response;
        }

        return Promise.reject(terminalError);
      },
    );
  }

  // Token management (deprecated - tokens are server-side only)
  private getAccessToken(): string | null {
    console.warn(
      "[ApiClient] getAccessToken is deprecated. Tokens are stored server-side only.",
    );
    return null;
  }

  setTokens(_accessToken: string): void {
    console.warn(
      "[ApiClient] setTokens is deprecated. Use /api/auth/login for authentication.",
    );
  }

  setUserData(userData: any): void {
    if (typeof window !== "undefined" && userData) {
      localStorage.setItem("flotick_user_data", JSON.stringify(userData));
    }
  }

  clearTokens(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("flotick_user_data");
      localStorage.removeItem("flotick_organization");
      localStorage.removeItem("lastLoginTime");
    }
  }

  // Auth endpoints - SECURITY: Plain JSON over TLS
  async register(
    data: RegisterRequest,
  ): Promise<AxiosResponse<ApiResponse<AuthResponse>>> {
    return this.client.post("/auth/sign-up", data);
  }

  async login(
    data: LoginRequest,
  ): Promise<AxiosResponse<ApiResponse<AuthResponse>>> {
    return this.client.post("/auth/sign-in", data);
  }

  private backendOrigin(): string {
    return API_CONFIG.BASE_URL.replace(/\/$/, "");
  }

  async signOut(): Promise<AxiosResponse<ApiResponse>> {
    try {
      const response = await fetch(`${this.backendOrigin()}/api/auth/sign-out`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      this.clearTokens();

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = { success: response.ok };
      }
      return {
        data,
        status: response.status,
        statusText: response.ok ? "OK" : "Failed",
        headers: {},
        config: {} as any,
      } as AxiosResponse<ApiResponse>;
    } catch {
      this.clearTokens();
      console.warn("Sign out request failed, but local cache cleared");
      return {
        data: { success: true, message: "Signed out locally" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      } as AxiosResponse<ApiResponse>;
    }
  }

  async forgotPassword(email: string): Promise<AxiosResponse<ApiResponse>> {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/reset-password`
        : `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/auth/reset-password`;
    return axios.post(
      `${this.backendOrigin()}/api/auth/request-password-reset`,
      { email, redirectTo },
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
        timeout: 30_000,
      },
    );
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    return axios.post(
      `${this.backendOrigin()}/api/auth/reset-password`,
      { token, newPassword },
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
        timeout: 30_000,
      },
    );
  }

  // AI generation endpoints
  async generateTask(data: {
    description: string;
    projectContext?: string;
    priority?: "low" | "medium" | "high";
    estimatedHours?: number;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.client.post("/ai/generate-task", data);
  }

  async generateSprint(data: {
    goal: string;
    duration?: number;
    teamSize?: number;
    projectContext?: string;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.client.post("/ai/generate-sprint", data);
  }

  async generateContent(data: {
    prompt: string;
    context?: string;
    type?: "task" | "sprint";
    maxTokens?: number;
    temperature?: number;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.client.post("/ai/generate", data);
  }

  async getAIHealth(): Promise<AxiosResponse<ApiResponse>> {
    return this.client.get("/ai/health");
  }

  // DISABLED: getCurrentUser method to prevent /auth/me calls
  // Use getCurrentUserFromStorage() instead for local data
  async getCurrentUser(): Promise<AxiosResponse<ApiResponse>> {
    throw new Error(
      "getCurrentUser is disabled to prevent auth loops. Use getCurrentUserFromStorage() instead.",
    );
  }

  // Generic request methods with deduplication
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const requestKey = this.getRequestKey("GET", url, config);
    return this.deduplicateRequest(requestKey, () =>
      this.client.get(url, config),
    );
  }

  async post<T = any>(
    url: string,
    data: any = {},
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const sanitizedData = data ? this.sanitizeInput(data) : data;
    return this.client.post(url, sanitizedData, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const sanitizedData = data ? this.sanitizeInput(data) : data;
    return this.client.put(url, sanitizedData, config);
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const sanitizedData = data ? this.sanitizeInput(data) : data;
    return this.client.patch(url, sanitizedData, config);
  }

  /**
   * Retry a request against fallback paths when the primary route is not found.
   * Helps keep compatibility across backend route variants.
   */
  private async requestWithFallbackPaths<T>(
    request: (path: string) => Promise<AxiosResponse<T>>,
    primaryPath: string,
    fallbackPaths: string[],
  ): Promise<AxiosResponse<T>> {
    try {
      return await request(primaryPath);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        throw error;
      }

      for (const fallbackPath of fallbackPaths) {
        try {
          return await request(fallbackPath);
        } catch (fallbackError: any) {
          if (fallbackError?.response?.status !== 404) {
            throw fallbackError;
          }
        }
      }

      throw error;
    }
  }

  // Search methods
  async unifiedSearch(
    query: string,
    types?: string,
    limit?: number,
  ): Promise<AxiosResponse<ApiResponse>> {
    const params: any = { q: query };
    if (types) params.types = types;
    if (limit) params.limit = limit;

    return this.get("/search", { params });
  }

  async quickSearch(
    query: string,
    limit?: number,
  ): Promise<AxiosResponse<ApiResponse>> {
    const params: any = { q: query };
    if (limit) params.limit = limit;

    return this.get("/search/quick", { params });
  }

  // Request deduplication for GET requests
  private getRequestKey(
    method: string,
    url: string,
    config?: AxiosRequestConfig,
  ): string {
    const params = config?.params ? JSON.stringify(config.params) : "";
    return `${method}:${url}:${params}`;
  }

  private async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
  ): Promise<T> {
    // If request is already in progress, return the existing promise
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)!;
    }

    // Create new request and add to queue
    const promise = requestFn().finally(() => {
      // Remove from queue when completed
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, promise);
    return promise;
  }

  // Helper methods - now use cached data only
  isAuthenticated(): boolean {
    // Check if we have cached user data
    if (typeof window !== "undefined") {
      return localStorage.getItem("flotick_user_data") !== null;
    }
    return false;
  }

  hasValidTokens(): boolean {
    // With BFF pattern, tokens are server-side only
    // Return true if we have cached user data (likely authenticated)
    return this.isAuthenticated();
  }

  needsTokenRefresh(): boolean {
    // Token refresh is handled server-side
    return false;
  }

  // Silent refresh - no longer needed with BFF pattern
  async silentRefresh(): Promise<boolean> {
    // With BFF pattern, session management is server-side
    return this.isAuthenticated();
  }

  setAuthData(authResponse: AuthResponse): void {
    console.log("🔧 setAuthData called with:", {
      hasEmployee: !!authResponse.employee,
      hasOrganization: !!authResponse.organization,
      orgSlug: authResponse.organization?.slug,
    });

    // Store employee data (user data is non-sensitive and can be cached locally)
    const userData = authResponse.employee || (authResponse as any).user;
    if (userData && typeof window !== "undefined") {
      localStorage.setItem("flotick_user_data", JSON.stringify(userData));
    }

    // Store organization data if present
    if (authResponse.organization && typeof window !== "undefined") {
      const orgData = JSON.stringify(authResponse.organization);
      localStorage.setItem("flotick_organization", orgData);
      console.log(
        "✅ Organization stored in localStorage:",
        authResponse.organization.slug,
      );
    } else {
      console.warn("⚠️ No organization data in authResponse");
    }
  }

  getCurrentUserFromStorage() {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem("flotick_user_data");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // ==================== Attendance API Methods ====================

  /**
   * Check in for attendance
   */
  async checkIn(data: {
    date?: string;
    workType?: "Office" | "Remote" | "Hybrid";
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.post("/attendance/check-in", data);
  }

  /**
   * Check out from attendance
   */
  async checkOut(data: {
    date?: string;
    workDescription?: string;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.post("/attendance/check-out", data);
  }

  /**
   * Get today's attendance
   */
  async getTodayAttendance(): Promise<AxiosResponse<ApiResponse>> {
    return this.get("/attendance/today");
  }

  /**
   * Get attendance records with filters
   */
  async getAttendance(params?: {
    startDate?: string;
    endDate?: string;
    status?: "Checked In" | "Checked Out" | "Pending" | "Leave";
    workType?: "Office" | "Remote" | "Hybrid";
    employeeFilter?: string;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.get("/attendance", { params });
  }

  /**
   * Get attendance by ID
   */
  async getAttendanceById(id: string): Promise<AxiosResponse<ApiResponse>> {
    return this.get(`/attendance/${id}`);
  }

  /**
   * Update attendance record
   */
  async updateAttendance(
    id: string,
    data: {
      date?: string;
      checkInTime?: string;
      checkOutTime?: string;
      workType?: "Office" | "Remote" | "Hybrid";
      workDescription?: string;
    },
  ): Promise<AxiosResponse<ApiResponse>> {
    return this.put(`/attendance/${id}`, data);
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(id: string): Promise<AxiosResponse<ApiResponse>> {
    return this.delete(`/attendance/${id}`);
  }

  /**
   * Get team attendance overview (Admin only)
   */
  async getTeamAttendanceOverview(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.get("/attendance/team/overview", { params });
  }

  /**
   * Enhance work description using AI
   */
  async enhanceWorkDescription(
    description: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    return this.post("/attendance/enhance-description", { description });
  }

  // ==================== Leave Management API Methods ====================

  /**
   * Create a new leave request
   */
  async createLeaveRequest(data: {
    leaveType: "PL" | "SL" | "CL" | "EL" | "ML" | "PTL" | "CO" | "LOP";
    startDate: string;
    endDate: string;
    reason: string;
    isHalfDay?: boolean;
    halfDayType?: "first_half" | "second_half";
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.post("/leave", data);
  }

  /**
   * Get current user's leave requests
   */
  async getMyLeaveRequests(params?: {
    status?: "Pending" | "Approved" | "Rejected" | "Cancelled";
    skip?: number;
    limit?: number;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.get("/leave/my-requests", { params });
  }

  /**
   * Get team leave requests (Admin/Manager only)
   */
  async getTeamLeaveRequests(params?: {
    status?: "Pending" | "Approved" | "Rejected" | "Cancelled";
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    skip?: number;
    limit?: number;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.get("/leave/team", { params });
  }

  /**
   * Get pending leave requests for approval (Admin/Manager only)
   */
  async getPendingLeaveRequests(params?: {
    skip?: number;
    limit?: number;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.get("/leave/pending", { params });
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(id: string): Promise<AxiosResponse<ApiResponse>> {
    return this.get(`/leave/${id}`);
  }

  /**
   * Approve a leave request (Admin/Manager only)
   */
  async approveLeaveRequest(
    id: string,
    reviewComment?: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    return this.patch(`/leave/${id}/approve`, { reviewComment });
  }

  /**
   * Reject a leave request (Admin/Manager only)
   */
  async rejectLeaveRequest(
    id: string,
    reviewComment: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    return this.patch(`/leave/${id}/reject`, { reviewComment });
  }

  /**
   * Cancel own leave request
   */
  async cancelLeaveRequest(
    id: string,
    reason?: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    return this.patch(`/leave/${id}/cancel`, { reason });
  }

  /**
   * Get current user's leave balance
   */
  async getLeaveBalance(): Promise<AxiosResponse<ApiResponse>> {
    return this.get("/leave/balance");
  }

  /**
   * Get leave balance for an employee (Admin/Manager only)
   */
  async getEmployeeLeaveBalance(
    employeeId: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    return this.get(`/leave/balance/${employeeId}`);
  }

  /**
   * Get upcoming approved leaves
   */
  async getUpcomingLeaves(days?: number): Promise<AxiosResponse<ApiResponse>> {
    const params = days ? { days } : undefined;
    return this.get("/leave/upcoming", { params });
  }

  // ==================== Policy Configuration API Methods ====================

  async getAttendancePolicyConfig(
    organizationId: string,
    organizationSlug?: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    const primaryPath = organizationSlug
      ? `/o/${organizationSlug}/policies/attendance`
      : `/organizations/${organizationId}/policies/attendance`;
    const fallbackPaths = [
      ...(organizationSlug
        ? [`/organizations/${organizationId}/policies/attendance`]
        : []),
      ...(organizationSlug
        ? [`/o/${organizationSlug}/settings/policies/attendance`]
        : []),
    ];
    return this.requestWithFallbackPaths(
      (path) => this.get(path),
      primaryPath,
      fallbackPaths,
    );
  }

  async updateAttendancePolicyConfig(
    organizationId: string,
    config: any,
    organizationSlug?: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    const primaryPath = organizationSlug
      ? `/o/${organizationSlug}/policies/attendance`
      : `/organizations/${organizationId}/policies/attendance`;
    const fallbackPaths = [
      ...(organizationSlug
        ? [`/organizations/${organizationId}/policies/attendance`]
        : []),
      ...(organizationSlug
        ? [`/o/${organizationSlug}/settings/policies/attendance`]
        : []),
    ];
    return this.requestWithFallbackPaths(
      (path) => this.put(path, { config }),
      primaryPath,
      fallbackPaths,
    );
  }

  async resetAttendancePolicyConfig(
    organizationId: string,
    organizationSlug?: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    const primaryPath = organizationSlug
      ? `/o/${organizationSlug}/policies/attendance/reset`
      : `/organizations/${organizationId}/policies/attendance/reset`;
    const fallbackPaths = [
      ...(organizationSlug
        ? [`/organizations/${organizationId}/policies/attendance/reset`]
        : []),
      ...(organizationSlug
        ? [`/o/${organizationSlug}/settings/policies/attendance/reset`]
        : []),
    ];
    return this.requestWithFallbackPaths(
      (path) => this.post(path),
      primaryPath,
      fallbackPaths,
    );
  }

  async getLeavePolicyConfig(
    organizationId: string,
    organizationSlug?: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    const primaryPath = organizationSlug
      ? `/o/${organizationSlug}/policies/leave`
      : `/organizations/${organizationId}/policies/leave`;
    const fallbackPaths = [
      ...(organizationSlug
        ? [`/organizations/${organizationId}/policies/leave`]
        : []),
      ...(organizationSlug
        ? [`/o/${organizationSlug}/settings/policies/leave`]
        : []),
    ];
    return this.requestWithFallbackPaths(
      (path) => this.get(path),
      primaryPath,
      fallbackPaths,
    );
  }

  async updateLeavePolicyConfig(
    organizationId: string,
    config: any,
    organizationSlug?: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    const primaryPath = organizationSlug
      ? `/o/${organizationSlug}/policies/leave`
      : `/organizations/${organizationId}/policies/leave`;
    const fallbackPaths = [
      ...(organizationSlug
        ? [`/organizations/${organizationId}/policies/leave`]
        : []),
      ...(organizationSlug
        ? [`/o/${organizationSlug}/settings/policies/leave`]
        : []),
    ];
    return this.requestWithFallbackPaths(
      (path) => this.put(path, { config }),
      primaryPath,
      fallbackPaths,
    );
  }

  async resetLeavePolicyConfig(
    organizationId: string,
    organizationSlug?: string,
  ): Promise<AxiosResponse<ApiResponse>> {
    const primaryPath = organizationSlug
      ? `/o/${organizationSlug}/policies/leave/reset`
      : `/organizations/${organizationId}/policies/leave/reset`;
    const fallbackPaths = [
      ...(organizationSlug
        ? [`/organizations/${organizationId}/policies/leave/reset`]
        : []),
      ...(organizationSlug
        ? [`/o/${organizationSlug}/settings/policies/leave/reset`]
        : []),
    ];
    return this.requestWithFallbackPaths(
      (path) => this.post(path),
      primaryPath,
      fallbackPaths,
    );
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
