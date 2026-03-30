"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Project } from '@/utils/types';
import { useOrgApi } from '@/lib/hooks/use-org-api';
import { useOrganization } from '@/lib/contexts/organization-context';
import { API_ENDPOINTS } from '@/utils/constants';
import { getAutoSelectProject, setLastSelectedProject } from '@/lib/utils/favorite-projects';
import { useSocket } from '@/lib/contexts/socket-context';
import { REALTIME_EVENT_TYPES, REALTIME_VERSION, RealtimeEventEnvelope } from '@/lib/realtime/contracts';

interface CleanDashboardData {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  retryCount?: number;
}

interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalSprints: number;
  activeSprints: number;
  completionRate: number;
  recentTasks: any[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Clean dashboard hook that loads only essential data on initial load
 * - Projects list (without analytics)
 * - Current project selection (from localStorage)
 * - No API calls for tasks, sprints, or analytics
 * - Uses org-scoped APIs for multi-tenant support
 */
export function useCleanDashboard() {
  const { isValidOrg } = useOrganization();
  const orgApi = useOrgApi();
  const [data, setData] = useState<CleanDashboardData>({
    projects: [],
    currentProject: null,
    isLoading: true,
    error: null,
    retryCount: 0,
  });

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (isValidOrg && orgApi.isReady) {
      loadInitialData();
    } else if (!isValidOrg) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Organization context not available' }));
    }
  }, [isValidOrg, orgApi.isReady]);

  const loadInitialData = async (retryCount = 0) => {
    if (!orgApi.isReady) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Organization API not ready' }));
      return;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Load projects list with optimized timeout for faster loading
      // Use org-scoped API endpoint
      const timeoutDuration = 20000; // Increased to 20 seconds to prevent timeouts in slow environments
      const projectsResponse = await Promise.race([
        orgApi.get(API_ENDPOINTS.PROJECTS.BASE),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout - Please check your connection and try again')), timeoutDuration)
        )
      ]) as any;

      // Debug logging for response structure
      console.log('Projects API Response:', {
        status: projectsResponse.status,
        data: projectsResponse.data,
        dataStructure: projectsResponse.data ? Object.keys(projectsResponse.data) : 'null'
      });

      // Handle different response structures
      let projects = [];
      if (projectsResponse.data?.data?.projects) {
        projects = projectsResponse.data.data.projects;
      } else if (projectsResponse.data?.projects) {
        projects = projectsResponse.data.projects;
      } else if (Array.isArray(projectsResponse.data)) {
        projects = projectsResponse.data;
      } else {
        console.warn('Unexpected projects response structure:', projectsResponse.data);
        projects = [];
      }

      // Cache projects for offline fallback
      try {
        localStorage.setItem('cachedProjects', JSON.stringify(projects));
      } catch (e) {
        console.warn('Failed to cache projects:', e);
      }

      // Auto-select a project based on favorites, recent activity, etc.
      let currentProject = null;
      let selectedProjectId = null;

      // First try to restore from localStorage
      const storedProjectId = localStorage.getItem('currentProject');
      if (storedProjectId && projects.length > 0) {
        currentProject = projects.find((p: Project) => p._id === storedProjectId) || null;
        if (currentProject) {
          selectedProjectId = storedProjectId;
        } else {
          // Clear invalid stored project
          localStorage.removeItem('currentProject');
        }
      }

      // If no valid saved project, auto-select based on favorites/priority
      if (!currentProject && projects.length > 0) {
        currentProject = getAutoSelectProject(projects);
        if (currentProject) {
          selectedProjectId = currentProject._id;
          // Save the auto-selected project
          localStorage.setItem('currentProject', selectedProjectId);
          setLastSelectedProject(selectedProjectId);
        }
      }

      if (selectedProjectId) {
        setCurrentProjectId(selectedProjectId);
      }

      setData({
        projects,
        currentProject,
        isLoading: false,
        error: null,
      });

    } catch (error: any) {
      console.error('Error loading initial dashboard data:', error);

      // Retry logic for network errors
      if (retryCount < 2 && (error.message.includes('timeout') || error.message.includes('Network'))) {
        console.log(`Retrying dashboard load (attempt ${retryCount + 1}/3)...`);
        setData(prev => ({ ...prev, retryCount: retryCount + 1 }));
        setTimeout(() => {
          loadInitialData(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Faster retry: 1s, 2s
        return;
      }

      // After all retries failed, provide fallback data
      const fallbackProjects = [];
      try {
        const cachedProjects = localStorage.getItem('cachedProjects');
        if (cachedProjects) {
          fallbackProjects.push(...JSON.parse(cachedProjects));
        }
      } catch (e) {
        console.warn('Failed to load cached projects:', e);
      }

      setData({
        projects: fallbackProjects,
        currentProject: null,
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to load dashboard data'
      });
    }
  };

  const selectProject = (project: Project) => {
    setCurrentProjectId(project._id);
    localStorage.setItem('currentProject', project._id);
    setLastSelectedProject(project._id);
    setData(prev => ({
      ...prev,
      currentProject: project
    }));
  };

  const clearProject = () => {
    setCurrentProjectId(null);
    localStorage.removeItem('currentProject');
    setData(prev => ({
      ...prev,
      currentProject: null
    }));
  };

  const refreshProjects = () => {
    loadInitialData();
  };

  const testConnection = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      // Use org-scoped health check if available, otherwise fallback to global
      if (orgApi.isReady) {
        try {
          await orgApi.get('/health');
        } catch {
          // Fallback to global health endpoint
          const { apiClient } = await import('@/lib/api');
          await apiClient.get(API_ENDPOINTS.HEALTH);
        }
      } else {
        const { apiClient } = await import('@/lib/api');
        await apiClient.get(API_ENDPOINTS.HEALTH);
      }
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    } finally {
      setData(prev => ({ ...prev, isLoading: false }));
    }
  };

  return {
    ...data,
    currentProjectId,
    selectProject,
    clearProject,
    refreshProjects,
    testConnection,
  };
}

