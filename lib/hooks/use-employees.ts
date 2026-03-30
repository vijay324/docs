import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import { Employee } from '@/utils/types';
import { API_ENDPOINTS } from '@/utils/constants';


// Query Keys
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...employeeKeys.lists(), { filters }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  profile: () => [...employeeKeys.all, 'profile'] as const,
};

// Hooks
export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.lists(),
    queryFn: async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.BASE);
        // Handle both paginated and non-paginated responses for backward compatibility
        if (response.data.data.employees) {
          return response.data.data.employees as Employee[];
        }
        return response.data.data as Employee[];
      } catch (error: any) {
        console.error('Error fetching employees:', error);
        // If the specific endpoint fails, try the auth users endpoint as fallback
        if (error.response?.status === 404) {
          try {
            const fallbackResponse = await apiClient.get(API_ENDPOINTS.AUTH.USERS);
            return fallbackResponse.data.data.users as Employee[];
          } catch (fallbackError) {
            console.error('Fallback endpoint also failed:', fallbackError);
            throw error; // Throw original error
          }
        }
        throw error;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePaginatedEmployees(params: {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['employees', 'list', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
      });
      
      if (params.search) queryParams.append('search', params.search);
      // Role and status filtering happens on client side for now as per controller logic,
      // but if we added them to controller we would append them here.
      
      const response = await apiClient.get(`${API_ENDPOINTS.EMPLOYEES.BASE}?${queryParams.toString()}`);
      return response.data.data;
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
      return response.data.data.employee as Employee;
    },
    enabled: !!id,
  });
}

export function useCurrentEmployee() {
  return useQuery({
    queryKey: employeeKeys.profile(),
    queryFn: async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 useCurrentEmployee: Making API call to /employees/profile');
      }
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.PROFILE);
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 useCurrentEmployee: API response status:', response.status);
      }
      return response.data.data.employee as Employee;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Backward compatibility aliases
export const useUsers = useEmployees;
export const useUser = useEmployee;
export const useCurrentUser = useCurrentEmployee;

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const response = await apiClient.post(API_ENDPOINTS.EMPLOYEES.BASE, data);
      return response.data.data.employee as Employee;
    },
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      if (process.env.NODE_ENV === 'development') {
        console.log(`Employee created successfully! ${employee.email} has been added to the team.`);
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create employee';
      console.error("Employee creation failed:", errorMessage);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const response = await apiClient.put(API_ENDPOINTS.EMPLOYEES.BY_ID(id), data);
      return response.data.data.employee as Employee;
    },
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employee._id) });
      console.log('Employee updated successfully!', employee.email);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update employee';
      // toast.error("Employee update failed", { description: errorMessage });
      console.error('Employee update failed:', errorMessage);
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/employees/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// Backward compatibility aliases
export const useCreateUser = useCreateEmployee;
export const useUpdateUser = useUpdateEmployee;
export const useDeleteUser = useDeleteEmployee;

export function useUpdateEmployeeRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const response = await apiClient.patch(`/employees/${id}/role`, { role });
      return response.data.data.employee as Employee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(data._id) });
    },
  });
}

export function useToggleEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/employees/${id}/toggle-status`);
      return response.data.data.employee as Employee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(data._id) });
    },
  });
}

export function useUnlockEmployeeAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UNLOCK_ACCOUNT(id));
      return response.data.data.employee as Employee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(data._id) });
      console.log('Account unlocked successfully!', data.email);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to unlock account';
      // toast.error("Account unlock failed", { description: errorMessage });
      console.error('Account unlock failed:', errorMessage);
    },
  });
}

// Profile management hooks
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const response = await apiClient.put(API_ENDPOINTS.EMPLOYEES.PROFILE, data);
      return response.data.data.employee as Employee;
    },
    onSuccess: (data) => {
      // Update auth context's stored user data
      apiClient.setUserData(data);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: employeeKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(data._id) });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const response = await apiClient.put(`${API_ENDPOINTS.EMPLOYEES.PROFILE}/password`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function useAdminChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { employeeId: string; newPassword: string }) => {
      const response = await apiClient.put(API_ENDPOINTS.EMPLOYEES.ADMIN_CHANGE_PASSWORD(data.employeeId), {
        newPassword: data.newPassword
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch employees list
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await apiClient.delete(API_ENDPOINTS.EMPLOYEES.PROFILE, { data });
      return response.data;
    },
  });
}

// Backward compatibility aliases
export const useUpdateUserRole = useUpdateEmployeeRole;
export const useToggleUserStatus = useToggleEmployeeStatus;
