import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, type QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  usePersonalAnalytics,
  useTeamAnalytics,
  useAnalyticsSummary,
  useExportAnalytics
} from '@/use-personal-analytics';
import { apiClient } from '@/api';

// Mock the API client
jest.mock('@/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

// Mock the constants
jest.mock('@/utils/constants', () => ({
  API_ENDPOINTS: {
    ANALYTICS: {
      PERSONAL: '/analytics/personal',
      TEAM: '/analytics/team',
      SUMMARY: '/analytics/summary',
      COMPARISON: '/analytics/comparison',
      EXPORT: '/analytics/export',
    },
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePersonalAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches personal analytics data successfully', async () => {
    const mockData = {
      success: true,
      data: {
        overview: {
          totalTasks: 25,
          completedTasks: 20,
          inProgressTasks: 3,
          overdueTasks: 2,
          completionRate: 80,
          averageTaskDuration: 48,
          productivityScore: 85,
        },
        rolePerformance: {
          asAssignee: { totalTasks: 15, completedTasks: 12, averageCompletionTime: 36, onTimeCompletionRate: 80 },
          asReviewer: { totalTasks: 8, reviewedTasks: 7, averageReviewTime: 12, approvalRate: 87 },
          asTester: { totalTasks: 5, testedTasks: 4, averageTestTime: 8, passRate: 80 },
        },
        workflowMetrics: {
          averageTimeInStages: { 'To Do': 2, 'In Progress': 24, 'Review': 8, 'Testing': 4 },
          stageBottlenecks: ['In Progress'],
          workflowEfficiency: 75,
        },
        timeAnalysis: {
          dailyProductivity: [],
          weeklyTrends: [],
          monthlyComparison: [],
        },
        taskDistribution: {
          byPriority: { High: 10, Medium: 8, Low: 7 },
          byType: { Story: 15, Bug: 5, Task: 5 },
          byStatus: { Done: 20, 'In Progress': 3, 'To Do': 2 },
          byProject: [],
        },
        qualityMetrics: {
          reworkRate: 10,
          defectRate: 5,
          firstTimeRightRate: 90,
          customerSatisfaction: 85,
        },
        trends: {
          completionTrend: [],
          velocityTrend: [],
          burndownData: [],
        },
      },
    };

    mockApiClient.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => usePersonalAnalytics('30d'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData.data);
    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/personal', {
      params: { timeRange: '30d' },
    });
  });

  it('handles API errors correctly', async () => {
    const errorResponse = {
      response: {
        status: 500,
        data: { error: 'Internal server error' },
      },
    };

    mockApiClient.get.mockRejectedValueOnce(errorResponse);

    const { result } = renderHook(() => usePersonalAnalytics('30d'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe(
      'Analytics service is temporarily unavailable. Please try again later.'
    );
  });

  it('handles authentication errors', async () => {
    const authError = {
      response: {
        status: 401,
        data: { error: 'Unauthorized' },
      },
    };

    mockApiClient.get.mockRejectedValueOnce(authError);

    const { result } = renderHook(() => usePersonalAnalytics('30d'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe(
      'Authentication required. Please sign in again.'
    );
  });

  it('handles permission errors', async () => {
    const permissionError = {
      response: {
        status: 403,
        data: { error: 'Forbidden' },
      },
    };

    mockApiClient.get.mockRejectedValueOnce(permissionError);

    const { result } = renderHook(() => usePersonalAnalytics('30d'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe(
      'You do not have permission to view analytics data.'
    );
  });

  it('handles network errors', async () => {
    const networkError = {
      code: 'NETWORK_ERROR',
      message: 'Network Error',
    };

    mockApiClient.get.mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => usePersonalAnalytics('30d'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe(
      'Unable to connect to analytics service. Please check your internet connection.'
    );
  });

  it('includes project filter when provided', async () => {
    const mockData = { success: true, data: {} };
    mockApiClient.get.mockResolvedValueOnce({ data: mockData });

    const projectId = '507f1f77bcf86cd799439011';
    renderHook(() => usePersonalAnalytics('30d', projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/personal', {
        params: { timeRange: '30d', projectId },
      });
    });
  });

  it('includes date range when provided', async () => {
    const mockData = { success: true, data: {} };
    mockApiClient.get.mockResolvedValueOnce({ data: mockData });

    const startDate = '2024-01-01';
    const endDate = '2024-01-31';
    renderHook(() => usePersonalAnalytics('30d', undefined, startDate, endDate), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/personal', {
        params: { timeRange: '30d', startDate, endDate },
      });
    });
  });
});

describe('useTeamAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches team analytics data successfully', async () => {
    const mockData = {
      success: true,
      data: {
        teamOverview: {
          totalMembers: 10,
          activeMembers: 8,
          totalTasks: 100,
          completedTasks: 75,
          teamProductivity: 85,
          averageVelocity: 25,
        },
        memberPerformance: [],
        workflowAnalysis: {
          bottlenecks: [],
          efficiency: 80,
          throughput: 15,
          cycleTime: 48,
        },
        projectComparison: [],
        sprintAnalysis: {
          completedSprints: 5,
          averageVelocity: 25,
          velocityTrend: [],
          burndownAccuracy: 85,
        },
      },
    };

    mockApiClient.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useTeamAnalytics('30d'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData.data);
    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/team', {
      params: { timeRange: '30d' },
    });
  });

  it('handles admin permission errors', async () => {
    const permissionError = {
      response: {
        status: 403,
        data: { error: 'Admin access required' },
      },
    };

    mockApiClient.get.mockRejectedValueOnce(permissionError);

    const { result } = renderHook(() => useTeamAnalytics('30d'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe(
      'Admin access required to view team analytics.'
    );
  });
});

describe('useAnalyticsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches analytics summary successfully', async () => {
    const mockData = {
      success: true,
      data: {
        overview: { totalTasks: 25, completedTasks: 20, completionRate: 80 },
        productivity: { score: 85, trend: [], completionRate: 80 },
        workflowEfficiency: 75,
        recentTrends: { completion: [], velocity: [] },
        rolePerformance: {},
        bottlenecks: ['In Progress'],
      },
    };

    mockApiClient.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useAnalyticsSummary('30d'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData.data);
    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/summary', {
      params: { timeRange: '30d' },
    });
  });
});

describe('useExportAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock DOM methods
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: jest.fn(() => 'mock-url'),
        revokeObjectURL: jest.fn(),
      },
    });
    
    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
  });

  it('exports analytics data as JSON', async () => {
    const mockData = { success: true, data: { analytics: 'data' } };
    mockApiClient.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useExportAnalytics(), {
      wrapper: createWrapper(),
    });

    await result.current.exportAnalytics('json', '30d');

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/export', {
      params: { format: 'json', timeRange: '30d' },
      responseType: 'json',
    });
  });

  it('exports analytics data as CSV', async () => {
    const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
    mockApiClient.get.mockResolvedValueOnce({ data: mockBlob });

    const { result } = renderHook(() => useExportAnalytics(), {
      wrapper: createWrapper(),
    });

    await result.current.exportAnalytics('csv', '30d');

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/export', {
      params: { format: 'csv', timeRange: '30d' },
      responseType: 'blob',
    });
  });

  it('includes project filter in export', async () => {
    const mockData = { success: true, data: {} };
    mockApiClient.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useExportAnalytics(), {
      wrapper: createWrapper(),
    });

    const projectId = '507f1f77bcf86cd799439011';
    await result.current.exportAnalytics('json', '30d', projectId);

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/export', {
      params: { format: 'json', timeRange: '30d', projectId },
      responseType: 'json',
    });
  });
});