/**
 * Project-specific analytics hook that loads data only when triggered
 * This is called when a project is selected
 * Now includes role-based filtering: Admin sees all tasks, Employee sees personal tasks
 * Uses org-scoped APIs for multi-tenant support
 */
export function useProjectAnalytics(projectId: string | null, userRole: string = 'Employee') {
  const { isValidOrg } = useOrganization();
  const orgApi = useOrgApi();
  const [analytics, setAnalytics] = useState<ProjectAnalytics>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalSprints: 0,
    activeSprints: 0,
    completionRate: 0,
    recentTasks: [],
    isLoading: false,
    error: null,
  });

  // Simple in-memory cache for per-project analytics to speed revisits
  const analyticsCacheRef = useRef<Map<string, ProjectAnalytics>>(new Map());

  const loadProjectAnalytics = async (id: string, userRole: string = 'Employee', retryCount = 0) => {
    try {
      // Serve cached analytics instantly if available
      const cached = analyticsCacheRef.current.get(id);
      if (cached) {
        setAnalytics({ ...cached, isLoading: false, error: null });
      }

      setAnalytics(prev => ({ ...prev, isLoading: true, error: null }));

      // OPTIMIZED: Use new dedicated project analytics endpoint (org-scoped)
      // This endpoint is optimized with:
      // - Parallel queries on the server side
      // - Aggressive caching (3 minutes)
      // - Minimal data transfer
      // - Optimized database indexes
      // - Organization-scoped for multi-tenant support
      const optimizedEndpoint = `/dashboard/project-analytics/${id}`;

      // Increased timeout to 30 seconds to handle cold starts and slow networks
      const timeoutMs = 30000;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analytics request timeout')), timeoutMs)
      );

      // Use org-scoped API if available, otherwise fallback
      let response;
      if (orgApi.isReady && isValidOrg) {
        response = await Promise.race([
          orgApi.get(optimizedEndpoint),
          timeoutPromise
        ]) as any;
      } else {
        // Fallback to non-org-scoped API (for backward compatibility during migration)
        const { apiClient } = await import('@/lib/api');
        response = await Promise.race([
          apiClient.get(optimizedEndpoint),
          timeoutPromise
        ]) as any;
      }

      // Extract analytics data from optimized endpoint response
      const analyticsData = response.data?.data || {};

      const {
        totalTasks = 0,
        completedTasks = 0,
        inProgressTasks = 0,
        overdueTasks = 0,
        totalSprints = 0,
        activeSprints = 0,
        completionRate = 0,
        recentTasks = []
      } = analyticsData;

      // DEBUG: Log analytics data
      console.log('🔍 Dashboard Analytics (Optimized):', {
        projectId: id,
        endpoint: optimizedEndpoint,
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        recentTaskCount: recentTasks.length
      });

      setAnalytics({
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        totalSprints,
        activeSprints,
        completionRate,
        recentTasks,
        isLoading: false,
        error: null,
      });

      // Update cache
      analyticsCacheRef.current.set(id, {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        totalSprints,
        activeSprints,
        completionRate,
        recentTasks,
        isLoading: false,
        error: null,
      });

    } catch (error: any) {
      console.error('Error loading project analytics:', error);

      // Retry logic for analytics: allow two retries with exponential backoff on timeouts/network errors
      if (retryCount < 2 && (error.message?.includes('timeout') || error.message?.includes('Network') || error.message?.includes('too long'))) {
        const nextAttempt = retryCount + 1;
        const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s
        console.log(`Retrying analytics load (attempt ${nextAttempt}/3) after ${delay}ms...`);
        setTimeout(() => {
          loadProjectAnalytics(id, userRole, nextAttempt);
        }, delay);
        return;
      }

      setAnalytics(prev => ({
        ...prev,
        isLoading: false,
        // If only one stream failed earlier, we would not reach here.
        // At this point, both failed or repeated failures occurred.
        error: error.response?.data?.error || error.message || 'Failed to load project analytics'
      }));
    }
  };

  // Auto-load when projectId changes or org context becomes available
  useEffect(() => {
    if (projectId && isValidOrg && orgApi.isReady) {
      // Defer analytics load until after first paint for smoother UX
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => loadProjectAnalytics(projectId, userRole), { timeout: 2000 });
      } else {
        setTimeout(() => loadProjectAnalytics(projectId, userRole), 0);
      }
    } else if (!projectId) {
      // Reset analytics when no project is selected
      setAnalytics({
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        totalSprints: 0,
        activeSprints: 0,
        completionRate: 0,
        recentTasks: [],
        isLoading: false,
        error: null,
      });
    }
  }, [projectId, userRole, isValidOrg, orgApi.isReady]);

  const refreshAnalytics = () => {
    if (projectId) {
      loadProjectAnalytics(projectId, userRole);
    }
  };

  return {
    ...analytics,
    refreshAnalytics,
  };
}

