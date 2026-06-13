import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Task } from '@/types';

export interface WorkflowPermissions {
  canStart: boolean;
  canSubmitForReview: boolean;
  canApprove: boolean;
  canTest: boolean;
  canComplete: boolean;
  canChangeStatus: boolean;
  currentUserRole: 'assignee' | 'reviewer' | 'tester' | 'reporter' | 'none';
  expectedAction: string | null;
  disabledReason: string | null;
}

/**
 * Determine the current user's role for a task
 */
function determineUserRole(task: Task, userId: string | undefined): 'assignee' | 'reviewer' | 'tester' | 'reporter' | 'none' {
  if (!userId) return 'none';
  const isAssignee = !!(task.assignee && (typeof task.assignee === 'object' ? task.assignee._id : task.assignee) === userId);
  const isReporter = !!(task.reporter && (typeof task.reporter === 'object' ? task.reporter._id : task.reporter) === userId);
  const isReviewer = !!(task.reviewer && (typeof task.reviewer === 'object' ? task.reviewer._id : task.reviewer) === userId);
  const isTester = !!(task.tester && (typeof task.tester === 'object' ? task.tester._id : task.tester) === userId);

  if (isReporter) return 'reporter';
  if (isAssignee) return 'assignee';
  if (isReviewer) return 'reviewer';
  if (isTester) return 'tester';
  return 'none';
}

/**
 * Get permissions for individual tasks (more flexible rules)
 */
function getIndividualTaskPermissions(currentUserRole: string): WorkflowPermissions {
  const hasAnyRole = currentUserRole !== 'none';
  return {
    canStart: hasAnyRole,
    canSubmitForReview: hasAnyRole,
    canApprove: hasAnyRole,
    canTest: hasAnyRole,
    canComplete: hasAnyRole,
    canChangeStatus: hasAnyRole,
    currentUserRole: currentUserRole as 'assignee' | 'reviewer' | 'tester' | 'reporter' | 'none',
    expectedAction: null,
    disabledReason: hasAnyRole ? null : 'You are not assigned to this task'
  };
}

/**
 * Get permissions for tasks in 'To Do' status
 */
function getTodoPermissions(permissions: WorkflowPermissions, isAssignee: boolean): void {
  permissions.canStart = isAssignee;
  permissions.canChangeStatus = isAssignee;
  permissions.expectedAction = isAssignee ? 'Start work on this task' : null;
  if (!permissions.canStart) {
    permissions.disabledReason = 'Only the assignee can start work on this task';
  }
}

/**
 * Get permissions for tasks in 'In Progress' status
 */
function getInProgressPermissions(permissions: WorkflowPermissions, isAssignee: boolean): void {
  permissions.canSubmitForReview = isAssignee;
  permissions.canChangeStatus = isAssignee;
  permissions.expectedAction = isAssignee ? 'Submit for review when ready' : null;
  if (!permissions.canSubmitForReview) {
    permissions.disabledReason = 'Only the assignee can submit work for review';
  }
}

/**
 * Get permissions for tasks in 'Review' status
 */
function getReviewPermissions(permissions: WorkflowPermissions, isReviewer: boolean): void {
  permissions.canApprove = isReviewer;
  permissions.canChangeStatus = isReviewer;
  permissions.expectedAction = isReviewer ? 'Review and approve/reject' : null;
  if (!permissions.canApprove) {
    permissions.disabledReason = 'Only the reviewer can approve this task';
  }
}

/**
 * Get permissions for tasks in 'Testing' status
 */
function getTestingPermissions(permissions: WorkflowPermissions, isTester: boolean): void {
  permissions.canTest = isTester;
  permissions.canComplete = isTester;
  permissions.canChangeStatus = isTester;
  permissions.expectedAction = isTester ? 'Test and validate completion' : null;
  if (!permissions.canComplete) {
    permissions.disabledReason = 'Only the tester can mark this task as complete';
  }
}

/**
 * Get permissions for tasks in 'Done' status
 */
function getDonePermissions(permissions: WorkflowPermissions, isAssignee: boolean, currentUserRole: string, isReporter: boolean, isReviewer: boolean, isTester: boolean): void {
  permissions.canChangeStatus = isAssignee || currentUserRole === 'reporter' || isReviewer || isTester;
  permissions.expectedAction = null;
}

/**
 * Get permissions for sprint tasks based on status (strict role-based rules)
 */
