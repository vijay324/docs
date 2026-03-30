/**
 * Deadline Countdown & Urgency Indicator Utilities
 * 
 * Provides centralized logic for calculating remaining time,
 * determining urgency levels, and generating motivational messages
 * for task deadline awareness.
 */

export type UrgencyLevel = 'normal' | 'warning' | 'critical' | 'overdue';

export interface DeadlineInfo {
  /** Remaining time in milliseconds (negative if overdue) */
  remainingMs: number;
  /** Urgency level for styling */
  urgencyLevel: UrgencyLevel;
  /** Human-readable time remaining */
  timeRemaining: string;
  /** Motivational message for display */
  message: string;
  /** Whether the task is overdue */
  isOverdue: boolean;
  /** Whether deadline indicator should be shown */
  shouldShow: boolean;
}

// Urgency thresholds in milliseconds
const THRESHOLDS = {
  WARNING: 48 * 60 * 60 * 1000, // 48 hours (show indicator)
  CRITICAL: 24 * 60 * 60 * 1000, // 24 hours (red urgency)
} as const;

/**
 * Calculate remaining time in human-readable format
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '';
  
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${remainingHours}h`;
    }
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  
  if (hours >= 1) {
    if (minutes > 0 && hours < 6) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  if (minutes >= 1) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  return 'less than a minute';
}

/**
 * Determine the urgency level based on remaining time
 */
export function getUrgencyLevel(remainingMs: number): UrgencyLevel {
  if (remainingMs <= 0) {
    return 'overdue';
  }
  if (remainingMs <= THRESHOLDS.CRITICAL) {
    return 'critical';
  }
  if (remainingMs <= THRESHOLDS.WARNING) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Generate motivational, encouraging messages based on urgency
 */
function getMotivationalMessage(urgencyLevel: UrgencyLevel, timeRemaining: string): string {
  switch (urgencyLevel) {
    case 'overdue':
      return '⚠️ Overdue';
    case 'critical':
      // Critical but encouraging messages
      const criticalMessages = [
        `Almost there! ${timeRemaining} remaining`,
        `Final stretch — ${timeRemaining} left`,
        `You've got this! ${timeRemaining} to go`,
        `Home stretch — ${timeRemaining} remaining`,
      ];
      return criticalMessages[Math.floor(Date.now() / 86400000) % criticalMessages.length];
    case 'warning':
      // Warning with soft encouragement
      const warningMessages = [
        `⏳ Deadline approaching — ${timeRemaining} left`,
        `⏰ ${timeRemaining} remaining`,
        `📅 Due soon — ${timeRemaining} left`,
      ];
      return warningMessages[Math.floor(Date.now() / 86400000) % warningMessages.length];
    default:
      return '';
  }
}

/**
 * Get complete deadline information for a task
 * 
 * @param dueDate - The task's due date (string or Date)
 * @param status - The task's current status
 * @returns DeadlineInfo object with all urgency and display data
 */
export function getDeadlineInfo(
  dueDate: string | Date | undefined | null,
  status?: string
): DeadlineInfo {
  const defaultInfo: DeadlineInfo = {
    remainingMs: 0,
    urgencyLevel: 'normal',
    timeRemaining: '',
    message: '',
    isOverdue: false,
    shouldShow: false,
  };

  // Don't show for completed tasks
  if (status === 'Done') {
    return defaultInfo;
  }

  // Don't show if no due date
  if (!dueDate) {
    return defaultInfo;
  }

  const now = new Date();
  const deadline = new Date(dueDate);
  const remainingMs = deadline.getTime() - now.getTime();
  
  const urgencyLevel = getUrgencyLevel(remainingMs);
  const isOverdue = remainingMs <= 0;
  
  // Only show indicator for warning, critical, or overdue
  const shouldShow = urgencyLevel !== 'normal';
  
  const timeRemaining = isOverdue ? '' : formatTimeRemaining(remainingMs);
  const message = getMotivationalMessage(urgencyLevel, timeRemaining);

  return {
    remainingMs,
    urgencyLevel,
    timeRemaining,
    message,
    isOverdue,
    shouldShow,
  };
}

/**
 * Get CSS classes for urgency level styling
 * Returns classes for both light and dark mode
 */
export function getUrgencyStyles(urgencyLevel: UrgencyLevel): {
  text: string;
  bg: string;
  border: string;
  icon: string;
} {
  switch (urgencyLevel) {
    case 'overdue':
      return {
        text: 'text-red-700 dark:text-red-300',
        bg: 'bg-red-50 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-500 dark:text-red-400',
      };
    case 'critical':
      return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50/80 dark:bg-red-900/20',
        border: 'border-red-200/80 dark:border-red-800/80',
        icon: 'text-red-500 dark:text-red-400',
      };
    case 'warning':
      return {
        text: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-500 dark:text-amber-400',
      };
    default:
      return {
        text: 'text-muted-foreground',
        bg: '',
        border: '',
        icon: 'text-muted-foreground',
      };
  }
}

/**
 * Check if a deadline indicator should be displayed
 * Quick helper for conditional rendering
 */
export function shouldShowDeadlineIndicator(
  dueDate: string | Date | undefined | null,
  status?: string
): boolean {
  return getDeadlineInfo(dueDate, status).shouldShow;
}

/**
 * Get sprint deadline info (uses end date instead of due date)
 */
export function getSprintDeadlineInfo(
  endDate: string | Date | undefined | null,
  status?: string
): DeadlineInfo {
  // Completed or cancelled sprints don't show countdown
  if (status === 'Completed' || status === 'Cancelled') {
    return getDeadlineInfo(null, 'Done');
  }
  return getDeadlineInfo(endDate, status);
}
