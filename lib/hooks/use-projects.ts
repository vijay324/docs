import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Project } from '@/utils/types';
import { API_ENDPOINTS } from '@/utils/constants';


// Query Keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  stats: (id: string) => [...projectKeys.detail(id), 'stats'] as const,
  deletionPreview: (id: string) => [...projectKeys.all, 'deletion-preview', id] as const,
};

// Hooks
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.PROJECTS.BASE);
      return response.data.data.projects as Project[];
    },
  });
}

export function useProject(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      try {

        // Add cache-busting parameter to force fresh data
        const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const url = `${API_ENDPOINTS.PROJECTS.BY_ID(id)}?${cacheBuster}`;
        const response = await apiClient.get(url);

        // Debug logging for development
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Project API Response:', {
            status: response.status,
            data: response.data,
            hasData: !!response.data,
            hasSuccess: !!response.data?.success,
            hasDataData: !!(response.data?.data),
            hasProject: !!(response.data?.data?.project),
            fullResponse: response.data
          });
        }

        // Handle HTTP 304 (Not Modified) responses or cached responses
        if (response.status === 304 || response.data?._isCachedResponse) {
          console.warn('⚠️ Received HTTP 304 response - browser cache in use');

          // For 304 responses, try to get cached data from React Query
          const cachedData = queryClient.getQueryData(['project', id]);
          if (cachedData) {
            console.log('✅ Using React Query cached project data');
            return cachedData;
          } else {
            // If no cached data available, invalidate and refetch
            console.log('🔄 No cached data found, invalidating cache and refetching');
            await queryClient.invalidateQueries({ queryKey: ['project', id] });
            throw new Error('Cache invalidated - will refetch');
          }
        }

        // Validate response structure
        if (!response.data) {
          throw new Error('Invalid API response: missing data');
        }

        if (!response.data.success) {
          // Enhanced debug logging for failed success check
          if (process.env.NODE_ENV === 'development') {
            console.error('🚨 API response success check failed:', {
              status: response.status,
              hasSuccess: 'success' in response.data,
              successValue: response.data.success,
              responseKeys: Object.keys(response.data || {}),
              fullResponse: response.data
            });
          }

          // Extract the error message from the response
          const errorMessage = response.data.error || response.data.message || 'API request failed';

          // If it's an authentication error, provide specific handling
          if (response.status === 401) {
            throw new Error(`Authentication failed: ${errorMessage}`);
          } else if (response.status === 403) {
            throw new Error(`Access denied: ${errorMessage}`);
          } else if (response.status === 404) {
            throw new Error(`Not found: ${errorMessage}`);
          } else if (response.status >= 500) {
            throw new Error(`Server error: ${errorMessage}`);
          }

          throw new Error(errorMessage);
        }
        
        if (!response.data.data) {
          throw new Error('Invalid API response: missing data.data');
        }
        
        if (!response.data.data.project) {
          throw new Error('Invalid API response: missing project data');
        }
        
        return response.data.data.project as Project;
      } catch (error: any) {
        // Enhanced error logging for debugging
        if (process.env.NODE_ENV === 'development') {
          console.error('🚨 Project fetch error:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: API_ENDPOINTS.PROJECTS.BY_ID(id),
            hasValidTokens: apiClient.hasValidTokens(),
            isAuthenticated: apiClient.isAuthenticated()
          });
        }
        
        // Handle specific error cases
        if (error.response?.status === 401) {
          // Authentication error - the axios interceptor should have already handled this
          // but if we get here, provide a clear message
          const errorMessage = error.response?.data?.error || 'Authentication failed';
          throw new Error(`Authentication required: ${errorMessage}`);
        } else if (error.response?.status === 403) {
          throw new Error('Access denied to this project.');
        } else if (error.response?.status === 404) {
          throw new Error('Project not found.');
        } else if (error.response?.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
          throw new Error('Network error. Please check your connection.');
        }
        
        // Re-throw the error with the original message if no specific handling
        throw error;
      }
    },
    enabled: !!id,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication or permission errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: projectKeys.stats(id),
    queryFn: async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.PROJECTS.STATS(id));
        return response.data.data.stats;
      } catch (error: any) {
        console.warn('Project stats endpoint not available, using fallback data:', error.message);
        // Return fallback stats when backend is not available
        return {
          tasks: {
            total: 0,
            completed: 0,
            inProgress: 0,
            completionRate: 0
          },
          sprints: {
            total: 0,
            active: 0,
            completed: 0
          },
          team: {
            totalMembers: 0
          }
        };
      }
    },
    enabled: !!id,
    retry: false, // Don't retry failed requests
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const response = await apiClient.post(API_ENDPOINTS.PROJECTS.BASE, data);
      return response.data.data.project as Project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      console.log('Project created successfully!', project.name);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create project';
      // toast.error("Project creation failed", {
      //   description: errorMessage
      // });
      console.error('Project creation failed:', errorMessage);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const response = await apiClient.put(API_ENDPOINTS.PROJECTS.BY_ID(id), data);
      return response.data.data.project as Project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(project._id) });
      console.log('Project updated successfully!', project.name);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update project';
      // toast.error("Project update failed", {
      //   description: errorMessage
      // });
      console.error('Project update failed:', errorMessage);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; forceDelete?: boolean }) => {
      const { id, forceDelete } = params;
      const url = forceDelete
        ? `${API_ENDPOINTS.PROJECTS.BY_ID(id)}?force=true`
        : API_ENDPOINTS.PROJECTS.BY_ID(id);
      const response = await apiClient.delete(url);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      const summary = data?.data?.deletionSummary;
      const message = summary
        ? `Project deleted successfully! Removed ${summary.sprintsDeleted} sprints and ${summary.tasksDeleted} tasks.`
        : "Project deleted successfully!";

      console.log('Project deleted successfully!', message);
    },
    onError: (error: any) => {
      console.error('Project deletion error:', error);

      // Extract error message with better fallbacks
      let errorMessage = 'Failed to delete project';

      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 500) {
        errorMessage = 'Internal server error. Please try again or contact support.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this project.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Project not found or already deleted.';
      }

      // toast.error("Project deletion failed", {
      //   description: errorMessage
      // });
      console.error('Project deletion failed:', errorMessage);
    },
  });
}

