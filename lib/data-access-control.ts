/**
 * Data Access Control utilities for role-based data filtering
 */

import { UserRole, User, Project, Task } from './permissions';

// Sprint type definition (if not available in permissions)
interface Sprint {
  _id: string;
  projectId: string;
  title: string;
  status: string;
  members: string[];
  visibility: 'Public' | 'Private';
}

export interface DataFilter {
  role: UserRole;
  userId: string;
}

/**
 * Filter projects based on user role and access permissions - strict role-based access
 */
export function filterProjectsByAccess<T extends Project>(projects: T[], user: User | null): T[] {
  if (!user) return [];

  // Admins and Managers can see all projects
  if (user.role === 'Admin' || user.role === 'Manager') {
    return projects;
  }

  // Employees can ONLY see projects where they are explicitly listed in the employees array
  return projects.filter(project => {
    // Check if user is in the project's employees array
    if (project.employees?.some(emp => emp._id === user._id)) return true;

    return false;
  });
}

/**
 * Filter sprints based on user role and access permissions - strict role-based access
 */
export function filterSprintsByAccess<T extends Sprint, P extends Project>(sprints: T[], user: User | null, accessibleProjects: P[]): T[] {
  if (!user) return [];

  // Admins and Managers can see all sprints
  if (user.role === 'Admin' || user.role === 'Manager') {
    return sprints;
  }

  // Get accessible project IDs
  const accessibleProjectIds = accessibleProjects.map(p => p._id);

  // Employees can ONLY see sprints that belong to projects they have access to
  return sprints.filter(sprint => {
    return accessibleProjectIds.includes(sprint.projectId);
  });
}

/**
 * Filter tasks based on user role and access permissions - strict role-based access
 */
export function filterTasksByAccess<T extends Task, P extends Project>(tasks: T[], user: User | null, accessibleProjects: P[]): T[] {
  if (!user) return [];

  // Admins and Managers can see all tasks
  if (user.role === 'Admin' || user.role === 'Manager') {
    return tasks;
  }

  // Get accessible project IDs
  const accessibleProjectIds = accessibleProjects.map(p => p._id);

  // Employees can ONLY see tasks that meet ANY of these criteria:
  return tasks.filter(task => {
    // They are assigned as the assignee
    if (task.assignee === user._id) return true;

    // They are listed as the reporter
    if (task.reporter === user._id) return true;

    // The task belongs to a project they have access to
    if (task.projectId && accessibleProjectIds.includes(task.projectId)) return true;

    return false;
  });
}



/**
 * Filter employees based on user role and access permissions
 */
export function filterEmployeesByAccess(employees: any[], user: User | null): any[] {
  if (!user) return [];

  // Always exclude platform admins from employee lists
  const filteredEmployees = employees.filter(emp => !emp.isPlatformAdmin);

  // Admins and Managers can see all employees (except platform admins)
  if (user.role === 'Admin' || user.role === 'Manager') {
    return filteredEmployees;
  }



  // Employees can see basic info of other employees (excluding platform admins)
  return filteredEmployees.map(emp => ({
    _id: emp._id,
    email: emp.email,
    role: emp.role,
    isActive: emp.isActive,
    // Hide sensitive information for regular employees
  }));
}

/**
 * Check if user can view sensitive employee data
 */
export function canViewEmployeeDetails(user: User | null, targetEmployee: any): boolean {
  if (!user) return false;

  // Users can always view their own details
  if (user._id === targetEmployee._id) return true;

  // Admins and Managers can view all employee details
  if (user.role === 'Admin' || user.role === 'Manager') return true;



  // Regular employees can only view basic public info
  return false;
}

/**
 * Filter analytics data based on user role
 */
