/**
 * Comprehensive Role-Based Access Control (RBAC) System
 * Defines permissions, roles, and access control utilities
 */

import type {
  Project as CentralProject,
  Task as CentralTask,
  UserRole,
} from '@/types';

export type { UserRole };


export interface User {
  _id: string;
  role?: UserRole;
  [key: string]: any;
}

export interface Project extends CentralProject {
  [key: string]: any;
}

export interface Task extends CentralTask {
  [key: string]: any;
}

// Define all possible permissions in the system
export enum Permission {
  // User Management
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  MANAGE_USER_ROLES = 'manage_user_roles',
  
  // Project Management
  CREATE_PROJECT = 'create_project',
  READ_PROJECT = 'read_project',
  UPDATE_PROJECT = 'update_project',
  DELETE_PROJECT = 'delete_project',
  MANAGE_PROJECT_MEMBERS = 'manage_project_members',
  
  // Sprint Management
  CREATE_SPRINT = 'create_sprint',
  READ_SPRINT = 'read_sprint',
  UPDATE_SPRINT = 'update_sprint',
  DELETE_SPRINT = 'delete_sprint',
  START_SPRINT = 'start_sprint',
  COMPLETE_SPRINT = 'complete_sprint',
  
  // Task Management
  CREATE_TASK = 'create_task',
  READ_TASK = 'read_task',
  UPDATE_TASK = 'update_task',
  DELETE_TASK = 'delete_task',
  ASSIGN_TASK = 'assign_task',
  
  // Analytics & Reporting
  VIEW_ANALYTICS = 'view_analytics',
  VIEW_REPORTS = 'view_reports',
  EXPORT_DATA = 'export_data',
  
  // System Administration
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  
  // Organization Management (Admin only)
  MANAGE_ORGANIZATION = 'manage_organization',
  INVITE_EMPLOYEES = 'invite_employees',
  MANAGE_INVITATIONS = 'manage_invitations',
  VIEW_ORGANIZATION = 'view_organization',
}

// Role hierarchy levels
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'Super Admin': 4, // Platform admin - highest level
  Admin: 3, // Highest level - full organization control
  Manager: 2,
  Employee: 1,
};

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'Super Admin': [
    // Full access to everything including platform administration
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.MANAGE_USER_ROLES,
    Permission.CREATE_PROJECT,
    Permission.READ_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.MANAGE_PROJECT_MEMBERS,
    Permission.CREATE_SPRINT,
    Permission.READ_SPRINT,
    Permission.UPDATE_SPRINT,
    Permission.DELETE_SPRINT,
    Permission.START_SPRINT,
    Permission.COMPLETE_SPRINT,
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.ASSIGN_TASK,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_INTEGRATIONS,
    // Organization-specific permissions
    Permission.MANAGE_ORGANIZATION,
    Permission.INVITE_EMPLOYEES,
    Permission.MANAGE_INVITATIONS,
    Permission.VIEW_ORGANIZATION,
  ],

  Admin: [
    // Full access to everything including organization management
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.MANAGE_USER_ROLES,
    Permission.CREATE_PROJECT,
    Permission.READ_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.MANAGE_PROJECT_MEMBERS,
    Permission.CREATE_SPRINT,
    Permission.READ_SPRINT,
    Permission.UPDATE_SPRINT,
    Permission.DELETE_SPRINT,
    Permission.START_SPRINT,
    Permission.COMPLETE_SPRINT,
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.ASSIGN_TASK,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_INTEGRATIONS,
    // Organization-specific permissions
    Permission.MANAGE_ORGANIZATION,
    Permission.INVITE_EMPLOYEES,
    Permission.MANAGE_INVITATIONS,
    Permission.VIEW_ORGANIZATION,
  ],

  Manager: [
    // Project and team management, analytics access
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.CREATE_PROJECT,
    Permission.READ_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.MANAGE_PROJECT_MEMBERS,
    Permission.CREATE_SPRINT,
    Permission.READ_SPRINT,
    Permission.UPDATE_SPRINT,
    Permission.DELETE_SPRINT,
    Permission.START_SPRINT,
    Permission.COMPLETE_SPRINT,
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.ASSIGN_TASK,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],

  Employee: [
    // Basic task and project access
    Permission.READ_USER,
    Permission.READ_PROJECT,
    Permission.READ_SPRINT,
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user || !user.role) return false;

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  if (!rolePermissions) {
    console.warn(`Unknown user role: "${user.role}". Defaulting to no permissions.`);
    return false;
  }

  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user || !permissions || permissions.length === 0) return false;
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user || !permissions || permissions.length === 0) return false;
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user has required role level or higher
 */
