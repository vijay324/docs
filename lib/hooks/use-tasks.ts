import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Task, User } from '@/utils/types';
import { useOptimisticUpdates } from './use-optimistic-updates';
import { errorHandler } from '../error-handler';
import { API_ENDPOINTS } from '@/utils/constants';
import { useAuth } from '@/lib/auth-context';


// Query Keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  project: (projectId: string) => [...taskKeys.all, 'project', projectId] as const,
  sprint: (sprintId: string) => [...taskKeys.all, 'sprint', sprintId] as const,
  individual: (projectId: string) => [...taskKeys.all, 'individual', projectId] as const,
  // Role-based query keys for optimistic updates
  myTasks: () => [...taskKeys.all, 'my'] as const,
  myAssignedTasks: () => [...taskKeys.all, 'my', 'assigned'] as const,
  myCreatedTasks: () => [...taskKeys.all, 'my', 'created'] as const,
  teamTasks: () => [...taskKeys.all, 'team'] as const,
};

// Hooks
export function useTasks(filters?: Record<string, any>) {
  return useQuery({
    queryKey: taskKeys.list(filters || {}),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.TASKS.BASE, { params: filters });
      return response.data.data.tasks as Task[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useProjectTasks(projectId: string, filters?: Record<string, any>) {
  // Ensure projectId is a valid string and not an object
  const safeProjectId = typeof projectId === 'string' ? projectId : '';

  return useQuery({
    queryKey: taskKeys.list({ projectId: safeProjectId, ...filters }),
    queryFn: async () => {
      if (!safeProjectId || typeof safeProjectId !== 'string') {
        console.warn('Invalid project ID provided to useProjectTasks:', projectId);
        return [] as Task[];
      }
      try {
        const response = await apiClient.get(API_ENDPOINTS.TASKS.BY_PROJECT(safeProjectId), { params: filters });
        return response.data.data.tasks as Task[];
      } catch (error: any) {
        console.warn('Project tasks endpoint not available, returning empty array:', error.message);
        return [] as Task[];
      }
    },
    enabled: !!safeProjectId && typeof safeProjectId === 'string',
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSprintTasks(projectId: string, sprintId: string) {
  // Ensure both IDs are valid strings and not objects
  const safeProjectId = typeof projectId === 'string' ? projectId : '';
  const safeSprintId = typeof sprintId === 'string' ? sprintId : '';

  return useQuery({
    queryKey: taskKeys.sprint(safeSprintId),
    queryFn: async () => {
      // Validate inputs before making the request
      if (!safeProjectId || !safeSprintId) {
        throw new Error('Both projectId and sprintId are required');
      }

      // Validate ObjectId format
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(safeProjectId)) {
        throw new Error('Invalid projectId format. Must be a valid ObjectId.');
      }
      if (!objectIdRegex.test(safeSprintId)) {
        throw new Error('Invalid sprintId format. Must be a valid ObjectId.');
      }

      const response = await apiClient.get(API_ENDPOINTS.TASKS.BY_SPRINT(safeProjectId, safeSprintId));
      return response.data.data.tasks as Task[];
    },
    enabled: !!safeProjectId && !!safeSprintId &&
             safeProjectId.length === 24 && safeSprintId.length === 24 &&
             /^[0-9a-fA-F]{24}$/.test(safeProjectId) &&
             /^[0-9a-fA-F]{24}$/.test(safeSprintId),
  });
}

export function useIndividualTasks(projectId: string) {
  // Ensure projectId is a valid string and not an object
  const safeProjectId = typeof projectId === 'string' ? projectId : '';

  return useQuery({
    queryKey: taskKeys.individual(safeProjectId),
    queryFn: async () => {
      if (!safeProjectId || typeof safeProjectId !== 'string') {
        console.warn('Invalid project ID provided to useIndividualTasks:', projectId);
        return [] as Task[];
      }
      const response = await apiClient.get(API_ENDPOINTS.TASKS.INDIVIDUAL(safeProjectId));
      return response.data.data.tasks as Task[];
    },
    enabled: !!safeProjectId && typeof safeProjectId === 'string',
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.TASKS.BY_ID(id));
      return response.data.data.task as Task;
    },
    enabled: !!id,
    retry: false, // Don't retry on 404 errors (deleted tasks)
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { optimisticTaskCreate, rollbackUpdates, invalidateRelatedQueries } = useOptimisticUpdates();

  return useMutation({
    mutationKey: ['tasks', 'create'],
    mutationFn: async (data: Partial<Task>) => {
      const response = await apiClient.post(API_ENDPOINTS.TASKS.BASE, data);
      return response.data.data.task as Task;
    },
    onMutate: async (data) => {
      // Apply optimistic update
      const { tempId, updates } = optimisticTaskCreate(data);

      return { tempId, rollbackData: updates };
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.rollbackData) {
        rollbackUpdates(context.rollbackData);
      }

      // Handle error
      errorHandler.handleError(error, 'Create Task');

      // Log error message
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create task';
      console.error("Task creation failed:", errorMessage);
    },
    onSuccess: async (data, variables, context) => {
      // Replace temporary task with real task
      if (context?.tempId) {
        // Update the optimistic task with real data using predicate matching
        const taskQueries = queryClient.getQueriesData({
          predicate: (query) => query.queryKey[0] === 'tasks' && Array.isArray(query.state.data)
        });

        taskQueries.forEach(([queryKey, oldTasks]) => {
          if (Array.isArray(oldTasks)) {
            queryClient.setQueryData(queryKey,
              oldTasks.map(task =>
                task._id === context.tempId ? data : task
              )
            );
          }
        });
      }

      // Invalidate related queries
      const projectId =
        ((typeof data.projectId === 'string' && data.projectId) ||
          (data.project && typeof data.project === 'object' && data.project._id) ||
          (data.project && typeof data.project === 'string' && data.project)) ||
        undefined;
      await invalidateRelatedQueries('task', data._id, projectId);

      // Note: Toast notifications are handled by the calling component to avoid duplicates
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { optimisticTaskUpdate, rollbackUpdates, invalidateRelatedQueries } = useOptimisticUpdates();

  return useMutation({
    mutationKey: ['tasks', 'update'],
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const response = await apiClient.put(API_ENDPOINTS.TASKS.BY_ID(id), data);
      return response.data.data.task as Task;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });

      // Apply optimistic update
      const rollbackData = optimisticTaskUpdate(id, data);

      return { rollbackData };
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.rollbackData) {
        rollbackUpdates(context.rollbackData);
      }

      // Handle error
      errorHandler.handleError(error, 'Update Task');

      // Log error message
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update task';
      console.error("Task update failed:", errorMessage);
    },
    onSuccess: async (data: Task, variables) => {
      // Selective invalidation: Only invalidate affected queries
      const projectId =
        ((typeof data.projectId === 'string' && data.projectId) ||
          (data.project && typeof data.project === 'object' && data.project._id) ||
          (data.project && typeof data.project === 'string' && data.project)) ||
        undefined;
      
      // Invalidate specific task detail
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data._id) });
      
      // Invalidate project-specific task lists if projectId exists
      if (projectId) {
        queryClient.invalidateQueries({ 
          queryKey: ['tasks', { projectId }],
          exact: false 
        });
      }
      
      // Invalidate sprint tasks if task is in a sprint
      const sprintId =
        ((typeof data.sprintId === 'string' && data.sprintId) ||
          (data.sprint && typeof data.sprint === 'object' && data.sprint._id) ||
          (data.sprint && typeof data.sprint === 'string' && data.sprint)) ||
        undefined;
      if (sprintId) {
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.sprint(sprintId)
        });
      }
      
      // Only invalidate dashboard if status changed (affects stats)
      if (variables.data.status) {
        queryClient.invalidateQueries({ 
          queryKey: ['dashboard'],
          exact: false 
        });
        console.log(`Task status changed to: ${variables.data.status}`);
      }

      // Log success message
      console.log(`Task updated successfully! ${data.title} has been updated.`);

      // Note: Toast notifications are handled by the calling component to avoid duplicates
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { optimisticTaskDelete, rollbackUpdates, invalidateRelatedQueries } = useOptimisticUpdates();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.TASKS.BY_ID(id));
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ predicate: q => q.queryKey[0] === 'tasks' });

      const rollbackData = optimisticTaskDelete(id);
      return { rollbackData };
    },
    onError: (error: any, id, context) => {
      if (context?.rollbackData) {
        rollbackUpdates(context.rollbackData);
      }
      errorHandler.handleError(error, 'Delete Task');
    },
    onSuccess: (deletedTaskId) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(deletedTaskId) });

      queryClient.invalidateQueries({
        predicate: (query) => {
          const isTaskQuery = query.queryKey[0] === 'tasks';
          const isDetailQuery = query.queryKey[1] === 'detail';
          const isDeletedTaskDetail = isDetailQuery && query.queryKey[2] === deletedTaskId;
          return isTaskQuery && !isDeletedTaskDetail;
        }
      });

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`${API_ENDPOINTS.TASKS.BY_ID(id)}/restore`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'tasks'
      });
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const response = await apiClient.post(`/tasks/${taskId}/comments`, { content });
      return response.data.data.comment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
  });
}



