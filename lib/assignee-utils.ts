import { Task, User } from '@/utils/types';

type AssignmentViewer = Pick<User, '_id'> & {
  role?: User['role'];
};

/**
 * Helper function to get display name from assignee object
 */
function getAssigneeDisplayName(assignee: any): string {
  if (assignee.firstName && assignee.lastName) {
    return `${assignee.firstName} ${assignee.lastName}`.trim();
  }
  if (assignee.firstName) {
    return assignee.firstName;
  }
  if (assignee.lastName) {
    return assignee.lastName;
  }
  if (assignee.email && typeof assignee.email === 'string') {
    return assignee.email.split('@')[0];
  }
  if (assignee.employeeId) {
    return `Employee ${assignee.employeeId}`;
  }
  return 'Assigned User';
}

/**
 * Get role-based assignee display text
 * - Shows "You" for the current user
 * - Shows full name + email for Admin/Manager viewing other users
 * - Shows name only for other users
 */
export function getAssigneeDisplay(task: Task, currentUser?: AssignmentViewer | null): string | null {
  if (!task.assignee) {
    return null;
  }

  if (typeof task.assignee === 'string') {
    return 'Assigned User';
  }

  if (typeof task.assignee !== 'object' || !task.assignee._id) {
    return null;
  }

  if (currentUser?._id === task.assignee._id) {
    return "You";
  }

  return getAssigneeDisplayName(task.assignee);
}

/**
 * Check if the current user should see the assignee's email
 * Only Admin/Manager roles can see emails of other users
 */
export function shouldShowAssigneeEmail(task: Task, currentUser?: AssignmentViewer | null): boolean {
  if (!task.assignee || typeof task.assignee !== 'object' || !task.assignee._id || !currentUser) {
    return false;
  }

  // Don't show email for the current user (they already know their own email)
  const isCurrentUser = currentUser._id === task.assignee._id;
  if (isCurrentUser) {
    return false;
  }

  // Only Admin/Manager can see other users' emails and only if email exists
  return (currentUser.role === 'Admin' || currentUser.role === 'Manager') && !!task.assignee.email;
}

/**
 * Get the assignee's initials for avatar display
 */
export function getAssigneeInitials(task: Task, currentUser?: AssignmentViewer | null): string {
  if (!task.assignee) {
    return '?';
  }

  // Handle string assignee format
  if (typeof task.assignee === 'string') {
    return 'A'; // "Assigned"
  }

  if (typeof task.assignee !== 'object' || !task.assignee._id) {
    return '?';
  }

  // Check if the current user is the assignee
  const isCurrentUser = currentUser?._id === task.assignee._id;

  if (isCurrentUser) {
    return "Y"; // "You"
  }

  // Try to get initials from first and last name
  if (task.assignee.firstName && task.assignee.lastName) {
    return `${task.assignee.firstName.charAt(0)}${task.assignee.lastName.charAt(0)}`.toUpperCase();
  }

  // Try first name only
  if (task.assignee.firstName) {
    return task.assignee.firstName.charAt(0).toUpperCase();
  }

  // Try last name only
  if (task.assignee.lastName) {
    return task.assignee.lastName.charAt(0).toUpperCase();
  }

  // Fallback to first letter of email
  if (task.assignee.email) {
    return task.assignee.email.charAt(0).toUpperCase();
  }

  // Fallback to employee ID
  if (task.assignee.employeeId) {
    return 'E'; // "Employee"
  }

  return 'A'; // "Assigned"
}

/**
 * Get role-specific assignment message for a task
 * Returns a message like "This task is assigned as a reviewer to John Doe"
 */
export function getRoleAssignmentMessage(
  task: Task,
  role: 'assignee' | 'reviewer' | 'tester',
  currentUser?: AssignmentViewer | null
): string | null {
  let user: any = null;
  let roleLabel = '';

  switch (role) {
    case 'assignee':
      user = task.assignee;
      roleLabel = 'assignee';
      break;
    case 'reviewer':
      user = task.reviewer;
      roleLabel = 'reviewer';
      break;
    case 'tester':
      user = task.tester;
      roleLabel = 'tester';
      break;
  }

  if (!user) {
    return null;
  }

  // Handle string user format
  if (typeof user === 'string') {
    return `This task is assigned as a ${roleLabel} to an employee`;
  }

  if (typeof user !== 'object' || !user._id) {
    return null;
  }

  // Check if the current user is the assigned person
  const isCurrentUser = currentUser?._id === user._id;

  if (isCurrentUser) {
    return `This task is assigned to you as a ${roleLabel}`;
  }

  // Get the user's name
  const userName = getAssigneeDisplayName(user);
  return `This task is assigned as a ${roleLabel} to ${userName}`;
}

/**
 * Get completion message for tester role
 * Returns a message indicating when a tester marked the task as done
 */
export function getTesterCompletionMessage(task: Task, currentUser?: AssignmentViewer | null): string | null {
  // Check if task is in "Done" status and has a tester
  if (task.status !== 'Done' || !task.tester) {
    return null;
  }

  const tester = task.tester;

  // Handle string tester format
  if (typeof tester === 'string') {
    return 'This task was marked as done by the tester';
  }

  if (typeof tester !== 'object' || !tester._id) {
    return null;
  }

  // Check if the current user is the tester
  const isCurrentUser = currentUser?._id === tester._id;

  if (isCurrentUser) {
    return 'You marked this task as done';
  }

  // Get the tester's name
  const testerName = getAssigneeDisplayName(tester);
  return `${testerName} marked this task as done`;
}

/**
 * Get all role assignments for a task as an array
 * Returns an array of role assignment messages
 */
export function getAllRoleAssignments(task: Task, currentUser?: AssignmentViewer | null): Array<{
  role: string;
  message: string;
  user: any;
  isCurrentUser: boolean;
}> {
  const assignments: Array<{
    role: string;
    message: string;
    user: any;
    isCurrentUser: boolean;
  }> = [];

  // Check assignee
  if (task.assignee) {
    const message = getRoleAssignmentMessage(task, 'assignee', currentUser);
    if (message) {
      const isCurrentUser = currentUser?._id === (typeof task.assignee === 'object' ? task.assignee._id : task.assignee);
      assignments.push({
        role: 'assignee',
        message,
        user: task.assignee,
        isCurrentUser
      });
    }
  }

  // Check reviewer
  if (task.reviewer) {
    const message = getRoleAssignmentMessage(task, 'reviewer', currentUser);
    if (message) {
      const isCurrentUser = currentUser?._id === (typeof task.reviewer === 'object' ? task.reviewer._id : task.reviewer);
      assignments.push({
        role: 'reviewer',
        message,
        user: task.reviewer,
        isCurrentUser
      });
    }
  }

  // Check tester
  if (task.tester) {
    const message = getRoleAssignmentMessage(task, 'tester', currentUser);
    if (message) {
      const isCurrentUser = currentUser?._id === (typeof task.tester === 'object' ? task.tester._id : task.tester);
      assignments.push({
        role: 'tester',
        message,
        user: task.tester,
        isCurrentUser
      });
    }
  }

  return assignments;
}