export function hasRoleLevel(user: User | null, requiredRole: UserRole): boolean {
  if (!user || !user.role) return false;
  
  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Check if user can manage a specific project - strict role-based access
 */
export function canManageProject(user: User | null, project: Project | null): boolean {
  if (!user || !project) return false;

  // Only Admins and Managers can manage projects
  if (user.role === 'Admin' || user.role === 'Manager') return true;

  // Employees cannot manage projects, even if they created them
  return false;
}

/**
 * Check if user can access a specific project - strict role-based access
 */
export function canAccessProject(user: User | null, project: Project | null): boolean {
  if (!user || !project) return false;

  // Admins and Managers can access all projects
  if (user.role === 'Admin' || user.role === 'Manager') return true;

  // Employees can ONLY access projects where they are explicitly listed in the employees array
  if (project.employees?.some(emp => emp._id === user._id)) return true;

  return false;
}

/**
 * Check if user can manage a specific task
 */
export function canManageTask(user: User | null, task: Task | null, project?: Project | null): boolean {
  if (!user || !task) return false;
  
  // Admins and Managers can manage all tasks
  if (user.role === 'Admin' || user.role === 'Manager') return true;
  
  // Task assignee can manage their tasks
  if (task.assignee === user._id) return true;
  
  // Task reporter can manage their tasks
  if (task.reporter === user._id) return true;
  
  // Project managers can manage tasks in their projects
  if (project && canManageProject(user, project)) return true;
  
  return false;
}

/**
 * Check if user can view a specific task - strict role-based access
 */
export function canViewTask(user: User | null, task: Task | null, project?: Project | null): boolean {
  if (!user || !task) return false;

  // Admins and Managers can view all tasks
  if (user.role === 'Admin' || user.role === 'Manager') return true;

  // Employees can view tasks they are assigned to
  if (task.assignee === user._id) return true;

  // Employees can view tasks they reported
  if (task.reporter === user._id) return true;

  // Employees can view tasks from projects they have access to
  if (project && canAccessProject(user, project)) return true;

  return false;
}

/**
 * Get filtered list of permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can perform an action on another role
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const managerLevel = ROLE_HIERARCHY[managerRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  
  // Can only manage roles at same level or below
  return managerLevel > targetLevel;
}

/**
 * Get available roles that a user can assign
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => userLevel > level)
    .map(([role, _]) => role as UserRole);
}

/**
 * Permission-based route access control
 */
export interface RoutePermission {
  path: string;
  permissions?: Permission[];
  roles?: UserRole[];
  customCheck?: (user: User) => boolean;
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin-only routes
  {
    path: '/admin',
    roles: ['Admin'],
  },
  {
    path: '/employees',
    permissions: [Permission.READ_USER],
  },
  {
    path: '/employees/create',
    permissions: [Permission.CREATE_USER],
  },
  
  // Admin routes
  {
    path: '/sprints/create',
    permissions: [Permission.CREATE_SPRINT],
  },
  
  // Analytics routes
  {
    path: '/analytics',
    permissions: [Permission.VIEW_ANALYTICS],
  },
  
  // Settings routes
  {
    path: '/settings/system',
    permissions: [Permission.MANAGE_SYSTEM_SETTINGS],
  },
];

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(user: User | null, path: string): boolean {
  if (!user) return false;
  
  const routePermission = ROUTE_PERMISSIONS.find(route => 
    path.startsWith(route.path)
  );
  
  if (!routePermission) return true; // No restrictions
  
  // Check custom function
  if (routePermission.customCheck) {
    return routePermission.customCheck(user);
  }
  
  // Check role requirements
  if (routePermission.roles) {
    if (!user.role) {
      return false;
    }
    return routePermission.roles.includes(user.role);
  }
  
  // Check permission requirements
  if (routePermission.permissions) {
    return hasAnyPermission(user, routePermission.permissions);
  }
  
  return true;
}
