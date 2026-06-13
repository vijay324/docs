import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket, type NotificationPayload } from '@/lib/contexts/socket-context';
import { taskKeys } from './use-tasks';
import { projectKeys } from './use-projects';
import { sprintKeys } from './use-sprints';
import type { Task, Project, Sprint } from '@/utils/types';
import { REALTIME_VERSION, type RealtimeEventEnvelope, REALTIME_EVENT_TYPES } from '@/lib/realtime/contracts';

/**
 * Real-time CRUD hooks using Socket.IO
 *
 * Listens for server-side CRUD events and applies direct cache updates
 * instead of blind invalidation, giving a Linear/Notion-like instant feel.
 *
 * Events handled:
 *   task:created / task:updated / task:deleted / task:restored
 *   project:created / project:updated / project:deleted
 *   sprint:created / sprint:updated / sprint:deleted
 *   notification (structured notifications)
 */

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (projectId?: string) => ['dashboard', 'stats', { projectId }] as const,
  tasks: (projectId?: string) => ['dashboard', 'tasks', { projectId }] as const,
};

export interface RealTimeEvent {
  id: number;
  type: string;
  data: any;
  timestamp: string;
  userId?: string;
}

export interface RealTimeConnection {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: RealTimeEvent | null;
  connectionCount: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Merge an updated entity into a cached array by _id.
 * If the entity doesn't exist yet, prepend it (handles create-like scenarios).
 */
function mergeEntityIntoList<T extends { _id: string; updatedAt: string }>(
  list: T[],
  entity: T,
): T[] {
  const idx = list.findIndex(item => item._id === entity._id);
  if (idx >= 0) {
    const existing = list[idx];
    // Skip if server data is the same (dedup with optimistic update)
    if (existing.updatedAt === entity.updatedAt) return list;
    const next = [...list];
    next[idx] = entity;
    return next;
  }
  return [entity, ...list];
}

function removeEntityFromList<T extends { _id: string }>(
  list: T[],
  id: string,
): T[] {
  return list.filter(item => item._id !== id);
}

// ---------------------------------------------------------------------------
// Main real-time hook
// ---------------------------------------------------------------------------

export function useRealTime(): RealTimeConnection {
  const { status, lastNotification, socket } = useSocket();
  const queryClient = useQueryClient();
  const processedNotificationEventsRef = useRef<Set<string>>(new Set());
  const processedRealtimeEventsRef = useRef<Set<string>>(new Set());

  const handleTaskCreated = useCallback((data: { task: any }) => {
    if (!data.task) return;

    queryClient.setQueriesData(
      { predicate: q => q.queryKey[0] === 'tasks' && Array.isArray(q.state.data) },
      (old: Task[] | undefined) => {
        if (!old) return old;
        if (old.find(t => t._id === data.task._id)) return old;
        return [data.task, ...old];
      },
    );
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

  const handleTaskUpdated = useCallback((data: {
    taskId: string;
    task?: any;
    changes: string[];
  }) => {
    if (data.task) {
      queryClient.setQueriesData(
        { predicate: q => q.queryKey[0] === 'tasks' && Array.isArray(q.state.data) },
        (old: Task[] | undefined) => {
          if (!old) return old;
          return mergeEntityIntoList(old, data.task);
        },
      );

      queryClient.setQueryData(taskKeys.detail(data.taskId), data.task);
    } else {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      if (data.taskId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
      }
    }

    if (data.changes?.some(c => ['status', 'assignee', 'sprintId', 'priority'].includes(c))) {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
    }
  }, [queryClient]);

  const handleTaskDeleted = useCallback((data: { taskId: string }) => {
    queryClient.setQueriesData(
      { predicate: q => q.queryKey[0] === 'tasks' && Array.isArray(q.state.data) },
      (old: Task[] | undefined) => {
        if (!old) return old;
        return removeEntityFromList(old, data.taskId);
      },
    );

    queryClient.removeQueries({ queryKey: taskKeys.detail(data.taskId) });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

  const handleTaskRestored = useCallback((data: { task: any }) => {
    if (!data.task) return;

    queryClient.setQueriesData(
      { predicate: q => q.queryKey[0] === 'tasks' && Array.isArray(q.state.data) },
      (old: Task[] | undefined) => {
        if (!old) return old;
        if (old.find(t => t._id === data.task._id)) return old;
        return [data.task, ...old];
      },
    );
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

  const handleProjectCreated = useCallback((data: { project: any }) => {
    if (!data.project) return;

    queryClient.setQueriesData(
      { predicate: q => q.queryKey[0] === 'projects' && Array.isArray(q.state.data) },
      (old: Project[] | undefined) => {
        if (!old) return old;
        if (old.find(p => p._id === data.project._id)) return old;
        return [data.project, ...old];
      },
    );
  }, [queryClient]);

  const handleProjectUpdated = useCallback((data: { project: any }) => {
    if (!data.project) return;

    queryClient.setQueriesData(
      { predicate: q => q.queryKey[0] === 'projects' && Array.isArray(q.state.data) },
      (old: Project[] | undefined) => {
        if (!old) return old;
        return mergeEntityIntoList(old, data.project);
      },
    );

    queryClient.setQueryData(projectKeys.detail(data.project._id), data.project);
  }, [queryClient]);

  const handleProjectDeleted = useCallback((data: { projectId: string }) => {
    queryClient.setQueriesData(
      { predicate: q => q.queryKey[0] === 'projects' && Array.isArray(q.state.data) },
      (old: Project[] | undefined) => {
        if (!old) return old;
        return removeEntityFromList(old, data.projectId);
      },
    );

    queryClient.removeQueries({ queryKey: projectKeys.detail(data.projectId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
    queryClient.invalidateQueries({ queryKey: sprintKeys.all });
  }, [queryClient]);

  const handleSprintCreated = useCallback((data: { sprint: any }) => {
    if (!data.sprint) return;

    queryClient.setQueriesData(
      { predicate: q => q.queryKey[0] === 'sprints' && Array.isArray(q.state.data) },
      (old: Sprint[] | undefined) => {
        if (!old) return old;
        if (old.find(s => s._id === data.sprint._id)) return old;
        return [data.sprint, ...old];
      },
    );
  }, [queryClient]);

  const handleSprintUpdated = useCallback((data: { sprintId: string; sprint?: any; changes: string[] }) => {
    if (data.sprint) {
      queryClient.setQueriesData(
        { predicate: q => q.queryKey[0] === 'sprints' && Array.isArray(q.state.data) },
        (old: Sprint[] | undefined) => {
          if (!old) return old;
          return mergeEntityIntoList(old, data.sprint);
        },
      );
      queryClient.setQueryData(sprintKeys.detail(data.sprintId), data.sprint);
    } else {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
    }

    if (data.changes?.includes('status')) {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    }
  }, [queryClient]);

  const handleSprintDeleted = useCallback((data: { sprintId: string }) => {
    queryClient.setQueriesData(
      { predicate: q => q.queryKey[0] === 'sprints' && Array.isArray(q.state.data) },
      (old: Sprint[] | undefined) => {
        if (!old) return old;
        return removeEntityFromList(old, data.sprintId);
      },
    );
    queryClient.removeQueries({ queryKey: sprintKeys.detail(data.sprintId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

  const handleRealtimeEnvelope = useCallback((envelope: RealtimeEventEnvelope<any>) => {
    if (!envelope || envelope.version !== REALTIME_VERSION || !envelope.idempotencyKey) {
      return;
    }

    if (processedRealtimeEventsRef.current.has(envelope.idempotencyKey)) {
      return;
    }
    processedRealtimeEventsRef.current.add(envelope.idempotencyKey);
    if (processedRealtimeEventsRef.current.size > 200) {
      const entries = Array.from(processedRealtimeEventsRef.current);
      processedRealtimeEventsRef.current = new Set(entries.slice(-200));
    }

    switch (envelope.type) {
      case REALTIME_EVENT_TYPES.taskCreated:
        handleTaskCreated(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.taskUpdated:
        handleTaskUpdated(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.taskDeleted:
        handleTaskDeleted(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.taskRestored:
        handleTaskRestored(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.projectCreated:
        handleProjectCreated(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.projectUpdated:
        handleProjectUpdated(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.projectDeleted:
        handleProjectDeleted(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.sprintCreated:
        handleSprintCreated(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.sprintUpdated:
        handleSprintUpdated(envelope.data);
        break;
      case REALTIME_EVENT_TYPES.sprintDeleted:
        handleSprintDeleted(envelope.data);
        break;
      default:
        break;
    }
  }, [
    handleTaskCreated,
    handleTaskUpdated,
    handleTaskDeleted,
    handleTaskRestored,
    handleProjectCreated,
    handleProjectUpdated,
    handleProjectDeleted,
    handleSprintCreated,
    handleSprintUpdated,
    handleSprintDeleted,
  ]);

  useEffect(() => {
    if (!socket) return;
    socket.on('realtime:event', handleRealtimeEnvelope);
    return () => {
      socket.off('realtime:event', handleRealtimeEnvelope);
    };
  }, [socket, handleRealtimeEnvelope]);

  // ── NOTIFICATION EVENTS ──────────────────────────────────────────────

  const handleNotification = useCallback((notification: NotificationPayload) => {
    switch (notification.type) {
      case 'task:assigned':
      case 'task:status_changed':
      case 'task:ownership_changed':
        queryClient.invalidateQueries({ queryKey: taskKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
        if (notification.data.taskId) {
          queryClient.invalidateQueries({ queryKey: taskKeys.detail(notification.data.taskId) });
        }
        break;
      case 'task:comment_added':
        if (notification.data.taskId) {
          queryClient.invalidateQueries({ queryKey: taskKeys.detail(notification.data.taskId) });
        }
        break;
      case 'sprint:task_added':
      case 'sprint:updated':
        queryClient.invalidateQueries({ queryKey: sprintKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
        if (notification.data.sprintId) {
          queryClient.invalidateQueries({ queryKey: sprintKeys.detail(notification.data.sprintId) });
        }
        break;
      default:
        break;
    }
  }, [queryClient]);

  useEffect(() => {
    if (!lastNotification) return;

    const eventKey = `${lastNotification.type}-${lastNotification.timestamp}`;
    if (processedNotificationEventsRef.current.has(eventKey)) return;
    processedNotificationEventsRef.current.add(eventKey);

    if (processedNotificationEventsRef.current.size > 50) {
      const entries = Array.from(processedNotificationEventsRef.current);
      processedNotificationEventsRef.current = new Set(entries.slice(-50));
    }

    handleNotification(lastNotification);
  }, [lastNotification, handleNotification]);

  const lastEvent: RealTimeEvent | null = lastNotification ? {
    id: Date.now(),
    type: lastNotification.type,
    data: lastNotification.data,
    timestamp: new Date(lastNotification.timestamp).toISOString(),
  } : null;

  return {
    isConnected: status.isConnected,
    isConnecting: status.isConnecting,
    lastEvent,
    connectionCount: 0,
    error: status.error,
  };
}

// ---------------------------------------------------------------------------
// Scoped hooks
// ---------------------------------------------------------------------------

/**
 * Subscribe to real-time task events for a specific project.
 * Joins the project room and adjusts React Query polling strategy.
 */
export function useRealTimeTasks(projectId?: string) {
  const { status, joinProject, leaveProject } = useSocket();

  useEffect(() => {
    if (projectId && status.isConnected) {
      joinProject(projectId);
      return () => leaveProject(projectId);
    }
  }, [projectId, status.isConnected, joinProject, leaveProject]);

  return {
    isRealTimeActive: status.isConnected,
    lastUpdate: null,
    connectionStatus: {
      isConnected: status.isConnected,
      isConnecting: status.isConnecting,
      error: status.error,
    },
  };
}

/**
 * Dashboard-specific real-time hook.
 * Combines main CRUD listeners with optional project room subscription.
 */
export function useRealTimeDashboard(projectId?: string, onRefresh?: () => void) {
  const { status, socket } = useSocket();
  const queryClient = useQueryClient();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Core real-time cache syncing is mounted globally at org layout level.
  useRealTimeTasks(projectId);

  useEffect(() => {
    if (!socket || !onRefresh) return;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      // Debounce bursts of events to prevent refresh storms.
      refreshTimerRef.current = setTimeout(() => {
        onRefresh();
      }, 250);
    };

    const handleRealtimeDashboardEvent = (event: RealtimeEventEnvelope<any>) => {
      if (!event || event.version !== REALTIME_VERSION) return;

      switch (event.type) {
        case REALTIME_EVENT_TYPES.taskCreated:
        case REALTIME_EVENT_TYPES.taskUpdated:
        case REALTIME_EVENT_TYPES.taskDeleted:
        case REALTIME_EVENT_TYPES.taskRestored:
        case REALTIME_EVENT_TYPES.projectCreated:
        case REALTIME_EVENT_TYPES.projectUpdated:
        case REALTIME_EVENT_TYPES.projectDeleted:
        case REALTIME_EVENT_TYPES.sprintCreated:
        case REALTIME_EVENT_TYPES.sprintUpdated:
        case REALTIME_EVENT_TYPES.sprintDeleted:
          scheduleRefresh();
          break;
        default:
          break;
      }
    };

    socket.on('realtime:event', handleRealtimeDashboardEvent);

    return () => {
      socket.off('realtime:event', handleRealtimeDashboardEvent);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [socket, onRefresh]);

  // Fallback refresh path when socket is unavailable.
  useEffect(() => {
    if (!onRefresh || status.isConnected) return;

    const interval = setInterval(() => {
      onRefresh();
    }, 30_000);

    return () => clearInterval(interval);
  }, [onRefresh, status.isConnected]);

  return {
    isRealTimeActive: status.isConnected,
    connectionStatus: {
      isConnected: status.isConnected,
      isConnecting: status.isConnecting,
      error: status.error,
    },
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      onRefresh?.();
    },
  };
}
