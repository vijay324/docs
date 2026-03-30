import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
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
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.BASE);
      return response.data.data.employees as Employee[];
    },
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
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.PROFILE);
      return response.data.data.employee as Employee;
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const response = await apiClient.put(`/employees/${id}`, data);
      return response.data.data.employee as Employee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(data._id) });
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

// Backward compatibility aliases
export const useUpdateUserRole = useUpdateEmployeeRole;
export const useToggleUserStatus = useToggleEmployeeStatus;