export function useAddWorkLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      timeSpent,
      description,
      date
    }: {
      taskId: string;
      timeSpent: number;
      description: string;
      date?: string;
    }) => {
      const response = await apiClient.post(`/tasks/${taskId}/worklog`, {
        timeSpent,
        description,
        date,
      });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
  });
}

// Role-aware task hooks

/**
 * Get all tasks visible to the current user based on their role
 * - Employees: See only their assigned tasks (role-based filtering)
 * - Admins/Managers: See all tasks across the organization
 * - Dashboard context: When forDashboard=true, ALL users see only their personal tasks
 */
export function useMyTasks(
  filters?: Record<string, any>,
  forDashboard: boolean = false,
  options?: { enabled?: boolean }
) {
  const { user } = useAuth();
  const queryEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: [...taskKeys.myTasks(), { forDashboard, filters, userId: user?._id }], // Include forDashboard and userId in cache key
    queryFn: async () => {
      console.log('🔍 [FRONTEND] useMyTasks starting API call:', {
        forDashboard,
        userRole: user?.role,
        userId: user?._id,
        filters,
        timestamp: new Date().toISOString()
      });

      // Build query parameters based on user role and context
      const queryParams = { ...filters };

      // DASHBOARD PERSONALIZATION: For dashboard context, always apply personal filtering
      // This ensures ALL users (including admins) see only their own tasks on the dashboard
      if (forDashboard || user?.role === 'Employee') {
        queryParams.personal = 'true';
        console.log('🔍 [FRONTEND] Applied personal filtering:', {
          reason: forDashboard ? 'Dashboard context' : 'Employee role',
          queryParams
        });
      }

      console.log('🔍 [FRONTEND] Making API request to:', {
        endpoint: API_ENDPOINTS.TASKS.BASE,
        params: queryParams
      });

      const response = await apiClient.get(API_ENDPOINTS.TASKS.BASE, { params: queryParams });

      console.log('🔍 [FRONTEND] API response received:', {
        taskCount: response.data.data.tasks?.length || 0,
        tasks: response.data.data.tasks?.map((t: any) => ({
          id: t._id,
          title: t.title,
          status: t.status,
          assignee: t.assignee,
          reviewer: t.reviewer,
          tester: t.tester,
          reporter: t.reporter,
          userRoles: {
            isAssignee: (t.assignee?._id ?? t.assigneeId) === user?._id,
            isReviewer: (t.reviewer?._id ?? t.reviewerId) === user?._id,
            isTester: (t.tester?._id ?? t.testerId) === user?._id,
            isReporter: (t.reporter?._id ?? t.reporterId) === user?._id
          }
        }))
      });

      return response.data.data.tasks as Task[];
    },
    enabled: !!user && queryEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get tasks assigned to the current user
 */
export function useMyAssignedTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: taskKeys.myAssignedTasks(),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.TASKS.BASE, {
        params: { assignee: user?._id }
      });
      return response.data.data.tasks as Task[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get tasks created by the current user (individual tasks)
 */
export function useMyCreatedTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: taskKeys.myCreatedTasks(),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.TASKS.BASE, {
        params: { reporter: user?._id }
      });
      return response.data.data.tasks as Task[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get team tasks for admins (tasks across the organization)
 * Only available for Admin role
 */
export function useTeamTasks() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  return useQuery({
    queryKey: taskKeys.teamTasks(),
    queryFn: async () => {
      // Backend automatically filters based on user's role and team relationships
      const response = await apiClient.get(API_ENDPOINTS.TASKS.BASE);
      return response.data.data.tasks as Task[];
    },
    enabled: !!user && isAdminOrManager,
    staleTime: 2 * 60 * 1000,
  });
}
