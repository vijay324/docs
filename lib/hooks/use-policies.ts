import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';


export interface AttendancePolicyConfig {
  workWeek: {
    workingDays: number[];
    weekendDays: number[];
    attendanceRequiredOnWeekend: boolean;
  };
  workingHours: {
    standardHoursPerDay: number;
    overtimeThresholdHours: number;
    minHoursForPresent: number;
  };
  checkIn: {
    allowBackdatedEntries: boolean;
    maxBackdatedDays: number;
    allowFutureEntries: boolean;
  };
  defaults: {
    workType: 'Office' | 'Remote' | 'Hybrid';
    enableAiDescriptionEnhancement: boolean;
  };
}

export interface LeavePolicyConfig {
  leaveTypes: Array<{
    code: 'PL' | 'SL' | 'CL' | 'EL' | 'ML' | 'PTL' | 'CO' | 'LOP';
    label: string;
    enabled: boolean;
    requiresBalance: boolean;
    allowHalfDay: boolean;
    defaultAnnualAllocation: number;
    maxPerRequestDays?: number;
  }>;
  approval: {
    allowAdminApproval: boolean;
    allowManagerApproval: boolean;
    requireCommentOnReject: boolean;
  };
  requestRules: {
    allowPastDateRequest: boolean;
    minAdvanceNoticeDays: number;
    maxConsecutiveDays: number;
    allowHalfDay: boolean;
    allowOverlappingRequests: boolean;
  };
  calculation: {
    excludeWeekends: boolean;
    weekendDays: number[];
  };
  balance: {
    financialYearStartMonth: number;
    allowNegativeBalance: boolean;
  };
  attendanceIntegration: {
    markLeaveInAttendance: boolean;
    leaveAttendanceWorkType: 'Office' | 'Remote' | 'Hybrid';
  };
}

const DEFAULT_ATTENDANCE_POLICY_CONFIG: AttendancePolicyConfig = {
  workWeek: {
    workingDays: [1, 2, 3, 4, 5],
    weekendDays: [0, 6],
    attendanceRequiredOnWeekend: false,
  },
  workingHours: {
    standardHoursPerDay: 8,
    overtimeThresholdHours: 8,
    minHoursForPresent: 4,
  },
  checkIn: {
    allowBackdatedEntries: true,
    maxBackdatedDays: 7,
    allowFutureEntries: false,
  },
  defaults: {
    workType: 'Office',
    enableAiDescriptionEnhancement: true,
  },
};

const DEFAULT_LEAVE_POLICY_CONFIG: LeavePolicyConfig = {
  leaveTypes: [
    { code: 'PL', label: 'Paid Leave', enabled: true, requiresBalance: true, allowHalfDay: true, defaultAnnualAllocation: 10 },
    { code: 'SL', label: 'Sick Leave', enabled: true, requiresBalance: true, allowHalfDay: true, defaultAnnualAllocation: 6 },
    { code: 'CL', label: 'Casual Leave', enabled: true, requiresBalance: true, allowHalfDay: true, defaultAnnualAllocation: 12 },
    { code: 'EL', label: 'Earned Leave', enabled: true, requiresBalance: true, allowHalfDay: true, defaultAnnualAllocation: 15 },
    { code: 'ML', label: 'Maternity Leave', enabled: true, requiresBalance: false, allowHalfDay: false, defaultAnnualAllocation: 0 },
    { code: 'PTL', label: 'Paternity Leave', enabled: true, requiresBalance: false, allowHalfDay: false, defaultAnnualAllocation: 0 },
    { code: 'CO', label: 'Compensatory Off', enabled: true, requiresBalance: true, allowHalfDay: true, defaultAnnualAllocation: 0 },
    { code: 'LOP', label: 'Loss of Pay', enabled: true, requiresBalance: false, allowHalfDay: true, defaultAnnualAllocation: 0 },
  ],
  approval: {
    allowAdminApproval: true,
    allowManagerApproval: true,
    requireCommentOnReject: true,
  },
  requestRules: {
    allowPastDateRequest: false,
    minAdvanceNoticeDays: 0,
    maxConsecutiveDays: 30,
    allowHalfDay: true,
    allowOverlappingRequests: false,
  },
  calculation: {
    excludeWeekends: true,
    weekendDays: [0, 6],
  },
  balance: {
    financialYearStartMonth: 4,
    allowNegativeBalance: false,
  },
  attendanceIntegration: {
    markLeaveInAttendance: true,
    leaveAttendanceWorkType: 'Remote',
  },
};

