"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface ProductTourStatus {
  productTourCompleted: boolean;
  productTourCompletedAt: string | null;
}

/**
 * Hook to manage product tour status with backend persistence.
 * Tour completion is tied to the user account, not localStorage.
 */
export function useProductTourStatus() {
  const queryClient = useQueryClient();

  // Fetch tour status from backend
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<ProductTourStatus>({
    queryKey: ['productTourStatus'],
    queryFn: async () => {
      const response = await apiClient.get('/employees/product-tour/status');
      return response.data?.data ?? { productTourCompleted: false, productTourCompletedAt: null };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Mark tour as complete
  const completeTourMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/employees/product-tour/complete', {});
      return response.data?.data ?? { productTourCompleted: true, productTourCompletedAt: new Date().toISOString() };
    },
    onSuccess: (data) => {
      // Update cache immediately
      queryClient.setQueryData(['productTourStatus'], data);
    },
    onError: (error) => {
      console.error('Failed to mark product tour as complete:', error);
    },
  });

  return {
    isCompleted: data?.productTourCompleted ?? false,
    completedAt: data?.productTourCompletedAt ?? null,
    isLoading,
    error,
    completeTour: completeTourMutation.mutate,
    isCompletingTour: completeTourMutation.isPending,
    refetch,
  };
}
