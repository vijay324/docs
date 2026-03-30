import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Sprint } from '@/utils/types';
import { API_ENDPOINTS } from '@/utils/constants';


// Helper function to safely extract project ID
function getSafeProjectId(projectId: any): string {
  if (typeof projectId === 'string') {
    return projectId;
  }
  if (typeof projectId === 'object' && projectId) {
    return projectId._id || projectId.id || '';
  }
  return '';
}

// Query Keys
export const sprintKeys = {
  all: ['sprints'] as const,
  lists: () => [...sprintKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...sprintKeys.lists(), { filters }] as const,
  details: () => [...sprintKeys.all, 'detail'] as const,
  detail: (id: string) => [...sprintKeys.details(), id] as const,
  project: (projectId: string) => {
    const safeId = getSafeProjectId(projectId);
    return [...sprintKeys.all, 'project', safeId] as const;
  },
  burndown: (id: string) => [...sprintKeys.detail(id), 'burndown'] as const,
  velocity: (id: string) => [...sprintKeys.detail(id), 'velocity'] as const,
  members: (id: string) => [...sprintKeys.detail(id), 'members'] as const,
  deletionPreview: (id: string) => [...sprintKeys.all, 'deletion-preview', id] as const,
};

// Hooks
export function useSprints() {
  return useQuery({
    queryKey: sprintKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SPRINTS.BASE);
      return response.data.data.sprints as Sprint[];
    },
  });
}

export function useProjectSprints(projectId: string) {
  // Ensure projectId is a valid string and not an object
  const safeProjectId = typeof projectId === 'string' ? projectId : '';

  return useQuery({
    queryKey: sprintKeys.project(safeProjectId),
    queryFn: async () => {
      if (!safeProjectId || typeof safeProjectId !== 'string') {
        throw new Error('Invalid project ID provided to useProjectSprints');
      }
      const response = await apiClient.get(API_ENDPOINTS.SPRINTS.BY_PROJECT(safeProjectId));
      return response.data.data.sprints as Sprint[];
    },
    enabled: !!safeProjectId && typeof safeProjectId === 'string',
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSprint(id: string) {
  return useQuery({
    queryKey: sprintKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SPRINTS.BY_ID(id));
      return response.data.data.sprint as Sprint;
    },
    enabled: !!id,
  });
}

export function useSprintBurndown(id: string) {
  return useQuery({
    queryKey: sprintKeys.burndown(id),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SPRINTS.BURNDOWN(id));
      return response.data.data.burndownData;
    },
    enabled: !!id,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for active sprints
  });
}

export function useSprintVelocity(id: string) {
  return useQuery({
    queryKey: sprintKeys.velocity(id),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SPRINTS.VELOCITY(id));
      return response.data.data.metrics;
    },
    enabled: !!id,
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Sprint>) => {
      const response = await apiClient.post(API_ENDPOINTS.SPRINTS.BASE, data);
      return response.data.data.sprint as Sprint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      if (data.projectId) {
        const projectId = getSafeProjectId(data.projectId);
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: sprintKeys.project(projectId)
          });
        }
      }
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Sprint> }) => {
      const response = await apiClient.put(API_ENDPOINTS.SPRINTS.BY_ID(id), data);
      return response.data.data.sprint as Sprint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data._id) });
      queryClient.invalidateQueries({ queryKey: ['sprint-status', data._id] });
      if (data.projectId) {
        const projectId = getSafeProjectId(data.projectId);
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: sprintKeys.project(projectId)
          });
        }
      }
    },
  });
}

export function useSprintStatus(sprintId: string) {
  return useQuery({
    queryKey: ['sprint-status', sprintId],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SPRINTS.STATUS(sprintId));
      return response.data.data as {
        canManuallyStart: boolean;
        autoStartTime: string | null;
        autoEndTime: string | null;
        timeUntilStart: number | null;
        timeUntilEnd: number | null;
      };
    },
    enabled: !!sprintId,
    refetchInterval: 60000, // Refetch every minute to keep status updated
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(API_ENDPOINTS.SPRINTS.BY_ID(id));
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      const summary = data?.data?.deletionSummary;
      const message = summary
        ? `Sprint deleted successfully! Removed ${summary.tasksDeleted} tasks.`
        : "Sprint deleted successfully!";

      console.log('Sprint deleted successfully!', message);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete sprint';
      // toast.error("Sprint deletion failed", {
      //   description: errorMessage
      // });
      console.error('Sprint deletion failed:', errorMessage);
    },
  });
}