function getSprintTaskPermissions(task: Task, userId: string | undefined, currentUserRole: string): WorkflowPermissions {
  const isAssignee = !!(task.assignee && (typeof task.assignee === 'object' ? task.assignee._id : task.assignee) === userId);
  const isReviewer = !!(task.reviewer && (typeof task.reviewer === 'object' ? task.reviewer._id : task.reviewer) === userId);
  const isTester = !!(task.tester && (typeof task.tester === 'object' ? task.tester._id : task.tester) === userId);

  const permissions: WorkflowPermissions = {
    canStart: false,
    canSubmitForReview: false,
    canApprove: false,
    canTest: false,
    canComplete: false,
    canChangeStatus: false,
    currentUserRole: currentUserRole as 'assignee' | 'reviewer' | 'tester' | 'reporter' | 'none',
    expectedAction: null,
    disabledReason: null
  };

  // Set permissions based on task status
  switch (task.status) {
    case 'To Do':
      getTodoPermissions(permissions, isAssignee);
      break;

    case 'In Progress':
      getInProgressPermissions(permissions, isAssignee);
      break;

    case 'Review':
      getReviewPermissions(permissions, isReviewer);
      break;

    case 'Testing':
      getTestingPermissions(permissions, isTester);
      break;

    case 'Done':
      getDonePermissions(permissions, isAssignee, currentUserRole, !!(task.reporter && (typeof task.reporter === 'object' ? task.reporter._id : task.reporter) === userId), isReviewer, isTester);
      break;

    default:
      permissions.disabledReason = 'Unknown task status';
  }

  return permissions;
}

/**
 * Hook to check workflow permissions for a task based on current user
 */
export function useWorkflowPermissions(task: Task): WorkflowPermissions {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || !task) {
      return {
        canStart: false,
        canSubmitForReview: false,
        canApprove: false,
        canTest: false,
        canComplete: false,
        canChangeStatus: false,
        currentUserRole: 'none',
        expectedAction: null,
        disabledReason: 'User not authenticated'
      };
    }

    // Admin and Manager can perform any action
    if (user.role === 'Admin' || user.role === 'Manager') {
      return {
        canStart: true,
        canSubmitForReview: true,
        canApprove: true,
        canTest: true,
        canComplete: true,
        canChangeStatus: true,
        currentUserRole: 'reporter',
        expectedAction: null,
        disabledReason: null
      };
    }

    const currentUserRole = determineUserRole(task, user._id);
    const isSprintTask = !!task.sprintId;

    // Individual tasks have more flexible rules
    if (!isSprintTask) {
      return getIndividualTaskPermissions(currentUserRole);
    }

    // Sprint tasks have strict role-based rules
    return getSprintTaskPermissions(task, user._id, currentUserRole);
  }, [user, task]);
}

/**
 * Hook to check if user can perform a specific status transition
 */
export function useCanTransitionTo(task: Task, targetStatus: Task['status']): { canTransition: boolean; reason?: string } {
  const { user } = useAuth();
  const permissions = useWorkflowPermissions(task);

  return useMemo(() => {
    if (!user || !task) {
      return { canTransition: false, reason: 'User not authenticated' };
    }

    // Admin and Manager can make any transition
    if (user.role === 'Admin' || user.role === 'Manager') {
      return { canTransition: true };
    }

    const isSprintTask = !!task.sprintId;

    // Individual tasks have more flexible rules
    if (!isSprintTask) {
      return { canTransition: permissions.canChangeStatus, reason: permissions.disabledReason || undefined };
    }

    // Sprint tasks have specific transition rules
    const currentStatus = task.status;
    
    // Check specific transition permissions
    switch (`${currentStatus}->${targetStatus}`) {
      case 'To Do->In Progress':
        return { 
          canTransition: permissions.canStart, 
          reason: permissions.canStart ? undefined : 'Only the assignee can start work on this task'
        };
      
      case 'In Progress->Review':
        return { 
          canTransition: permissions.canSubmitForReview, 
          reason: permissions.canSubmitForReview ? undefined : permissions.disabledReason || 'Cannot submit for review'
        };
      
      case 'Review->Testing':
        return { 
          canTransition: permissions.canApprove, 
          reason: permissions.canApprove ? undefined : permissions.disabledReason || 'Cannot approve for testing'
        };
      
      case 'Testing->Done':
        return { 
          canTransition: permissions.canComplete, 
          reason: permissions.canComplete ? undefined : 'Only the tester can mark this task as complete'
        };
      
      // Backward transitions - STRICT: Only current stage owner can move backward
      case 'In Progress->To Do':
        return {
          canTransition: permissions.currentUserRole === 'assignee',
          reason: permissions.currentUserRole === 'assignee' ? undefined : 'Only the assignee can move task back to To Do'
        };

      case 'Review->In Progress':
        return {
          canTransition: permissions.currentUserRole === 'reviewer',
          reason: permissions.currentUserRole === 'reviewer' ? undefined : 'Only the assigned reviewer can move task back to In Progress'
        };

      case 'Testing->Review':
        return {
          canTransition: permissions.currentUserRole === 'tester',
          reason: permissions.currentUserRole === 'tester' ? undefined : 'Only the assigned tester can move task back to Review'
        };
      
      default:
        return { canTransition: false, reason: 'Invalid status transition' };
    }
  }, [user, task, targetStatus, permissions]);
}

/**
 * Get user-friendly role description
 */
export function getRoleDescription(role: 'assignee' | 'reviewer' | 'tester' | 'reporter' | 'none'): string {
  switch (role) {
    case 'assignee':
      return 'You are assigned to work on this task';
    case 'reviewer':
      return 'You are assigned to review this task';
    case 'tester':
      return 'You are assigned to test this task';
    case 'reporter':
      return 'You created this task';
    case 'none':
      return 'You are not assigned to this task';
    default:
      return 'Unknown role';
  }
}