export function filterAnalyticsData(data: any, user: User | null): any {
  if (!user) return null;

  // Admins and Managers get full analytics
  if (user.role === 'Admin' || user.role === 'Manager') {
    return data;
  }



  // Employees get limited analytics
  return {
    // Only show their own task metrics
    taskMetrics: data.taskMetrics?.filter((t: any) => t.assignee === user._id),
    // Hide all other analytics
  };
}

/**
 * Get allowed actions for a user on a specific resource
 */
export function getAllowedActions(
  user: User | null, 
  resourceType: 'project' | 'task' | 'employee' | 'sprint',
  resource?: any
): string[] {
  if (!user) return [];

  const actions: string[] = [];

  switch (resourceType) {
    case 'project':
      actions.push('view');
      
      if (user.role === 'Admin' || user.role === 'Manager') {
        actions.push('create', 'edit', 'delete', 'manage_members');
      }
      break;

    case 'task':
      actions.push('view');
      
      if (user.role === 'Admin' || user.role === 'Manager') {
        actions.push('create', 'edit', 'delete', 'assign');
      } else {
        actions.push('create');
        if (resource && (resource.reporter === user._id || resource.assignee === user._id)) {
          actions.push('edit');
        }
      }
      break;

    case 'employee':
      if (user.role === 'Admin' || user.role === 'Manager') {
        actions.push('view', 'create', 'edit', 'delete', 'manage_roles');
      } else {
        actions.push('view');
      }
      
      // Users can always edit their own profile
      if (resource && resource._id === user._id) {
        actions.push('edit_profile');
      }
      break;

    case 'sprint':
      actions.push('view');

      if (user.role === 'Admin' || user.role === 'Manager') {
        actions.push('create', 'edit', 'delete', 'start', 'complete');
      }
      break;
  }

  return actions;
}

/**
 * Check if user can perform a specific action on a resource
 */
export function canPerformAction(
  user: User | null,
  action: string,
  resourceType: 'project' | 'task' | 'employee' | 'sprint',
  resource?: any
): boolean {
  const allowedActions = getAllowedActions(user, resourceType, resource);
  return allowedActions.includes(action);
}

/**
 * Get data visibility level for a user
 */
export function getDataVisibilityLevel(user: User | null): 'full' | 'limited' | 'restricted' | 'none' {
  if (!user) return 'none';

  switch (user.role) {
    case 'Admin':
      return 'full';
    case 'Manager':
      return 'full';
    case 'Employee':
      return 'restricted';
    default:
      return 'none';
  }
}

/**
 * Apply role-based field filtering to data objects
 */
export function filterDataFields(data: any, user: User | null, dataType: string): any {
  if (!user || !data) return data;

  const visibilityLevel = getDataVisibilityLevel(user);

  // Define field visibility rules
  const fieldRules: Record<string, Record<string, string[]>> = {
    employee: {
      full: ['*'], // All fields
      limited: ['_id', 'email', 'role', 'isActive', 'createdAt', 'jobTitle', 'department'],
      restricted: ['_id', 'email', 'role', 'isActive'],
      none: []
    },
    project: {
      full: ['*'],
      limited: ['*'], // Limited access users can see all project fields for projects they have access to
      restricted: ['_id', 'name', 'description', 'status', 'createdAt', 'updatedAt'],
      none: []
    },
    task: {
      full: ['*'],
      limited: ['*'],
      restricted: ['_id', 'title', 'description', 'status', 'priority', 'assignee', 'dueDate'],
      none: []
    }
  };

  const allowedFields = fieldRules[dataType]?.[visibilityLevel] || [];

  if (allowedFields.includes('*')) {
    return data;
  }

  // Filter object to only include allowed fields
  if (Array.isArray(data)) {
    return data.map(item => filterObjectFields(item, allowedFields));
  } else {
    return filterObjectFields(data, allowedFields);
  }
}

/**
 * Helper function to filter object fields
 */
function filterObjectFields(obj: any, allowedFields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;

  const filtered: any = {};
  allowedFields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      filtered[field] = obj[field];
    }
  });

  return filtered;
}
