/**
 * Organization-Scoped API Hook
 * 
 * Provides API methods that automatically scope requests to the current organization.
 * Uses the organization context to prefix API paths with the org slug.
 */

import { useCallback, useMemo } from 'react';
import { useOrganization } from '@/lib/contexts/organization-context';
import { apiClient } from '@/lib/api';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Hook that provides org-scoped API methods
 */
export function useOrgApi() {
  const { orgSlug, isValidOrg, getOrgApiPath } = useOrganization();

  /**
   * Make a GET request to an org-scoped endpoint
   */
  const get = useCallback(async <T = any>(
    path: string, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    if (!isValidOrg || !orgSlug) {
      throw new Error('Organization context required for org-scoped API calls');
    }
    const orgPath = getOrgApiPath(path);
    return apiClient.get<T>(orgPath, config);
  }, [orgSlug, isValidOrg, getOrgApiPath]);

  /**
   * Make a POST request to an org-scoped endpoint
   */
  const post = useCallback(async <T = any>(
    path: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    if (!isValidOrg || !orgSlug) {
      throw new Error('Organization context required for org-scoped API calls');
    }
    const orgPath = getOrgApiPath(path);
    return apiClient.post<T>(orgPath, data, config);
  }, [orgSlug, isValidOrg, getOrgApiPath]);

  /**
   * Make a PUT request to an org-scoped endpoint
   */
  const put = useCallback(async <T = any>(
    path: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    if (!isValidOrg || !orgSlug) {
      throw new Error('Organization context required for org-scoped API calls');
    }
    const orgPath = getOrgApiPath(path);
    return apiClient.put<T>(orgPath, data, config);
  }, [orgSlug, isValidOrg, getOrgApiPath]);

  /**
   * Make a PATCH request to an org-scoped endpoint
   */
  const patch = useCallback(async <T = any>(
    path: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    if (!isValidOrg || !orgSlug) {
      throw new Error('Organization context required for org-scoped API calls');
    }
    const orgPath = getOrgApiPath(path);
    return apiClient.patch<T>(orgPath, data, config);
  }, [orgSlug, isValidOrg, getOrgApiPath]);

  /**
   * Make a DELETE request to an org-scoped endpoint
   */
  const del = useCallback(async <T = any>(
    path: string, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    if (!isValidOrg || !orgSlug) {
      throw new Error('Organization context required for org-scoped API calls');
    }
    const orgPath = getOrgApiPath(path);
    return apiClient.delete<T>(orgPath, config);
  }, [orgSlug, isValidOrg, getOrgApiPath]);

  return useMemo(() => ({
    get,
    post,
    put,
    patch,
    delete: del,
    isReady: isValidOrg && !!orgSlug,
    orgSlug,
  }), [get, post, put, patch, del, isValidOrg, orgSlug]);
}

/**
 * Org-scoped data fetching hooks factory
 * Creates standardized hooks for fetching org-scoped data
 */
export function createOrgDataHook<T>(
  endpoint: string,
  options?: {
    transform?: (data: any) => T;
    enabled?: boolean;
  }
) {
  return function useOrgData() {
    const { get, isReady } = useOrgApi();
    
    // This would integrate with React Query for caching
    // For now, returns the basic structure
    return {
      fetch: async () => {
        if (!isReady) return null;
        const response = await get<{ success: boolean; data: T }>(endpoint);
        const data = response.data?.data;
        return options?.transform ? options.transform(data) : data;
      },
      isReady,
    };
  };
}

// Pre-built org-scoped data hooks
export const useOrgProjects = createOrgDataHook('/projects');
export const useOrgTasks = createOrgDataHook('/tasks');
export const useOrgSprints = createOrgDataHook('/sprints');
export const useOrgEmployees = createOrgDataHook('/employees');
export const useOrgDashboard = createOrgDataHook('/dashboard');

export default useOrgApi;

