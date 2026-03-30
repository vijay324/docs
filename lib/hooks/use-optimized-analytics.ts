"use client";

/**
 * Optimized Analytics Hooks
 * 
 * PRD Section 10: Dashboard API Design
 * - Cache-first reads from new optimized endpoints
 * - Sub-100ms response times
 * - Pre-aggregated metrics from analytics collections
 * - WebSocket integration for real-time updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

// ==================== TYPES ====================

export interface OptimizedDashboardMetrics {
  overview: {
    tasksCreated: number;
    tasksCompleted: number;
    completionRate: number;
    avgCycleTimeHours: number;
    activeEmployees: number;
    attendanceRate: number;
  };
  trends: Array<{
    date: string;
    tasksCreated: number;
    tasksCompleted: number;
  }>;
  lastUpdated: string;
}

export interface ProjectDashboardMetrics {
  projectId: string;
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    completionRate: number;
    avgCycleTimeHours: number;
  };
  priorityDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  typeDistribution: {
    feature: number;
    bug: number;
    task: number;
    improvement: number;
    other: number;
  };
  lastUpdated: string;
}

export interface SprintDashboardMetrics {
  sprintId: string;
  sprintName: string;
  status: string;
  overview: {
    velocity: number;
    plannedPoints: number;
    completedPoints: number;
    completionRate: number;
    totalTasks: number;
    completedTasks: number;
  };
  burndownData: Array<{
    date: string;
    remaining: number;
    ideal: number;
    completed: number;
  }>;
  lastUpdated: string;
}

export interface EmployeeDashboardMetrics {
  employeeId: string;
  overview: {
    tasksCompleted: number;
    tasksAssigned: number;
    avgCompletionTimeHours: number;
    productivityScore: number;
  };
  roleBreakdown: {
    asAssignee: { tasks: number; completed: number };
    asReviewer: { tasks: number; reviewed: number };
    asTester: { tasks: number; tested: number };
  };
  trends: Array<{
    date: string;
    tasksCompleted: number;
    productivityScore: number;
  }>;
  lastUpdated: string;
}

export interface EmployeeContributionMetrics {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  asAssignee: { assigned: number; completed: number; completionRate: number };
  asReviewer: { assigned: number; reviewed: number };
  asTester: { assigned: number; tested: number };
  pointsCompleted: number;
  onTimeCompletionRate: number;
  avgCycleTimeHours: number;
  productivityScore: number;
}

export interface TaskContributionMatrixRow {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  sprintId?: string;
  sprintName?: string;
  dueDate?: string;
  assignee?: { employeeId: string; employeeName: string };
  reviewer?: { employeeId: string; employeeName: string };
  tester?: { employeeId: string; employeeName: string };
}

export interface ProjectDeepAnalytics {
  projectId: string;
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
    avgCycleTimeHours: number;
  };
  sprintSummary: {
    totalSprints: number;
    activeSprints: number;
    completedSprints: number;
    avgVelocity: number;
  };
  employeePerformance: EmployeeContributionMetrics[];
  taskContributionMatrix: TaskContributionMatrixRow[];
  lastUpdated: string;
}

export interface SprintContributionAnalytics {
  sprintId: string;
  sprintName: string;
  status: string;
  overview: {
    totalTasks: number;
    completedTasks: number;
    plannedPoints: number;
    completedPoints: number;
    completionRate: number;
  };
  employeePerformance: EmployeeContributionMetrics[];
  taskContributionMatrix: TaskContributionMatrixRow[];
  burndownData: Array<{ date: string; remaining: number; ideal: number; completed: number }>;
  lastUpdated: string;
}

export interface EmployeeTaskAnalytics {
  employeeId: string;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: {
    totalInvolvedTasks: number;
    asAssignee: number;
    asReviewer: number;
    asTester: number;
    completedTasks: number;
    completionRate: number;
    avgCycleTimeHours: number;
  };
  tasks: Array<{
    taskId: string;
    title: string;
    status: string;
    priority: string;
    type: string;
    roleInTask: Array<'assignee' | 'reviewer' | 'tester'>;
    projectId: string;
    sprintId?: string;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  lastUpdated: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
  _meta?: {
    responseTimeMs: number;
    cacheEnabled: boolean;
  };
}

// ==================== QUERY KEYS ====================

export const OPTIMIZED_ANALYTICS_KEYS = {
  all: ['optimized-analytics'] as const,
  dashboard: (days?: number) => [...OPTIMIZED_ANALYTICS_KEYS.all, 'dashboard', days] as const,
  project: (projectId: string) => [...OPTIMIZED_ANALYTICS_KEYS.all, 'project', projectId] as const,
  projectDeep: (projectId: string, days?: number) => [...OPTIMIZED_ANALYTICS_KEYS.all, 'project-deep', projectId, days] as const,
  sprint: (sprintId: string) => [...OPTIMIZED_ANALYTICS_KEYS.all, 'sprint', sprintId] as const,
  sprintContributions: (sprintId: string, days?: number) => [...OPTIMIZED_ANALYTICS_KEYS.all, 'sprint-contributions', sprintId, days] as const,
  employee: (employeeId: string, days?: number) => [...OPTIMIZED_ANALYTICS_KEYS.all, 'employee', employeeId, days] as const,
  employeeTasks: (employeeId: string, params?: Record<string, any>) => [...OPTIMIZED_ANALYTICS_KEYS.all, 'employee-tasks', employeeId, params] as const,
};

// ==================== HOOKS ====================

/**
 * Hook for fetching optimized organization dashboard metrics
 * PRD: Cache-first with 60s TTL, sub-100ms response time
 */
