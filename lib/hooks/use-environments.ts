import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

import { errorHandler } from '@/lib/error-handler';

// Types for environment management
export interface Codebase {
  _id: string;
  projectId: string;
  name: string;
  description: string;
  type: 'Backend' | 'Frontend' | 'Mobile' | 'Database' | 'DevOps' | 'API' | 'Custom';
  icon?: string;
  color?: string;
  isActive: boolean;
  createdBy: string;
  workspaceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  _id: string;
  categoryId: string;
  projectId: string;
  name: string;
  description: string;
  type: 'Production' | 'Development' | 'Staging' | 'Testing' | 'Custom';
  status: 'Active' | 'Inactive' | 'Maintenance';
  url?: string;
  branch?: string;
  deploymentInfo?: {
    provider?: string;
    region?: string;
    lastDeployment?: Date;
    deploymentStatus?: 'Success' | 'Failed' | 'Pending' | 'Unknown';
  };
  isActive: boolean;
  createdBy: string;
  environmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentConfig {
  _id: string;
  workspaceId: string;
  projectId: string;
  categoryId: string;
  name: string;
  description: string;
  content: string; // Decrypted .env file content
  version: number;
  isActive: boolean;
  createdBy: string;
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

// Query Keys
export const environmentKeys = {
  all: ['environments'] as const,
  
  // Codebases
  codebases: (projectId: string) => [...environmentKeys.all, 'codebases', projectId] as const,
  
  // Workspaces
  workspaces: (projectId: string, categoryId: string) => 
    [...environmentKeys.all, 'workspaces', projectId, categoryId] as const,
  
  // Environment configs
  configs: (projectId: string, workspaceId: string) => 
    [...environmentKeys.all, 'configs', projectId, workspaceId] as const,
};

// =============================================================================
// CODEBASE HOOKS
// =============================================================================

export function useCodebases(projectId: string) {
  return useQuery({
    queryKey: environmentKeys.codebases(projectId),
    queryFn: async () => {
      const response = await apiClient.get(`/projects/${projectId}/environments/categories`);
      return response.data.data.codebases as Codebase[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCodebase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: Partial<Codebase> }) => {
      // Validate projectId before making API call
      if (!projectId || typeof projectId !== 'string') {
        throw new Error('Invalid project ID: must be a non-empty string');
      }

      if (projectId === 'undefined' || projectId === 'null' || projectId.trim() === '') {
        throw new Error('Invalid project ID: cannot be "undefined", "null", or empty');
      }

      if (projectId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(projectId)) {
        throw new Error(`Invalid project ID format: must be a 24-character MongoDB ObjectId (received: ${projectId})`);
      }

      const url = `/projects/${projectId}/environments/categories`;
      console.log('🔍 Frontend API Call Debug:', {
        projectId,
        projectIdType: typeof projectId,
        projectIdLength: projectId?.length,
        isValidObjectId: /^[0-9a-fA-F]{24}$/.test(projectId),
        url,
        data,
        timestamp: new Date().toISOString()
      });

      const response = await apiClient.post(url, data);
      console.log('✅ Codebase created successfully:', {
        codebaseId: response.data.data.codebase._id,
        codebaseName: response.data.data.codebase.name,
        timestamp: new Date().toISOString()
      });
      return response.data.data.codebase as Codebase;
    },
    onSuccess: (codebase, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.codebases(projectId) });
      console.log('Codebase created successfully!', codebase.name);
    },
    onError: (error: any) => {
      console.error('❌ Codebase creation error:', {
        error,
        errorMessage: error?.response?.data?.error || error?.message,
        statusCode: error?.response?.status,
        details: error?.response?.data,
        timestamp: new Date().toISOString()
      });
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Codebase Creation');
      // toast.error("Codebase creation failed", { description: appError.message });
      console.error('Codebase creation failed:', appError.message);
    },
  });
}

export function useUpdateCodebase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      categoryId, 
      data 
    }: { 
      projectId: string; 
      categoryId: string; 
      data: Partial<Codebase> 
    }) => {
      const response = await apiClient.put(
        `/projects/${projectId}/environments/categories/${categoryId}`, 
        data
      );
      return response.data.data.codebase as Codebase;
    },
    onSuccess: (codebase, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.codebases(projectId) });
      console.log('Codebase updated successfully!', codebase.name);
    },
    onError: (error: any) => {
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Codebase Update');
      // toast.error("Codebase update failed", { description: appError.message });
      console.error('Codebase update failed:', appError.message);
    },
  });
}

