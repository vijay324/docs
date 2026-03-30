import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Task, Project, Sprint } from '@/utils/types';
import { taskKeys } from './use-tasks';
import { projectKeys } from './use-projects';
import { sprintKeys } from './use-sprints';
import { v4 as uuidv4 } from 'uuid';

export interface OptimisticUpdate<T> {
  queryKey: readonly unknown[];
  updater: (oldData: T) => T;
  rollback?: (oldData: T) => T;
}

export function useOptimisticUpdates() {
  const queryClient = useQueryClient();

  const applyOptimisticUpdate = useCallback(
    <T>(update: OptimisticUpdate<T>) => {
      const previousData = queryClient.getQueryData<T>(update.queryKey);
      
      if (previousData) {
        queryClient.setQueryData<T>(update.queryKey, update.updater(previousData));
      }
      
      return previousData;
    },
    [queryClient]
  );

  const rollbackOptimisticUpdate = useCallback(
    <T>(queryKey: readonly unknown[], previousData: T) => {
      if (previousData) {
        queryClient.setQueryData<T>(queryKey, previousData);
      }
    },
    [queryClient]
  );

  // Task optimistic updates
  const optimisticTaskUpdate = useCallback(
    (taskId: string, taskUpdates: Partial<Task>) => {
      const updates: OptimisticUpdate<Task[]>[] = [];

      // Update all possible task list queries using predicate matching
      const taskQueries = queryClient.getQueriesData({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (key === 'tasks' ||
                  (Array.isArray(query.queryKey) && query.queryKey.includes('tasks'))) &&
                 Array.isArray(query.state.data);
        }
      });

      // Apply updates to all matching task queries
      taskQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey,
            data.map(task =>
              task._id === taskId ? { ...task, ...taskUpdates, updatedAt: new Date().toISOString() } : task
            )
          );
        }
      });

      // Update individual task
      updates.push({
        queryKey: taskKeys.detail(taskId),
        updater: (oldTask) => ({ ...oldTask, ...taskUpdates, updatedAt: new Date().toISOString() }),
      });

      return updates.map(update => ({
        ...update,
        previousData: applyOptimisticUpdate(update),
      }));
    },
    [applyOptimisticUpdate]
  );

  const optimisticTaskCreate = useCallback(
    (newTask: Partial<Task>) => {
      const tempId = `temp-${Date.now()}`;
      const optimisticTask: Task = {
        _id: tempId,
        title: newTask.title || '',
        description: newTask.description || '',
        status: newTask.status || 'To Do',
        priority: newTask.priority || 'Medium',
        type: newTask.type || 'Task',
        projectId: newTask.projectId!,
        assignee: newTask.assignee,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...newTask,
      } as Task;

      const updates: OptimisticUpdate<Task[]>[] = [];
      
      // Add to task lists using predicate to match all task queries
      const taskQueries = queryClient.getQueriesData({
        predicate: (query) => query.queryKey[0] === 'tasks' && Array.isArray(query.state.data)
      });

      taskQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey, [optimisticTask, ...data]);
        }
      });
      
      if (newTask.projectId || newTask.project) {
        const projectId =
          (typeof newTask.projectId === 'string' && newTask.projectId) ||
          (newTask.project && typeof newTask.project === 'object' && newTask.project._id) ||
          (newTask.project && typeof newTask.project === 'string' && newTask.project);

        if (projectId) {
          updates.push({
            queryKey: taskKeys.project(projectId),
            updater: (oldTasks) => [optimisticTask, ...oldTasks],
          });
        }
      }
      
      return {
        tempId,
        updates: updates.map(update => ({
          ...update,
          previousData: applyOptimisticUpdate(update),
        })),
      };
    },
    [applyOptimisticUpdate]
  );

  const optimisticTaskDelete = useCallback(
    (taskId: string) => {
      const updates: OptimisticUpdate<Task[]>[] = [];
      
      // Remove from task lists using predicate to match all task queries
      const taskQueries = queryClient.getQueriesData({
        predicate: (query) => query.queryKey[0] === 'tasks' && Array.isArray(query.state.data)
      });

      taskQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey,
            data.filter(task => task._id !== taskId)
          );
        }
      });
      
      return updates.map(update => ({
        ...update,
        previousData: applyOptimisticUpdate(update),
      }));
    },
    [applyOptimisticUpdate]
  );

  // Project optimistic updates
  const optimisticProjectUpdate = useCallback(
    (projectId: string, updates: Partial<Project>) => {
      const updatesList: OptimisticUpdate<Project[]>[] = [];
      
      // Update project lists
      updatesList.push({
        queryKey: projectKeys.lists(),
        updater: (oldProjects) =>
          oldProjects.map(project =>
            project._id === projectId ? { ...project, ...updates } : project
          ),
      });
      
      // Update individual project
      updatesList.push({
        queryKey: projectKeys.detail(projectId),
        updater: (oldProject) => ({ ...oldProject, ...updates }),
      });
      
      return updatesList.map(update => ({
        ...update,
        previousData: applyOptimisticUpdate(update),
      }));
    },
    [applyOptimisticUpdate]
  );

  // Sprint optimistic updates
  const optimisticSprintUpdate = useCallback(
    (sprintId: string, updates: Partial<Sprint>) => {
      const updatesList: OptimisticUpdate<Sprint[]>[] = [];
      
      // Update sprint lists
      updatesList.push({
        queryKey: sprintKeys.lists(),
        updater: (oldSprints) =>
          oldSprints.map(sprint =>
            sprint._id === sprintId ? { ...sprint, ...updates } : sprint
          ),
      });
      
      // Update individual sprint
      updatesList.push({
        queryKey: sprintKeys.detail(sprintId),
        updater: (oldSprint) => ({ ...oldSprint, ...updates }),
      });
      
      return updatesList.map(update => ({
        ...update,
        previousData: applyOptimisticUpdate(update),
      }));
    },
    [applyOptimisticUpdate]
  );

  // Batch rollback for failed operations
  const rollbackUpdates = useCallback(
    (updates: Array<{ queryKey: readonly unknown[]; previousData: any }>) => {
      updates.forEach(({ queryKey, previousData }) => {
        rollbackOptimisticUpdate(queryKey, previousData);
      });
    },
    [rollbackOptimisticUpdate]
  );

  // Cache invalidation helpers
  const invalidateRelatedQueries = useCallback(
    async (entity: 'task' | 'project' | 'sprint', entityId?: string, projectId?: string) => {
      const invalidations: Promise<void>[] = [];
      
      switch (entity) {
        case 'task':
          // Invalidate all task-related queries using pattern matching
          invalidations.push(queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === 'tasks'
          }));
          invalidations.push(queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] }));
          invalidations.push(queryClient.invalidateQueries({ queryKey: ['sprint', 'tasks'] }));
          invalidations.push(queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] }));

          if (entityId) {
            invalidations.push(queryClient.invalidateQueries({ queryKey: taskKeys.detail(entityId) }));
          }
          if (projectId) {
            invalidations.push(queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) }));
            invalidations.push(queryClient.invalidateQueries({ queryKey: projectKeys.stats(projectId) }));
          }
          break;
          
        case 'project':
          invalidations.push(queryClient.invalidateQueries({ queryKey: projectKeys.lists() }));
          if (entityId) {
            invalidations.push(queryClient.invalidateQueries({ queryKey: projectKeys.detail(entityId) }));
            invalidations.push(queryClient.invalidateQueries({ queryKey: taskKeys.project(entityId) }));
            invalidations.push(queryClient.invalidateQueries({ queryKey: sprintKeys.project(entityId) }));
          }
          break;
          
        case 'sprint':
          invalidations.push(queryClient.invalidateQueries({ queryKey: sprintKeys.lists() }));
          if (entityId) {
            invalidations.push(queryClient.invalidateQueries({ queryKey: sprintKeys.detail(entityId) }));
          }
          if (projectId) {
            invalidations.push(queryClient.invalidateQueries({ queryKey: sprintKeys.project(projectId) }));
          }
          break;
      }
      
      await Promise.all(invalidations);
    },
    [queryClient]
  );

  // Prefetch related data
  const prefetchRelatedData = useCallback(
    async (entity: 'task' | 'project' | 'sprint', entityId: string) => {
      // This would prefetch commonly accessed related data
      // Implementation depends on your specific use cases
    },
    [queryClient]
  );

  // Enhanced real-time optimistic updates
  const optimisticTaskStatusUpdate = useCallback(
    (taskId: string, newStatus: Task['status']) => {
      const updates: OptimisticUpdate<Task[]>[] = [];

      // Update all task lists using predicate to match all task queries
      const taskQueries = queryClient.getQueriesData({
        predicate: (query) => query.queryKey[0] === 'tasks' && Array.isArray(query.state.data)
      });

      taskQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey,
            data.map(task =>
              task._id === taskId
                ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
                : task
            )
          );
        }
      });

      // Apply updates and collect rollback data
      const rollbackData = updates.map(update => ({
        queryKey: update.queryKey,
        previousData: applyOptimisticUpdate(update)
      }));

      console.log(`Task status updated to ${newStatus}`);

      return rollbackData;
    },
    [applyOptimisticUpdate]
  );

  const optimisticTaskAssignment = useCallback(
    (taskId: string, assigneeId: string | null, assigneeName?: string) => {
      const updates: OptimisticUpdate<Task[]>[] = [];

      // Update task assignment using predicate to match all task queries
      const taskQueries = queryClient.getQueriesData({
        predicate: (query) => query.queryKey[0] === 'tasks' && Array.isArray(query.state.data)
      });

      taskQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey,
            data.map(task =>
              task._id === taskId
                ? {
                    ...task,
                    assignee: assigneeId ? { _id: assigneeId, email: assigneeName || 'Unknown' } as any : null,
                    updatedAt: new Date().toISOString()
                  }
                : task
            )
          );
        }
      });

      const rollbackData = updates.map(update => ({
        queryKey: update.queryKey,
        previousData: applyOptimisticUpdate(update)
      }));

      const message = assigneeId
        ? `Task assigned to ${assigneeName || 'user'}`
        : 'Task unassigned';
      console.log(message);

      return rollbackData;
    },
    [applyOptimisticUpdate]
  );

  const optimisticCommentAdd = useCallback(
    (taskId: string, comment: string, authorName: string) => {
      const tempCommentId = uuidv4();
      const newComment = {
        _id: tempCommentId,
        content: comment,
        author: { email: authorName },
        createdAt: new Date().toISOString(),
        isOptimistic: true
      };

      const updates: OptimisticUpdate<Task>[] = [];

      updates.push({
        queryKey: taskKeys.detail(taskId),
        updater: (oldTask) => ({
          ...oldTask,
          comments: [...(oldTask.comments || []), newComment]
        }),
      });

      const rollbackData = updates.map(update => ({
        queryKey: update.queryKey,
        previousData: applyOptimisticUpdate(update)
      }));

      // toast.success('Comment added');
      console.log('Comment added');

      return { rollbackData, tempCommentId };
    },
    [applyOptimisticUpdate]
  );

  const optimisticProjectMemberAdd = useCallback(
    (projectId: string, newMember: any) => {
      const updates: OptimisticUpdate<Project[]>[] = [];

      updates.push({
        queryKey: projectKeys.lists(),
        updater: (oldProjects) =>
          oldProjects.map(project =>
            project._id === projectId
              ? {
                  ...project,
                  employees: [...(project.employees || []), newMember],
                  updatedAt: new Date().toISOString()
                }
              : project
          ),
      });

      const rollbackData = updates.map(update => ({
        queryKey: update.queryKey,
        previousData: applyOptimisticUpdate(update)
      }));

      console.log(`${newMember.email} added to project`);

      return rollbackData;
    },
    [applyOptimisticUpdate]
  );

  // Batch optimistic updates for better performance
  const batchOptimisticUpdates = useCallback(
    (updates: OptimisticUpdate<any>[]) => {
      const rollbackData = updates.map(update => ({
        queryKey: update.queryKey,
        previousData: applyOptimisticUpdate(update)
      }));

      return rollbackData;
    },
    [applyOptimisticUpdate]
  );

  // Smart rollback that handles conflicts with real-time updates
  const smartRollback = useCallback(
    (rollbackData: Array<{ queryKey: readonly unknown[]; previousData: any }>, conflictResolution: 'merge' | 'replace' | 'skip' = 'merge') => {
      rollbackData.forEach(({ queryKey, previousData }) => {
        if (conflictResolution === 'skip') {
          // Check if data has been updated by real-time events
          const currentData = queryClient.getQueryData(queryKey);
          if (currentData && JSON.stringify(currentData) !== JSON.stringify(previousData)) {
            console.log('Skipping rollback due to real-time conflict');
            return;
          }
        }

        if (conflictResolution === 'merge' && previousData) {
          // Attempt to merge changes
          const currentData = queryClient.getQueryData(queryKey);
          if (currentData && Array.isArray(currentData) && Array.isArray(previousData)) {
            // For arrays, merge by ID
            const mergedData = currentData.map((current: any) => {
              const previous = previousData.find((p: any) => p._id === current._id);
              return previous ? { ...previous, ...current } : current;
            });
            queryClient.setQueryData(queryKey, mergedData);
            return;
          }
        }

        // Default: replace with previous data
        rollbackOptimisticUpdate(queryKey, previousData);
      });
    },
    [queryClient, rollbackOptimisticUpdate]
  );

  return {
    // Existing optimistic updates
    optimisticTaskUpdate,
    optimisticTaskCreate,
    optimisticTaskDelete,
    optimisticProjectUpdate,
    optimisticSprintUpdate,

    // Enhanced real-time optimistic updates
    optimisticTaskStatusUpdate,
    optimisticTaskAssignment,
    optimisticCommentAdd,
    optimisticProjectMemberAdd,
    batchOptimisticUpdates,

    // Rollback
    rollbackUpdates,
    smartRollback,

    // Cache management
    invalidateRelatedQueries,
    prefetchRelatedData,

    // Low-level utilities
    applyOptimisticUpdate,
    rollbackOptimisticUpdate,
  };
}