export function useOptimizedDashboard(days: number = 30) {
  return useQuery({
    queryKey: OPTIMIZED_ANALYTICS_KEYS.dashboard(days),
    queryFn: async (): Promise<OptimizedDashboardMetrics | null> => {
      try {
        const response = await apiClient.get<ApiResponse<OptimizedDashboardMetrics>>(
          '/analytics/dashboard',
          { params: { days } }
        );
        
        if (process.env.NODE_ENV === 'development' && response.data._meta) {
          console.log(`📊 Dashboard API response time: ${response.data._meta.responseTimeMs}ms`);
        }
        
        return response.data.data;
      } catch (error: any) {
        console.error('[useOptimizedDashboard] Error:', error.message);
        return null;
      }
    },
    staleTime: 60 * 1000, // 60 seconds - matches backend cache TTL
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook for fetching optimized project dashboard metrics
 * PRD: Cache-first with 120s TTL
 */
export function useOptimizedProjectDashboard(projectId: string) {
  return useQuery({
    queryKey: OPTIMIZED_ANALYTICS_KEYS.project(projectId),
    queryFn: async (): Promise<ProjectDashboardMetrics | null> => {
      try {
        const response = await apiClient.get<ApiResponse<ProjectDashboardMetrics>>(
          `/analytics/project/${projectId}`
        );
        
        if (process.env.NODE_ENV === 'development' && response.data._meta) {
          console.log(`📊 Project Dashboard API response time: ${response.data._meta.responseTimeMs}ms`);
        }
        
        return response.data.data;
      } catch (error: any) {
        console.error('[useOptimizedProjectDashboard] Error:', error.message);
        return null;
      }
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 120 seconds - matches backend cache TTL
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export function useProjectDeepAnalytics(projectId: string, days: number = 30) {
  return useQuery({
    queryKey: OPTIMIZED_ANALYTICS_KEYS.projectDeep(projectId, days),
    queryFn: async (): Promise<ProjectDeepAnalytics | null> => {
      try {
        const response = await apiClient.get<ApiResponse<ProjectDeepAnalytics>>(
          `/analytics/project/${projectId}/deep`,
          { params: { days } }
        );
        return response.data.data;
      } catch (error: any) {
        console.error('[useProjectDeepAnalytics] Error:', error.message);
        return null;
      }
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook for fetching optimized sprint dashboard metrics
 * PRD: Cache-first with 120s TTL
 */
export function useOptimizedSprintDashboard(sprintId: string) {
  return useQuery({
    queryKey: OPTIMIZED_ANALYTICS_KEYS.sprint(sprintId),
    queryFn: async (): Promise<SprintDashboardMetrics | null> => {
      try {
        const response = await apiClient.get<ApiResponse<SprintDashboardMetrics>>(
          `/analytics/sprint/${sprintId}`
        );
        
        if (process.env.NODE_ENV === 'development' && response.data._meta) {
          console.log(`📊 Sprint Dashboard API response time: ${response.data._meta.responseTimeMs}ms`);
        }
        
        return response.data.data;
      } catch (error: any) {
        console.error('[useOptimizedSprintDashboard] Error:', error.message);
        return null;
      }
    },
    enabled: !!sprintId,
    staleTime: 2 * 60 * 1000, // 120 seconds
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export function useSprintContributionAnalytics(sprintId: string, days: number = 30) {
  return useQuery({
    queryKey: OPTIMIZED_ANALYTICS_KEYS.sprintContributions(sprintId, days),
    queryFn: async (): Promise<SprintContributionAnalytics | null> => {
      try {
        const response = await apiClient.get<ApiResponse<SprintContributionAnalytics>>(
          `/analytics/sprint/${sprintId}/contributions`,
          { params: { days } }
        );
        return response.data.data;
      } catch (error: any) {
        console.error('[useSprintContributionAnalytics] Error:', error.message);
        return null;
      }
    },
    enabled: !!sprintId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook for fetching optimized employee dashboard metrics
 * PRD: Cache-first with 120s TTL
 */
export function useOptimizedEmployeeDashboard(employeeId: string, days: number = 30) {
  return useQuery({
    queryKey: OPTIMIZED_ANALYTICS_KEYS.employee(employeeId, days),
    queryFn: async (): Promise<EmployeeDashboardMetrics | null> => {
      try {
        const response = await apiClient.get<ApiResponse<EmployeeDashboardMetrics>>(
          `/analytics/employee/${employeeId}`,
          { params: { days } }
        );
        
        if (process.env.NODE_ENV === 'development' && response.data._meta) {
          console.log(`📊 Employee Dashboard API response time: ${response.data._meta.responseTimeMs}ms`);
        }
        
        return response.data.data;
      } catch (error: any) {
        console.error('[useOptimizedEmployeeDashboard] Error:', error.message);
        return null;
      }
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 120 seconds
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export function useEmployeeTaskAnalytics(
  employeeId: string,
  params: { days?: number; projectId?: string; sprintId?: string; page?: number; pageSize?: number } = {}
) {
  return useQuery({
    queryKey: OPTIMIZED_ANALYTICS_KEYS.employeeTasks(employeeId, params),
    queryFn: async (): Promise<EmployeeTaskAnalytics | null> => {
      try {
        const response = await apiClient.get<ApiResponse<EmployeeTaskAnalytics>>(
          `/analytics/employee/${employeeId}/tasks`,
          { params }
        );
        return response.data.data;
      } catch (error: any) {
        console.error('[useEmployeeTaskAnalytics] Error:', error.message);
        return null;
      }
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// ==================== REALTIME UPDATES ====================

/**
 * Hook for subscribing to real-time analytics updates via WebSocket
 * PRD: Lightweight signal-based updates
 */
export function useAnalyticsRealtime() {
  const queryClient = useQueryClient();
  
  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: OPTIMIZED_ANALYTICS_KEYS.dashboard() });
  }, [queryClient]);
  
  const invalidateProject = useCallback((projectId: string) => {
    queryClient.invalidateQueries({ queryKey: OPTIMIZED_ANALYTICS_KEYS.project(projectId) });
  }, [queryClient]);
  
  const invalidateSprint = useCallback((sprintId: string) => {
    queryClient.invalidateQueries({ queryKey: OPTIMIZED_ANALYTICS_KEYS.sprint(sprintId) });
  }, [queryClient]);
  
  const invalidateEmployee = useCallback((employeeId: string) => {
    queryClient.invalidateQueries({ queryKey: OPTIMIZED_ANALYTICS_KEYS.employee(employeeId) });
  }, [queryClient]);
  
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: OPTIMIZED_ANALYTICS_KEYS.all });
  }, [queryClient]);
  
  // WebSocket listener effect (placeholder - integrate with existing socket service)
  useEffect(() => {
    // Import socket service and subscribe to analytics updates
    // Example:
    // socketService.on('analytics:update', (data) => {
    //   if (data.type === 'org') invalidateDashboard();
    //   if (data.type === 'project') invalidateProject(data.projectId);
    //   // etc.
    // });
    
    // Cleanup
    return () => {
      // socketService.off('analytics:update');
    };
  }, [invalidateDashboard, invalidateProject, invalidateSprint, invalidateEmployee]);
  
  return {
    invalidateDashboard,
    invalidateProject,
    invalidateSprint,
    invalidateEmployee,
    invalidateAll,
  };
}

// ==================== UTILITY HOOKS ====================

/**
 * Combined hook for dashboard with employee metrics
 * Useful for personal dashboard views
 */
export function usePersonalDashboardMetrics(employeeId: string, days: number = 30) {
  const dashboardQuery = useOptimizedDashboard(days);
  const employeeQuery = useOptimizedEmployeeDashboard(employeeId, days);
  
  return {
    dashboard: dashboardQuery.data,
    employee: employeeQuery.data,
    isLoading: dashboardQuery.isLoading || employeeQuery.isLoading,
    isError: dashboardQuery.isError || employeeQuery.isError,
    error: dashboardQuery.error || employeeQuery.error,
    refetch: () => {
      dashboardQuery.refetch();
      employeeQuery.refetch();
    },
  };
}

/**
 * Hook for sprint analytics with project context
 */
export function useSprintWithProjectMetrics(sprintId: string, projectId: string) {
  const sprintQuery = useOptimizedSprintDashboard(sprintId);
  const projectQuery = useOptimizedProjectDashboard(projectId);
  
  return {
    sprint: sprintQuery.data,
    project: projectQuery.data,
    isLoading: sprintQuery.isLoading || projectQuery.isLoading,
    isError: sprintQuery.isError || projectQuery.isError,
    error: sprintQuery.error || projectQuery.error,
    refetch: () => {
      sprintQuery.refetch();
      projectQuery.refetch();
    },
  };
}