export function useDeleteCodebase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, categoryId }: { projectId: string; categoryId: string }) => {
      await apiClient.delete(`/projects/${projectId}/environments/categories/${categoryId}`);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.codebases(projectId) });
      console.log('Codebase deleted successfully!');
    },
    onError: (error: any) => {
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Codebase Deletion');
      // toast.error("Codebase deletion failed", { description: appError.message });
      console.error('Codebase deletion failed:', appError.message);
    },
  });
}

// =============================================================================
// WORKSPACE HOOKS
// =============================================================================

export function useWorkspaces(projectId: string, categoryId: string) {
  return useQuery({
    queryKey: environmentKeys.workspaces(projectId, categoryId),
    queryFn: async () => {
      const response = await apiClient.get(
        `/projects/${projectId}/environments/categories/${categoryId}/workspaces`
      );
      return response.data.data.workspaces as Workspace[];
    },
    enabled: !!projectId && !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      categoryId, 
      data 
    }: { 
      projectId: string; 
      categoryId: string; 
      data: Partial<Workspace> 
    }) => {
      const response = await apiClient.post(
        `/projects/${projectId}/environments/categories/${categoryId}/workspaces`, 
        data
      );
      return response.data.data.workspace as Workspace;
    },
    onSuccess: (workspace, { projectId, categoryId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.workspaces(projectId, categoryId) });
      console.log('Workspace created successfully!', workspace.name);
    },
    onError: (error: any) => {
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Workspace Creation');
      // toast.error("Workspace creation failed", { description: appError.message });
      console.error('Workspace creation failed:', appError.message);
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      categoryId, 
      workspaceId, 
      data 
    }: { 
      projectId: string; 
      categoryId: string; 
      workspaceId: string; 
      data: Partial<Workspace> 
    }) => {
      // Validate IDs before making API call
      const isValidObjectId = (id: string | undefined | null): id is string => {
        return !!id && typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
      };
      
      console.log('🔍 useUpdateWorkspace - ID Validation:', {
        projectId,
        projectIdType: typeof projectId,
        projectIdValue: projectId,
        categoryId,
        categoryIdType: typeof categoryId,
        categoryIdValue: categoryId,
        workspaceId,
        workspaceIdType: typeof workspaceId,
        workspaceIdValue: workspaceId,
        isValidProjectId: isValidObjectId(projectId),
        isValidCategoryId: isValidObjectId(categoryId),
        isValidWorkspaceId: isValidObjectId(workspaceId),
        timestamp: new Date().toISOString()
      });

      if (!projectId) {
        throw new Error('Project ID is missing or undefined');
      }

      if (!isValidObjectId(projectId)) {
        throw new Error(`Invalid project ID format: must be a 24-character MongoDB ObjectId (received: "${projectId}" of type ${typeof projectId})`);
      }

      if (!categoryId) {
        throw new Error('Codebase ID is missing or undefined');
      }

      if (!isValidObjectId(categoryId)) {
        throw new Error(`Invalid codebase ID format: must be a 24-character MongoDB ObjectId (received: "${categoryId}" of type ${typeof categoryId})`);
      }

      if (!workspaceId) {
        throw new Error('Workspace ID is missing or undefined');
      }

      if (!isValidObjectId(workspaceId)) {
        throw new Error(`Invalid workspace ID format: must be a 24-character MongoDB ObjectId (received: "${workspaceId}" of type ${typeof workspaceId})`);
      }

      const url = `/projects/${projectId}/environments/categories/${categoryId}/workspaces/${workspaceId}`;
      console.log('🔍 useUpdateWorkspace - API Call:', {
        url,
        data,
        timestamp: new Date().toISOString()
      });

      const response = await apiClient.put(url, data);
      return response.data.data.workspace as Workspace;
    },
    onSuccess: (workspace, { projectId, categoryId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.workspaces(projectId, categoryId) });
      console.log('Workspace updated successfully!', workspace.name);
    },
    onError: (error: any) => {
      console.error('❌ Workspace update error:', {
        error,
        errorMessage: error?.response?.data?.error || error?.message,
        statusCode: error?.response?.status,
        details: error?.response?.data,
        timestamp: new Date().toISOString()
      });
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Workspace Update');
      // toast.error("Workspace update failed", { description: appError.message });
      console.error('Workspace update failed:', appError.message);
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      categoryId, 
      workspaceId 
    }: { 
      projectId: string; 
      categoryId: string; 
      workspaceId: string 
    }) => {
      await apiClient.delete(
        `/projects/${projectId}/environments/categories/${categoryId}/workspaces/${workspaceId}`
      );
    },
    onSuccess: (_, { projectId, categoryId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.workspaces(projectId, categoryId) });
      console.log('Workspace deleted successfully!');
    },
    onError: (error: any) => {
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Workspace Deletion');
      // toast.error("Workspace deletion failed", { description: appError.message });
      console.error('Workspace deletion failed:', appError.message);
    },
  });
}

