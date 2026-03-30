import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { Attendance, AttendanceStats } from '@/types';


// Query keys for attendance
export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...attendanceKeys.lists(), { filters }] as const,
  details: () => [...attendanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...attendanceKeys.details(), id] as const,
  today: () => [...attendanceKeys.all, 'today'] as const,
  teamOverview: (filters: Record<string, any>) => [...attendanceKeys.all, 'team', 'overview', { filters }] as const,
  stats: (filters: Record<string, any>) => [...attendanceKeys.all, 'stats', { filters }] as const,
};

// Hook to get attendance records with filters
export function useAttendance(filters?: {
  startDate?: string;
  endDate?: string;
  status?: 'Checked In' | 'Checked Out' | 'Pending' | 'Leave';
  workType?: 'Office' | 'Remote' | 'Hybrid';
  employeeFilter?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: attendanceKeys.list(filters || {}),
    queryFn: async () => {
      const response = await apiClient.getAttendance(filters);
      return response.data.data.attendance as Attendance[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

// Hook to get today's attendance
export function useTodayAttendance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: attendanceKeys.today(),
    queryFn: async () => {
      const response = await apiClient.getTodayAttendance();
      return response.data.data as Attendance | null;
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds (more frequent updates for today's data)
    retry: 2,
  });
}

// Hook to get attendance by ID
export function useAttendanceById(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: attendanceKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getAttendanceById(id);
      return response.data.data.attendance as Attendance;
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Hook to get team attendance overview (Admin only)
export function useTeamAttendanceOverview(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  return useQuery({
    queryKey: attendanceKeys.teamOverview(filters || {}),
    queryFn: async () => {
      const response = await apiClient.getTeamAttendanceOverview(filters);
      return response.data.data;
    },
    enabled: !!user && isAdminOrManager,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Hook to get attendance statistics
export function useAttendanceStats(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  const { data: attendance = [] } = useAttendance(filters);

  return useQuery({
    queryKey: attendanceKeys.stats(filters || {}),
    queryFn: () => {
      // Calculate stats from attendance data
      const totalRecords = attendance.length;
      const checkedInOnly = attendance.filter(a => a.status === 'Checked In').length;
      const checkedOut = attendance.filter(a => a.status === 'Checked Out').length;
      
      const workTypeDistribution = attendance.reduce((acc, a) => {
        const workType = a.workType;
        if (workType === 'Office' || workType === 'Remote' || workType === 'Hybrid') {
          acc[workType] = (acc[workType] || 0) + 1;
        }
        return acc;
      }, { Office: 0, Remote: 0, Hybrid: 0 });

      const stats: AttendanceStats = {
        totalRecords,
        checkedInOnly,
        checkedOut,
        workTypeDistribution,
      };

      return stats;
    },
    enabled: attendance.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation hooks for attendance operations
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { date?: string; workType?: 'Office' | 'Remote' | 'Hybrid' }) => {
      const response = await apiClient.checkIn(data);
      return response.data;
    },
    onSuccess: () => {
      console.log('Checked in successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to check in';
      // toast.error(message);
      console.error('Failed to check in:', message);
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { date?: string; workDescription?: string }) => {
      const response = await apiClient.checkOut(data);
      return response.data;
    },
    onSuccess: () => {
      console.log('Checked out successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to check out';
      // toast.error(message);
      console.error('Failed to check out:', message);
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        date?: string;
        checkInTime?: string;
        checkOutTime?: string;
        workType?: 'Office' | 'Remote' | 'Hybrid';
        workDescription?: string;
      };
    }) => {
      const response = await apiClient.updateAttendance(id, data);
      return response.data;
    },
    onSuccess: () => {
      console.log('Attendance updated successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update attendance';
      // toast.error(message);
      console.error('Failed to update attendance:', message);
    },
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.deleteAttendance(id);
      return response.data;
    },
    onSuccess: () => {
      console.log('Attendance deleted successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete attendance';
      // toast.error(message);
      console.error('Failed to delete attendance:', message);
    },
  });
}

export function useEnhanceWorkDescription() {
  return useMutation({
    mutationFn: async (description: string) => {
      const response = await apiClient.enhanceWorkDescription(description);
      return response.data.data.enhanced;
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to enhance description';
      // toast.error(message);
      console.error('Failed to enhance description:', message);
    },
  });
}
