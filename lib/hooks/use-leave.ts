import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';


// ==================== Types ====================

export type LeaveType = 'PL' | 'SL' | 'CL' | 'EL' | 'ML' | 'PTL' | 'CO' | 'LOP';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRequest {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId?: string;
    department?: string;
  };
  organizationId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays?: number;
  totalDays?: number;
  reason: string;
  status: LeaveStatus;
  isHalfDay?: boolean;
  halfDayType?: 'first_half' | 'second_half';
  reviewedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalanceEntry {
  leaveType: LeaveType;
  label: string;
  opening: number;
  accrued: number;
  used: number;
  adjusted: number;
  current: number;
  available: number;
  total?: number;
}

export interface LeaveBalanceSummary {
  financialYear: string;
  totalAvailable: number;
  totalUsed: number;
  balances: LeaveBalanceEntry[];
}

// ==================== Query Keys ====================

export const leaveKeys = {
  all: ['leave'] as const,
  myRequests: () => [...leaveKeys.all, 'my-requests'] as const,
  myRequestsFiltered: (filters: Record<string, any>) => [...leaveKeys.myRequests(), { filters }] as const,
  teamRequests: () => [...leaveKeys.all, 'team'] as const,
  teamRequestsFiltered: (filters: Record<string, any>) => [...leaveKeys.teamRequests(), { filters }] as const,
  pending: () => [...leaveKeys.all, 'pending'] as const,
  pendingFiltered: (filters: Record<string, any>) => [...leaveKeys.pending(), { filters }] as const,
  detail: (id: string) => [...leaveKeys.all, 'detail', id] as const,
  balance: () => [...leaveKeys.all, 'balance'] as const,
  employeeBalance: (employeeId: string) => [...leaveKeys.balance(), employeeId] as const,
  upcoming: (days?: number) => [...leaveKeys.all, 'upcoming', { days }] as const,
};

// ==================== Query Hooks ====================

/**
 * Get current user's leave requests
 */
export function useMyLeaveRequests(filters?: {
  status?: LeaveStatus;
  skip?: number;
  limit?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: leaveKeys.myRequestsFiltered(filters || {}),
    queryFn: async () => {
      const response = await apiClient.getMyLeaveRequests(filters);
      return response.data.data.leaveRequests as LeaveRequest[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Get team leave requests (Admin/Manager only)
 */
export function useTeamLeaveRequests(filters?: {
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  skip?: number;
  limit?: number;
}) {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  return useQuery({
    queryKey: leaveKeys.teamRequestsFiltered(filters || {}),
    queryFn: async () => {
      const response = await apiClient.getTeamLeaveRequests(filters);
      return response.data.data.leaveRequests as LeaveRequest[];
    },
    enabled: !!user && isAdminOrManager,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Get pending leave requests for approval (Admin/Manager only)
 */
export function usePendingLeaveRequests(filters?: {
  skip?: number;
  limit?: number;
}) {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  return useQuery({
    queryKey: leaveKeys.pendingFiltered(filters || {}),
    queryFn: async () => {
      const response = await apiClient.getPendingLeaveRequests(filters);
      return response.data.data.leaveRequests as LeaveRequest[];
    },
    enabled: !!user && isAdminOrManager,
    staleTime: 30 * 1000, // 30 seconds (more frequent for pending actions)
    retry: 2,
  });
}

/**
 * Get leave request by ID
 */
export function useLeaveRequest(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: leaveKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getLeaveRequestById(id);
      return response.data.data.leaveRequest as LeaveRequest;
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Get current user's leave balance
 */
export function useLeaveBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: leaveKeys.balance(),
    queryFn: async () => {
      const response = await apiClient.getLeaveBalance();
      return response.data.data.balance as LeaveBalanceSummary;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Get leave balance for a specific employee (Admin/Manager only)
 */
export function useEmployeeLeaveBalance(employeeId: string) {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  return useQuery({
    queryKey: leaveKeys.employeeBalance(employeeId),
    queryFn: async () => {
      const response = await apiClient.getEmployeeLeaveBalance(employeeId);
      return response.data.data.balance as LeaveBalanceSummary;
    },
    enabled: !!user && isAdminOrManager && !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Get upcoming approved leaves
 */
export function useUpcomingLeaves(days?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: leaveKeys.upcoming(days),
    queryFn: async () => {
      const response = await apiClient.getUpcomingLeaves(days);
      return response.data.data.upcomingLeaves as LeaveRequest[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

// ==================== Mutation Hooks ====================

/**
 * Create a new leave request
 */
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      reason: string;
      isHalfDay?: boolean;
      halfDayType?: 'first_half' | 'second_half';
    }) => {
      const response = await apiClient.createLeaveRequest(data);
      return response.data;
    },
    onSuccess: () => {
      console.log('Leave request submitted successfully');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || error.message || 'Failed to submit leave request';
      // toast.error(message);
      console.error('Failed to submit leave request:', message);
    },
  });
}

/**
 * Approve a leave request (Admin/Manager only)
 */
export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reviewComment }: { id: string; reviewComment?: string }) => {
      const response = await apiClient.approveLeaveRequest(id, reviewComment);
      return response.data;
    },
    onSuccess: () => {
      console.log('Leave request approved');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || error.message || 'Failed to approve leave request';
      // toast.error(message);
      console.error('Failed to approve leave request:', message);
    },
  });
}

/**
 * Reject a leave request (Admin/Manager only)
 */
export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reviewComment }: { id: string; reviewComment: string }) => {
      const response = await apiClient.rejectLeaveRequest(id, reviewComment);
      return response.data;
    },
    onSuccess: () => {
      console.log('Leave request rejected');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || error.message || 'Failed to reject leave request';
      // toast.error(message);
      console.error('Failed to reject leave request:', message);
    },
  });
}

/**
 * Cancel own leave request
 */
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await apiClient.cancelLeaveRequest(id, reason);
      return response.data;
    },
    onSuccess: () => {
      console.log('Leave request cancelled');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || error.message || 'Failed to cancel leave request';
      // toast.error(message);
      console.error('Failed to cancel leave request:', message);
    },
  });
}

// ==================== Helper Constants ====================

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  'PL': 'Paid Leave',
  'SL': 'Sick Leave',
  'CL': 'Casual Leave',
  'EL': 'Earned Leave',
  'ML': 'Maternity Leave',
  'PTL': 'Paternity Leave',
  'CO': 'Comp Off',
  'LOP': 'Loss of Pay'
};

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, { bg: string; text: string }> = {
  'Pending': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  'Approved': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  'Rejected': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' },
  'Cancelled': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
};
