import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { bffGet, bffPost } from '@/lib/bff-api-client';

/**
 * AI summary hooks — calls `/api/v1/ai/*` via `bffGet` / `bffPost` with
 * `credentials: 'include'` so the Better Auth session cookie (API origin) is sent.
 */

export interface AISummaryRequest {
  prompt: string;
  timeRange?: {
    preset?: 'last_week' | 'last_month' | 'current_sprint';
    start?: string;
    end?: string;
  };
  filters?: {
    projectIds?: string[];
    teamMemberIds?: string[];
    taskStatuses?: string[];
  };
  template?:
    | 'weekly_summary'
    | 'monthly_summary'
    | 'sprint_summary'
    | 'bottleneck_detection'
    | 'top_performers'
    | 'bottom_performers'
    | 'workload_balance'
    | 'deadline_risk'
    | 'team_health'
    | 'founder_snapshot'
    | 'hr_delivery_review'
    | 'leadership_digest'
    | 'custom';
}

export interface AISummaryResponse {
  summary: string;
  metadata: {
    taskCount: number;
    generationTime: number;
    model: string;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
    cacheHit: boolean;
  };
}

/**
 * Hook for generating team summaries.
 * Uses bffPost / bffGet with credentials included.
 */
export function useAISummary() {
  const [summary, setSummary] = useState<AISummaryResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (request: AISummaryRequest) => {
      const result = await bffPost<AISummaryResponse>('/ai/team-summary', request);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate summary');
      }

      return result.data!;
    },
    onSuccess: (data) => {
      setSummary(data);
      console.log('Insights summary generated successfully');
    },
    onError: (error: Error) => {
      console.error('Insights summary error:', error);
      console.error('Failed to generate summary:', error.message);
    },
  });

  const generate = (request: AISummaryRequest) => {
    mutation.mutate(request);
  };

  const reset = () => {
    setSummary(null);
    mutation.reset();
  };

  return {
    summary,
    generate,
    reset,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

/**
 * Hook for fetching summary history.
 * Uses BFF proxy for secure authentication.
 */
export function useAISummaryHistory(scope: 'user' | 'organization' = 'user', limit: number = 20) {
  return useQuery({
    queryKey: ['ai-summaries', scope, limit],
    queryFn: async () => {
      const result = await bffGet<any>(`/ai/summary-history?scope=${scope}&limit=${limit}`);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch summary history');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for submitting feedback on summaries.
 * Uses bffPost / bffGet with credentials included.
 */
export function useAISummaryFeedback() {
  return useMutation({
    mutationFn: async ({
      summaryId,
      quality,
      note,
    }: {
      summaryId: string;
      quality: 'good' | 'neutral' | 'poor';
      note?: string;
    }) => {
      const result = await bffPost('/ai/feedback', { summaryId, quality, note });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      return result.data;
    },
    onSuccess: () => {
      console.log('Thank you for your feedback!');
    },
    onError: (error: Error) => {
      console.error('Failed to submit feedback:', error.message);
    },
  });
}

/**
 * Hook for fetching summary templates.
 * Uses BFF proxy for secure authentication.
 */
export function useAISummaryTemplates() {
  return useQuery({
    queryKey: ['ai-templates'],
    queryFn: async () => {
      const result = await bffGet<any>('/ai/templates');

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch templates');
      }

      return result.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - templates rarely change
  });
}