export const policyKeys = {
  all: ['policies'] as const,
  attendance: (organizationId?: string, organizationSlug?: string) =>
    [...policyKeys.all, 'attendance', organizationId, organizationSlug] as const,
  leave: (organizationId?: string, organizationSlug?: string) =>
    [...policyKeys.all, 'leave', organizationId, organizationSlug] as const,
};

export function useAttendancePolicyConfig(organizationId?: string, organizationSlug?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: policyKeys.attendance(organizationId, organizationSlug),
    queryFn: async () => {
      try {
        const response = await apiClient.getAttendancePolicyConfig(organizationId as string, organizationSlug);
        return response.data.data as { config: AttendancePolicyConfig; isUsingDefaults: boolean };
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return {
            config: JSON.parse(JSON.stringify(DEFAULT_ATTENDANCE_POLICY_CONFIG)),
            isUsingDefaults: true,
          };
        }
        throw error;
      }
    },
    enabled: !!user && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeavePolicyConfig(organizationId?: string, organizationSlug?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: policyKeys.leave(organizationId, organizationSlug),
    queryFn: async () => {
      try {
        const response = await apiClient.getLeavePolicyConfig(organizationId as string, organizationSlug);
        return response.data.data as { config: LeavePolicyConfig; isUsingDefaults: boolean };
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return {
            config: JSON.parse(JSON.stringify(DEFAULT_LEAVE_POLICY_CONFIG)),
            isUsingDefaults: true,
          };
        }
        throw error;
      }
    },
    enabled: !!user && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateAttendancePolicyConfig(organizationId?: string, organizationSlug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: AttendancePolicyConfig) => {
      if (!organizationId) throw new Error('Organization is required');
      return apiClient.updateAttendancePolicyConfig(organizationId, config, organizationSlug);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.attendance(organizationId, organizationSlug) });
      console.log('Attendance policy updated');
    },
    onError: (error: any) => {
      if (error?.response?.status === 404) {
        console.error('Policy configuration is not available on this backend yet.');
        return;
      }
      console.error(error.response?.data?.message || 'Failed to update attendance policy');
    },
  });
}

export function useResetAttendancePolicyConfig(organizationId?: string, organizationSlug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization is required');
      return apiClient.resetAttendancePolicyConfig(organizationId, organizationSlug);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.attendance(organizationId, organizationSlug) });
      console.log('Attendance policy reset to defaults');
    },
    onError: (error: any) => {
      if (error?.response?.status === 404) {
        console.error('Policy configuration is not available on this backend yet.');
        return;
      }
      console.error(error.response?.data?.message || 'Failed to reset attendance policy');
    },
  });
}

export function useUpdateLeavePolicyConfig(organizationId?: string, organizationSlug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: LeavePolicyConfig) => {
      if (!organizationId) throw new Error('Organization is required');
      return apiClient.updateLeavePolicyConfig(organizationId, config, organizationSlug);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.leave(organizationId, organizationSlug) });
      console.log('Leave policy updated');
    },
    onError: (error: any) => {
      if (error?.response?.status === 404) {
        console.error('Policy configuration is not available on this backend yet.');
        return;
      }
      console.error(error.response?.data?.message || 'Failed to update leave policy');
    },
  });
}

export function useResetLeavePolicyConfig(organizationId?: string, organizationSlug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization is required');
      return apiClient.resetLeavePolicyConfig(organizationId, organizationSlug);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.leave(organizationId, organizationSlug) });
      console.log('Leave policy reset to defaults');
    },
    onError: (error: any) => {
      if (error?.response?.status === 404) {
        console.error('Policy configuration is not available on this backend yet.');
        return;
      }
      console.error(error.response?.data?.message || 'Failed to reset leave policy');
    },
  });
}
