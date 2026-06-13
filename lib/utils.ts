import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date utilities
export function formatDate(date: string | Date, format: string = 'MMM dd, yyyy'): string {
  const d = new Date(date);
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  switch (format) {
    case 'MMM dd, yyyy':
      return `${month} ${day}, ${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    case 'MMM dd, yyyy HH:mm':
      return `${month} ${day}, ${year} ${hours}:${minutes}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    default:
      return `${month} ${day}, ${year}`;
  }
}

export function isDateInPast(date: string | Date): boolean {
  const toStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const candidate = new Date(date);
  if (isNaN(candidate.getTime())) return true;
  return toStart(candidate) < toStart(new Date());
}

export function isOverdue(dueDate: string | Date | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function getDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// String utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function generateInitials(name: string): string {
  if (!name || typeof name !== 'string') {
    console.warn('generateInitials: Invalid name provided:', name);
    return '';
  }

  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}



// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidEmployeeId(employeeId: string): boolean {
  const employeeIdRegex = /^[A-Z]{2,3}\d{3,4}$/;
  return employeeIdRegex.test(employeeId);
}

export function isValidMobile(mobile: string): boolean {
  const mobileRegex = /^\+?[\d\s\-()]{10,}$/;
  return mobileRegex.test(mobile);
}

// Local storage utilities
export function getFromStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
}

export function setToStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Silently fail in production, log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error writing to localStorage:', error);
    }
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Silently fail in production, log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error removing from localStorage:', error);
    }
  }
}

// Number utilities
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

// Indian-style number formatting with concise display
export function formatNumberConcise(num: number, decimals: number = 2): string {
  if (num === 0) return '0';

  // Handle very small numbers (less than 0.01)
  if (Math.abs(num) < 0.01 && num !== 0) {
    return '<0.01';
  }

  // Handle numbers less than 1
  if (Math.abs(num) < 1) {
    return num.toFixed(decimals);
  }

  // Handle numbers 1-99 with minimal decimals
  if (Math.abs(num) < 100) {
    return num.toFixed(Math.min(decimals, 1));
  }

  // Handle larger numbers with Indian formatting
  if (Math.abs(num) >= 10000000) { // 1 crore
    return `${(num / 10000000).toFixed(1)}Cr`;
  } else if (Math.abs(num) >= 100000) { // 1 lakh
    return `${(num / 100000).toFixed(1)}L`;
  } else if (Math.abs(num) >= 1000) { // 1 thousand
    return `${(num / 1000).toFixed(1)}K`;
  }

  // For numbers 100-999, show without decimals
  return Math.round(num).toString();
}

// Format time duration in a concise way
export function formatDurationConcise(days: number): string {
  if (days === 0) return '0 days';

  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours}h`;
  }

  if (days < 7) {
    return `${days.toFixed(1)}d`;
  }

  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks}w`;
  }

  const months = Math.round(days / 30);
  return `${months}mo`;
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Color utilities for priority/status
export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'critical':
      return 'text-destructive-foreground bg-destructive border-destructive';
    case 'high':
      return 'text-destructive bg-destructive/10 border-destructive/20';
    case 'medium':
      return 'text-warning bg-warning/10 border-warning/20';
    case 'low':
      return 'text-success bg-success/10 border-success/20';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

// Standardized status colors - Backlog: zinc, To-do: Blue, In Progress: Yellow, Review: Orange, Testing: Purple, Completed: Green
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'backlog':
      return 'text-zinc-600 bg-zinc-50 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-900/50 dark:border-zinc-800';
    case 'to do':
    case 'sprint backlog':
      return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800';
    case 'in progress':
    case 'active':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800';
    case 'review':
      return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800';
    case 'testing':
      return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800';
    case 'done':
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800';
    default:
      return 'text-zinc-600 bg-zinc-50 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-900/50 dark:border-zinc-800';
  }
}

// Board view status colors - Standardized: zinc, Blue, Yellow, Orange, Purple, Green
export function getBoardStatusColor(status: string): string {
  switch (status) {
    case 'Backlog':
      // zinc - Neutral
      return 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
    case 'To Do':
      // Blue
      return 'bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-900/50';
    case 'Sprint Backlog':
      // Blue
      return 'bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-900/50';
    case 'In Progress':
      // Yellow
      return 'bg-white dark:bg-zinc-900 border-yellow-200 dark:border-yellow-900/50';
    case 'Review':
      // Orange
      return 'bg-white dark:bg-zinc-900 border-orange-200 dark:border-orange-900/50';
    case 'Testing':
      // Purple
      return 'bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-900/50';
    case 'Done':
    case 'Completed':
      // Green
      return 'bg-zinc-50/50 dark:bg-zinc-900/50 border-green-200 dark:border-green-900/50';
    default:
      // zinc
      return 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
  }
}

// Status color mapping constants for consistency
export const STATUS_COLORS = {
  BACKLOG: { hex: '#6b7280', rgb: '107, 116, 128' },      // zinc
  TODO: { hex: '#3b82f6', rgb: '59, 130, 246' },         // Blue
  IN_PROGRESS: { hex: '#eab308', rgb: '234, 179, 8' },   // Yellow
  REVIEW: { hex: '#f97316', rgb: '249, 115, 22' },       // Orange
  TESTING: { hex: '#a855f7', rgb: '168, 85, 247' },      // Purple
  COMPLETED: { hex: '#22c55e', rgb: '34, 197, 94' }      // Green
} as const;

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_.-]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
  phone: /^\+?[\d\s\-()]{10,}$/,
  employeeId: /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]+$/,
  objectId: /^[0-9a-fA-F]{24}$/
} as const;

// Common error messages
export const ErrorMessages = {
  required: (field: string) => `${field} is required`,
  invalid: (field: string) => `${field} is invalid`,
  tooShort: (field: string, min: number) => `${field} must be at least ${min} characters`,
  tooLong: (field: string, max: number) => `${field} cannot exceed ${max} characters`,
  notFound: (resource: string) => `${resource} not found`,
  unauthorized: 'You are not authorized to perform this action',
  forbidden: 'Access denied',
  serverError: 'An internal server error occurred',
  networkError: 'Network error occurred. Please check your connection.',
  validationFailed: 'Validation failed. Please check your input.'
} as const;

// Array utilities
export const ArrayUtils = {
  unique: <T>(array: T[]): T[] => [...new Set(array)],
  groupBy: <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },
  sortBy: <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
} as const;

// Currency formatting
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
}

