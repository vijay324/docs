import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api';
import { Organization } from '@/types';
import { API_ENDPOINTS } from '@/utils/constants';

// Query Keys
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
};

// Hooks
export function useOrganization(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id));
      return response.data.data.organization as Organization;
    },
    enabled: !!id && (options?.enabled !== false),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

