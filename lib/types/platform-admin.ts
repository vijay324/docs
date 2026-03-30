// Platform Admin Types

export type PlatformPermission =
  | 'platform:read'
  | 'platform:write'
  | 'orgs:read'
  | 'orgs:write'
  | 'orgs:delete'
  | 'users:read'
  | 'users:write'
  | 'users:impersonate'
  | 'subscriptions:read'
  | 'subscriptions:write'
  | 'analytics:read'
  | 'audit:read'
  | 'audit:export';

export type PlatformAdminLevel = 'owner' | 'operator';

export interface PlatformAdmin {
  _id: string;
  email: string;
  level: PlatformAdminLevel;
  permissions: PlatformPermission[];
  mfaEnabled: boolean;
  lastLoginAt?: string;
}

export interface PlatformAdminEmployee {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username: string;
}

export interface PlatformAdminLoginResponse {
  admin: PlatformAdmin;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PlatformAdminMeResponse {
  admin: PlatformAdmin;
  employee: PlatformAdminEmployee;
}

// Organization Types
export interface OrganizationListItem {
  _id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'max';
  planStatus: 'active' | 'suspended';
  status: 'active' | 'suspended' | 'deleted';
  userCount: number;
  admin: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  createdAt: string;
  lastActivityAt?: string;
}

export interface OrganizationDetail {
  _id: string;
  name: string;
  slug: string;
  adminId: string;
  organizationType?: string;
  industry?: string;
  organizationSize?: string;
  country?: string;
  timezone?: string;
  description?: string;
  websiteUrl?: string;
  plan: 'free' | 'pro' | 'max';
  planStatus: 'active' | 'suspended';
  proExpiresAt?: string;
  planUpdatedAt?: string;
  planNotes?: string;
  status: 'active' | 'suspended' | 'deleted';
  suspendedAt?: string;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// User Types
export interface UserListItem {
  _id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  organization?: {
    _id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
}

export interface UserDetail {
  _id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  department: string;
  subDepartment: string;
  employeeId: string;
  jobTitle: string;
  mobileNumber: string;
  isActive: boolean;
  organizationId?: {
    _id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface DashboardAnalytics {
  summary: {
    totalOrganizations: number;
    totalUsers: number;
    proOrganizations: number;
    conversionRate: number;
    activeOrganizations: number;
  };
  growth: {
    newOrgsThisPeriod: number;
    newUsersThisPeriod: number;
    orgGrowthRate: number;
    userGrowthRate: number;
  };
  usage: {
    totalTasks: number;
    totalProjects: number;
    totalSprints: number;
    completedTasks: number;
  };
  trends: Array<{
    date: string;
    orgs: number;
    users: number;
    proOrgs: number;
  }>;
  topOrganizations: Array<{
    _id: string;
    name: string;
    slug: string;
    userCount: number;
    taskCount: number;
    plan: string;
    createdAt: string;
  }>;
}

export interface SubscriptionStats {
  free: number;
  pro: number;
  suspended: number;
  conversionRate: number;
  recentUpgrades: number;
  recentDowngrades: number;
}

export interface EngagementMetrics {
  dau: number;
  wau: number;
  mau: number;
  averageTasksPerUser: number;
  averageProjectsPerOrg: number;
}

// Audit Types
export type AuditAction =
  | 'org:viewed' | 'org:list_viewed' | 'org:suspended' | 'org:reactivated' | 'org:deleted' | 'org:settings_updated'
  | 'user:viewed' | 'user:list_viewed' | 'user:disabled' | 'user:enabled' | 'user:password_reset' | 'user:impersonated'
  | 'subscription:viewed' | 'subscription:upgraded' | 'subscription:downgraded' | 'subscription:extended' | 'subscription:suspended' | 'subscription:notes_updated'
  | 'admin:logged_in' | 'admin:logged_out' | 'admin:login_failed' | 'admin:mfa_enabled' | 'admin:mfa_disabled' | 'admin:permissions_changed'
  | 'analytics:viewed' | 'analytics:exported'
  | 'audit:viewed' | 'audit:exported';

export type AuditCategory = 'organization' | 'user' | 'subscription' | 'system' | 'security' | 'analytics' | 'audit';

export interface AuditLog {
  _id: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  category: AuditCategory;
  targetType: 'Organization' | 'Employee' | 'PlatformAdmin' | 'System';
  targetId?: string;
  targetName?: string;
  previousValue?: any;
  newValue?: any;
  metadata: {
    ipAddress: string;
    userAgent: string;
    sessionId?: string;
    requestId?: string;
  };
  createdAt: string;
}

export interface AuditStats {
  totalLogs: number;
  byCategory: Record<string, number>;
  byAction: Record<string, number>;
  recentActivity: AuditLog[];
}

// Pagination Type
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Query Types
export interface OrganizationListQuery {
  page?: number;
  limit?: number;
  search?: string;
  plan?: 'free' | 'pro' | 'max';
  status?: 'active' | 'suspended' | 'deleted';
  sortBy?: 'createdAt' | 'name' | 'userCount' | 'plan';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'Admin' | 'Manager' | 'Employee';
  status?: 'active' | 'inactive';
  organizationId?: string;
  sortBy?: 'createdAt' | 'email' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  action?: AuditAction;
  category?: AuditCategory;
  targetType?: 'Organization' | 'Employee' | 'PlatformAdmin' | 'System';
  targetId?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// Feedback Types
export interface FeedbackItem {
  _id: string;
  topic: 'bug' | 'feature' | 'improvement' | 'other';
  feedback: string;
  rating: number;
  submittedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    username: string;
    role: string;
  };
  organizationId?: string;
  email?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'archived';
  reviewedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  reviewedAt?: string;
  adminNotes?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    browser?: string;
    os?: string;
  };
  createdAt: string;
  updatedAt: string;
  ratingEmoji?: string;
  ratingLabel?: string;
}

export interface FeedbackStats {
  total: number;
  byStatus: {
    pending: number;
    reviewed: number;
    resolved: number;
    archived: number;
  };
  byTopic: Record<string, number>;
  byRating: Record<string, number>;
}

// Subscribed Users Types
export interface SubscribedUser {
  _id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  organization?: {
    _id: string;
    name: string;
    slug: string;
  };
  subscribedToChangelog: boolean;
  subscribedAt?: string;
  createdAt: string;
}

// Contact Types
export interface ContactItem {
  _id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: 'pending' | 'read' | 'replied' | 'archived';
  repliedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    username: string;
  };
  repliedAt?: string;
  adminNotes?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    browser?: string;
    os?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats {
  total: number;
  byStatus: {
    pending: number;
    read: number;
    replied: number;
    archived: number;
  };
}

// System Health Types
export type ServiceStatus = 'connected' | 'degraded' | 'failed' | 'unavailable';

export interface ServiceHealth {
  name: string;
  displayName: string;
  status: ServiceStatus;
  latency?: number;
  lastHeartbeat: string;
  lastError?: string;
  errorCount: number;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  nodeVersion: string;
  platform: string;
  cpuUsage?: {
    user: number;
    system: number;
  };
}

export interface SystemHealthReport {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  metrics: SystemMetrics;
}

export interface QuickHealthReport {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
  services: Array<{
    name: string;
    status: ServiceStatus;
    latency?: number;
  }>;
  uptime: number;
}