// =============================================================================
// ENVIRONMENT CONFIGURATION HOOKS
// =============================================================================

export function useEnvironmentConfig(projectId: string, workspaceId: string) {
  return useQuery({
    queryKey: environmentKeys.configs(projectId, workspaceId),
    queryFn: async () => {
      const response = await apiClient.get(
        `/projects/${projectId}/environments/workspaces/${workspaceId}/config`
      );
      return response.data.data.config as EnvironmentConfig | null;
    },
    enabled: !!projectId && !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateOrUpdateEnvironmentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      workspaceId,
      data
    }: {
      projectId: string;
      workspaceId: string;
      data: {
        name?: string;
        description?: string;
        content: string; // .env file content
      }
    }) => {
      const response = await apiClient.post(
        `/projects/${projectId}/environments/workspaces/${workspaceId}/config`,
        data
      );
      return response.data.data.config as EnvironmentConfig;
    },
    onSuccess: (config, { projectId, workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.configs(projectId, workspaceId) });
      console.log('Environment configuration saved successfully!', config.name);
    },
    onError: (error: any) => {
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Configuration Save');
      // toast.error("Configuration save failed", { description: appError.message });
      console.error('Configuration save failed:', appError.message);
    },
  });
}


export function useDownloadEnvFile() {
  return useMutation({
    mutationFn: async ({
      projectId,
      workspaceId
    }: {
      projectId: string;
      workspaceId: string
    }) => {
      const response = await apiClient.get(
        `/projects/${projectId}/environments/workspaces/${workspaceId}/config/download`
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Create and download the file
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'environment.env';
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);

      console.log('Environment file downloaded successfully!');
    },
    onError: (error: any) => {
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'File Download');
      // toast.error("File download failed", { description: appError.message });
      console.error('File download failed:', appError.message);
    },
  });
}

export function useDeleteEnvironmentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      workspaceId
    }: {
      projectId: string;
      workspaceId: string
    }) => {
      await apiClient.delete(
        `/projects/${projectId}/environments/workspaces/${workspaceId}/config`
      );
    },
    onSuccess: (_, { projectId, workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.configs(projectId, workspaceId) });
      console.log('Environment configuration deleted successfully!');
    },
    onError: (error: any) => {
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Configuration Deletion');
      // toast.error("Configuration deletion failed", { description: appError.message });
      console.error('Configuration deletion failed:', appError.message);
    },
  });
}

export function useCreateCodebaseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: Partial<Codebase> }) => {
      // Validate projectId before making API call
      if (!projectId || typeof projectId !== 'string') {
        throw new Error('Invalid project ID: must be a non-empty string');
      }

      if (projectId === 'undefined' || projectId === 'null' || projectId.trim() === '') {
        throw new Error('Invalid project ID: cannot be "undefined", "null", or empty');
      }

      if (projectId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(projectId)) {
        throw new Error(`Invalid project ID format: must be a 24-character MongoDB ObjectId (received: ${projectId})`);
      }

      const url = `/projects/${projectId}/environments/categories`;
      console.log('🔍 Frontend API Call Debug:', {
        projectId,
        projectIdType: typeof projectId,
        projectIdLength: projectId?.length,
        isValidObjectId: /^[0-9a-fA-F]{24}$/.test(projectId),
        url,
        data,
        timestamp: new Date().toISOString()
      });

      const response = await apiClient.post(url, data);
      console.log('✅ Codebase created successfully:', {
        codebaseId: response.data.data.codebase._id,
        codebaseName: response.data.data.codebase.name,
        timestamp: new Date().toISOString()
      });
      return response.data.data.codebase as Codebase;
    },
    onSuccess: (codebase, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.codebases(projectId) });
      console.log('Codebase created successfully!', codebase.name);
    },
    onError: (error: any) => {
      console.error('❌ Codebase creation error:', {
        error,
        errorMessage: error?.response?.data?.error || error?.message,
        statusCode: error?.response?.status,
        details: error?.response?.data,
        timestamp: new Date().toISOString()
      });
      // Use centralized error handler
      const appError = errorHandler.handleError(error, 'Codebase Creation');
      // toast.error("Codebase creation failed", { description: appError.message });
      console.error('Codebase creation failed:', appError.message);
    },
  });
}