export function useSprintDeletionPreview(sprintId: string) {
  return useQuery({
    queryKey: sprintKeys.deletionPreview(sprintId),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SPRINTS.DELETION_PREVIEW(sprintId));
      return response.data.data;
    },
    enabled: !!sprintId,
    staleTime: 0, // Always fetch fresh data for deletion preview
    retry: false, // Don't retry on error for deletion preview
  });
}

export function useStartSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(API_ENDPOINTS.SPRINTS.START(id));
      return response.data.data.sprint as Sprint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data._id) });
      if (data.projectId) {
        const projectId = getSafeProjectId(data.projectId);
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: sprintKeys.project(projectId)
          });
        }
      }
    },
  });
}

export function useCompleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: string | CompleteSprintRequest) => {
      const request: CompleteSprintRequest = typeof input === 'string'
        ? { id: input, carryForwardStrategy: 'moveToBacklog' }
        : input;

      const response = await apiClient.post(
        API_ENDPOINTS.SPRINTS.COMPLETE(request.id),
        {
          carryForwardStrategy: request.carryForwardStrategy ?? 'moveToBacklog',
          targetSprintId: request.targetSprintId
        }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data.sprint._id) });
      if (data.sprint.projectId) {
        const projectId = getSafeProjectId(data.sprint.projectId);
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: sprintKeys.project(projectId)
          });
        }
      }
    },
  });
}

export function useRecordDailyStandup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sprintId, 
      data 
    }: { 
      sprintId: string; 
      data: {
        date: string;
        progress: string;
        blockers?: string[];
        plans: string;
        attendees?: string[];
      };
    }) => {
      const response = await apiClient.post(API_ENDPOINTS.SPRINTS.DAILY_STANDUP(sprintId), data);
      return response.data.data.standup;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(variables.sprintId) });
    },
  });
}

export function useCreateRetrospective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sprintId, 
      data 
    }: { 
      sprintId: string; 
      data: {
        whatWentWell: string[];
        whatCanImprove: string[];
        actionItems: Array<{
          description: string;
          assignee?: string;
          dueDate?: string;
        }>;
        sprintRating: number;
      };
    }) => {
      const response = await apiClient.post(API_ENDPOINTS.SPRINTS.RETROSPECTIVE(sprintId), data);
      return response.data.data.retrospective;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(variables.sprintId) });
    },
  });
}

// Member management hooks
export function useSprintMembers(id: string) {
  return useQuery({
    queryKey: sprintKeys.members(id),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SPRINTS.MEMBERS(id));
      return response.data.data.members;
    },
    enabled: !!id,
  });
}

export function useAddSprintMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sprintId, memberIds }: { sprintId: string; memberIds: string[] }) => {
      const response = await apiClient.post(API_ENDPOINTS.SPRINTS.ADD_MEMBERS(sprintId), { memberIds });
      return response.data.data.sprint as Sprint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data._id) });
      queryClient.invalidateQueries({ queryKey: sprintKeys.members(data._id) });
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      if (data.projectId) {
        const projectId = getSafeProjectId(data.projectId);
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: sprintKeys.project(projectId)
          });
        }
      }
    },
  });
}

export function useRemoveSprintMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sprintId, memberIds }: { sprintId: string; memberIds: string[] }) => {
      const response = await apiClient.delete(API_ENDPOINTS.SPRINTS.REMOVE_MEMBERS(sprintId), {
        data: { memberIds }
      });
      return response.data.data.sprint as Sprint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data._id) });
      queryClient.invalidateQueries({ queryKey: sprintKeys.members(data._id) });
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      if (data.projectId) {
        const projectId = getSafeProjectId(data.projectId);
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: sprintKeys.project(projectId)
          });
        }
      }
    },
  });
}
export type CompleteSprintStrategy = 'moveToBacklog' | 'carryForwardToSprint';

export interface CompleteSprintRequest {
  id: string;
  carryForwardStrategy?: CompleteSprintStrategy;
  targetSprintId?: string;
}