/**
 * Combined hook that provides both clean dashboard and lazy project analytics
 */
export function useLazyDashboard(userRole: string = 'Employee') {
  const dashboard = useCleanDashboard();
  const analytics = useProjectAnalytics(dashboard.currentProjectId, userRole);
  const { socket, status } = useSocket();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshProjects = dashboard.refreshProjects;
  const refreshAnalyticsFn = analytics.refreshAnalytics;
  const currentProjectId = dashboard.currentProjectId;

  const scheduleRealtimeRefresh = useCallback((shouldRefreshAnalytics: boolean) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshProjects();
      if (shouldRefreshAnalytics) {
        refreshAnalyticsFn();
      }
    }, 250);
  }, [refreshProjects, refreshAnalyticsFn]);

  useEffect(() => {
    if (!socket || !status.isConnected) return;

    const handleRealtimeDashboardEvent = (event: RealtimeEventEnvelope<any>) => {
      if (!event || event.version !== REALTIME_VERSION) return;
      const affectsSelectedProject =
        !currentProjectId ||
        !event.projectId ||
        event.projectId === currentProjectId ||
        event.type === REALTIME_EVENT_TYPES.projectCreated ||
        event.type === REALTIME_EVENT_TYPES.projectDeleted;

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
          scheduleRealtimeRefresh(affectsSelectedProject);
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
  }, [socket, status.isConnected, currentProjectId, scheduleRealtimeRefresh]);

  const handleProjectSelect = (project: Project) => {
    dashboard.selectProject(project);
  };

  const handleProjectClear = () => {
    dashboard.clearProject();
  };

  return {
    // Dashboard data
    projects: dashboard.projects,
    currentProject: dashboard.currentProject,
    currentProjectId: dashboard.currentProjectId,
    isDashboardLoading: dashboard.isLoading,
    dashboardError: dashboard.error,
    retryCount: dashboard.retryCount,
    
    // Analytics data (lazy loaded)
    stats: {
      totalTasks: analytics.totalTasks,
      completedTasks: analytics.completedTasks,
      inProgressTasks: analytics.inProgressTasks,
      overdueTasks: analytics.overdueTasks,
      totalProjects: dashboard.projects.length,
      activeProjects: dashboard.projects.length,
      totalSprints: analytics.totalSprints,
      activeSprints: analytics.activeSprints,
      completionRate: analytics.completionRate,
    },
    recentTasks: analytics.recentTasks,
    isAnalyticsLoading: analytics.isLoading,
    analyticsError: analytics.error,
    
    // Actions
    selectProject: handleProjectSelect,
    clearProject: handleProjectClear,
    refreshDashboard: dashboard.refreshProjects,
    refreshAnalytics: analytics.refreshAnalytics,
  };
}
