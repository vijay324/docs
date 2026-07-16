import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG } from '@/utils/api-config';
import { SecurePlatformAdminStorage } from './secure-platform-admin-storage';
import { platformAdminTrustedDevice } from './platform-admin-trusted-device';
import {
  ApiResponse,
  PlatformAdminLoginResponse,
  PlatformAdminMeResponse,
  OrganizationListItem,
  OrganizationDetail,
  UserListItem,
  UserDetail,
  DashboardAnalytics,
  SubscriptionStats,
  EngagementMetrics,
  AuditLog,
  AuditStats,
  Pagination,
  OrganizationListQuery,
  UserListQuery,
  AuditLogQuery,
  SubscribedUser,
  ContactItem,
  ContactStats,
  SystemHealthReport,
  QuickHealthReport,
  ServiceHealth
} from './types/platform-admin';

/**
 * Platform Admin API Client
 * 
 * SECURITY IMPROVEMENTS:
 * - Uses SecurePlatformAdminStorage instead of localStorage
 * - In-memory token storage as primary
 * - Device fingerprint binding
 * - Automatic token refresh
 * - Session security validation
 */
class PlatformAdminApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<any> | null = null;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });

    // Sync tokens from cookies on initialization
    if (typeof window !== 'undefined') {
      SecurePlatformAdminStorage.syncFromCookies();
    }

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.baseURL = `${API_CONFIG.BASE_URL}${API_CONFIG.PREFIX}/platform-admin`;
        
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with improved token refresh handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors - try to refresh token
        // Skip for login/2FA endpoints to avoid infinite loops when auth fails
        const isAuthRequest = originalRequest.url?.includes('/auth/login') || 
                            originalRequest.url?.includes('/auth/2fa');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
          originalRequest._retry = true;

          try {
            // Use a single refresh promise to prevent race conditions
            if (!this.refreshPromise) {
              this.refreshPromise = this.handleTokenRefresh();
            }
            
            const newAccessToken = await this.refreshPromise;
            this.refreshPromise = null;
            
            if (newAccessToken) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.refreshPromise = null;
            this.clearAuth();
            if (typeof window !== 'undefined') {
              window.location.href = '/super-admin/login?reason=session_expired';
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle token refresh with race condition prevention
   */
  private async handleTokenRefresh(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await this.refreshTokens(refreshToken);
      if (response.data.success && response.data.data) {
        this.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
        return response.data.data.accessToken;
      }
    } catch (error) {
      console.error('[PA API] Token refresh failed:', error);
    }
    
    return null;
  }

  // ==================== SECURE TOKEN MANAGEMENT ====================

  getAccessToken(): string | null {
    return SecurePlatformAdminStorage.getAccessToken();
  }

  getRefreshToken(): string | null {
    return SecurePlatformAdminStorage.getRefreshToken();
  }

  setTokens(accessToken: string, refreshToken: string): void {
    SecurePlatformAdminStorage.setTokens(accessToken, refreshToken);
  }

  setAdminData(data: any): void {
    SecurePlatformAdminStorage.setAdminData(data);
  }

  getAdminData(): any | null {
    return SecurePlatformAdminStorage.getAdminData();
  }

  clearAuth(): void {
    SecurePlatformAdminStorage.clearAll();
  }

  isAuthenticated(): boolean {
    return SecurePlatformAdminStorage.isAuthenticated();
  }

  /**
   * Check if token needs refresh (proactive refresh)
   */
  needsTokenRefresh(): boolean {
    return SecurePlatformAdminStorage.needsRefresh();
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * Login Step 1: Verify password and receive temp token + 2FA code sent to email
   */
  async login(email: string, password: string): Promise<AxiosResponse<ApiResponse<{
    requires2FA: boolean;
    tempToken?: string;
    email?: string;
    expiresAt?: string;
    expiresInSeconds?: number;
    canResendAt?: string;
    admin?: {
      _id: string;
      email: string;
      level: 'owner' | 'operator';
      permissions: string[];
      mfaEnabled: boolean;
    };
    accessToken?: string;
    refreshToken?: string;
    trustedDeviceToken?: string;
  }>>> {
    const trustedDeviceToken = platformAdminTrustedDevice.getToken();

    const response = await this.client.post('/auth/login', {
      email,
      password,
      trustedDeviceToken: trustedDeviceToken || undefined
    });

    if (
      response.data.success &&
      response.data.data &&
      response.data.data.requires2FA === false &&
      response.data.data.accessToken &&
      response.data.data.refreshToken &&
      response.data.data.admin
    ) {
      this.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
      this.setAdminData(response.data.data.admin);
    }

    return response;
  }

  /**
   * Login Step 2: Verify 2FA code and get access tokens
   */
  async verify2FACode(tempToken: string, code: string, trustDevice = false): Promise<AxiosResponse<ApiResponse<PlatformAdminLoginResponse & { trustedDeviceToken?: string }>>> {
    const response = await this.client.post('/auth/2fa/verify', { tempToken, code, trustDevice });
    
    if (response.data.success && response.data.data) {
      this.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
      this.setAdminData(response.data.data.admin);
    }
    
    return response;
  }

  /**
   * Resend 2FA verification code
   */
  async resend2FACode(tempToken: string): Promise<AxiosResponse<ApiResponse<{
    expiresAt: string;
    expiresInSeconds: number;
    canResendAt: string;
  }>>> {
    return this.client.post('/auth/2fa/resend', { tempToken });
  }

  async logout(): Promise<AxiosResponse<ApiResponse>> {
    try {
      const response = await this.client.post('/auth/logout');
      this.clearAuth();
      return response;
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  async getMe(): Promise<AxiosResponse<ApiResponse<PlatformAdminMeResponse>>> {
    return this.client.get('/auth/me');
  }

  async refreshTokens(refreshToken: string): Promise<AxiosResponse<ApiResponse<{ accessToken: string; refreshToken: string }>>> {
    return this.client.post('/auth/refresh', { refreshToken });
  }

  // ==================== ORGANIZATION ENDPOINTS ====================

  async listOrganizations(query?: OrganizationListQuery): Promise<AxiosResponse<ApiResponse<{
    organizations: OrganizationListItem[];
    pagination: Pagination;
  }>>> {
    return this.client.get('/organizations', { params: query });
  }

  async getOrganization(id: string): Promise<AxiosResponse<ApiResponse<{
    organization: OrganizationDetail;
    userCount: number;
  }>>> {
    return this.client.get(`/organizations/${id}`);
  }

  async getOrganizationUsers(id: string): Promise<AxiosResponse<ApiResponse<{ users: UserDetail[] }>>> {
    return this.client.get(`/organizations/${id}/users`);
  }

  async suspendOrganization(id: string, reason: string): Promise<AxiosResponse<ApiResponse<{ organization: OrganizationDetail }>>> {
    return this.client.post(`/organizations/${id}/suspend`, { reason });
  }

  async reactivateOrganization(id: string): Promise<AxiosResponse<ApiResponse<{ organization: OrganizationDetail }>>> {
    return this.client.post(`/organizations/${id}/reactivate`);
  }

  async deleteOrganization(id: string): Promise<AxiosResponse<ApiResponse<{ organization: OrganizationDetail }>>> {
    return this.client.delete(`/organizations/${id}`);
  }

  // ==================== USER ENDPOINTS ====================

  async listUsers(query?: UserListQuery): Promise<AxiosResponse<ApiResponse<{
    users: UserListItem[];
    pagination: Pagination;
  }>>> {
    return this.client.get('/users', { params: query });
  }

  async getUser(id: string): Promise<AxiosResponse<ApiResponse<{ user: UserDetail }>>> {
    return this.client.get(`/users/${id}`);
  }

  async disableUser(id: string): Promise<AxiosResponse<ApiResponse<{ user: UserDetail }>>> {
    return this.client.post(`/users/${id}/disable`);
  }

  async enableUser(id: string): Promise<AxiosResponse<ApiResponse<{ user: UserDetail }>>> {
    return this.client.post(`/users/${id}/enable`);
  }

  // ==================== SUBSCRIPTION ENDPOINTS ====================

  async getSubscriptionStats(): Promise<AxiosResponse<ApiResponse<SubscriptionStats>>> {
    return this.client.get('/subscriptions/stats');
  }

  async updateSubscription(
    orgId: string,
    data: {
      plan: 'free' | 'pro' | 'max';
      planStatus?: 'active' | 'suspended';
      proExpiresAt?: string | null;
      notes: string;
      sendNotification?: boolean;
    }
  ): Promise<AxiosResponse<ApiResponse<{ organization: OrganizationDetail }>>> {
    return this.client.patch(`/subscriptions/${orgId}`, data);
  }

  // ==================== ANALYTICS ENDPOINTS ====================

  async getDashboardAnalytics(period?: '7d' | '30d' | '90d' | '1y' | 'all'): Promise<AxiosResponse<ApiResponse<DashboardAnalytics>>> {
    return this.client.get('/analytics/dashboard', { params: { period } });
  }

  async getEngagementMetrics(): Promise<AxiosResponse<ApiResponse<EngagementMetrics>>> {
    return this.client.get('/analytics/engagement');
  }

  async getTopOrganizations(limit?: number): Promise<AxiosResponse<ApiResponse<{ organizations: any[] }>>> {
    return this.client.get('/analytics/top-organizations', { params: { limit } });
  }

  // ==================== AUDIT ENDPOINTS ====================

  async getAuditLogs(query?: AuditLogQuery): Promise<AxiosResponse<ApiResponse<{
    logs: AuditLog[];
    pagination: Pagination;
  }>>> {
    return this.client.get('/audit/logs', { params: query });
  }

  async getAuditLog(id: string): Promise<AxiosResponse<ApiResponse<{ log: AuditLog }>>> {
    return this.client.get(`/audit/logs/${id}`);
  }

  async getAuditStats(dateFrom?: string, dateTo?: string): Promise<AxiosResponse<ApiResponse<AuditStats>>> {
    return this.client.get('/audit/stats', { params: { dateFrom, dateTo } });
  }

  async exportAuditLogs(query?: Partial<AuditLogQuery>): Promise<AxiosResponse<{
    exportedAt: string;
    count: number;
    logs: AuditLog[];
  }>> {
    return this.client.get('/audit/export', { params: query });
  }

  // ==================== SUBSCRIBED USERS ENDPOINTS ====================

  async getSubscribedUsers(query?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AxiosResponse<ApiResponse<{
    users: SubscribedUser[];
    pagination: Pagination;
    totalSubscribed: number;
  }>>> {
    return this.client.get('/users/subscribed', { params: query });
  }


  // ==================== CONTACT ENDPOINTS ====================

  async getAllContacts(query?: {
    status?: 'pending' | 'read' | 'replied' | 'archived';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }): Promise<AxiosResponse<ApiResponse<{
    data: ContactItem[];
    pagination: Pagination;
  }>>> {
    return this.client.get('/contact', { params: query });
  }

  async getContactStats(): Promise<AxiosResponse<ApiResponse<ContactStats>>> {
    return this.client.get('/contact/stats');
  }

  async getContactById(id: string): Promise<AxiosResponse<ApiResponse<ContactItem>>> {
    return this.client.get(`/contact/${id}`);
  }

  async updateContactStatus(
    id: string,
    data: {
      status: 'pending' | 'read' | 'replied' | 'archived';
      adminNotes?: string;
    }
  ): Promise<AxiosResponse<ApiResponse<ContactItem>>> {
    return this.client.patch(`/contact/${id}`, data);
  }

  async deleteContact(id: string): Promise<AxiosResponse<ApiResponse>> {
    return this.client.delete(`/contact/${id}`);
  }

  // ==================== SYSTEM HEALTH ENDPOINTS ====================

  /**
   * Get full system health report
   */
  async getSystemHealth(): Promise<AxiosResponse<ApiResponse<SystemHealthReport>>> {
    return this.client.get('/system/health');
  }

  /**
   * Get quick health check (minimal data for polling)
   */
  async getQuickHealth(): Promise<AxiosResponse<ApiResponse<QuickHealthReport>>> {
    return this.client.get('/system/health/quick');
  }

  /**
   * Get health for a specific service
   */
  async getServiceHealth(service: string): Promise<AxiosResponse<ApiResponse<ServiceHealth>>> {
    return this.client.get(`/system/health/${service}`);
  }

  /**
   * Force refresh all health checks
   */
  async refreshSystemHealth(): Promise<AxiosResponse<ApiResponse<SystemHealthReport>>> {
    return this.client.post('/system/health/refresh');
  }
}

export const platformAdminApi = new PlatformAdminApiClient();
export default platformAdminApi;