export function useProjectDeletionPreview(projectId: string) {
  return useQuery({
    queryKey: projectKeys.deletionPreview(projectId),
    queryFn: async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.PROJECTS.DELETION_PREVIEW(projectId));
        return response.data.data;
      } catch (error: any) {
        console.error('Failed to fetch project deletion preview:', error);
        // Don't show toast error for deletion preview failures
        throw error;
      }
    },
    enabled: !!projectId,
    staleTime: 0, // Always fetch fresh data for deletion preview
    retry: false, // Don't retry on error for deletion preview
  });
}

export function useAddEmployeeToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, employeeId }: { projectId: string; employeeId: string }) => {
      const response = await apiClient.post(API_ENDPOINTS.PROJECTS.ADD_EMPLOYEE(projectId), { employeeId });
      return response.data.data.project as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data._id) });
    },
  });
}

export function useRemoveEmployeeFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, employeeId }: { projectId: string; employeeId: string }) => {
      const response = await apiClient.delete(API_ENDPOINTS.PROJECTS.REMOVE_EMPLOYEE(projectId, employeeId));
      return response.data.data.project as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data._id) });
    },
  });
}

export function useAddMultipleEmployeesToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, employeeIds }: { projectId: string; employeeIds: string[] }) => {
      // Add employees one by one using the existing endpoint
      const promises = employeeIds.map(employeeId =>
        apiClient.post(API_ENDPOINTS.PROJECTS.ADD_EMPLOYEE(projectId), { employeeId })
      );

      const results = await Promise.all(promises);
      // Return the final updated project
      return results[results.length - 1].data.data.project as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data._id) });
      console.log("Team members added successfully! Employees have been added to the project.");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to add team members';
      console.error("Add team members failed:", errorMessage);
    },
  });
}
