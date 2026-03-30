import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { EntityType, FileTag } from '@/utils/file-constants';
import { downloadFileFromApi, previewFileFromApi } from '@/lib/utils/download-utils';

// File interface
export interface FileItem {
  _id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  tags: FileTag[];
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  entityType: EntityType;
  entityId: string;
  r2Key: string;
  r2Url?: string;
  downloadCount: number;
  isActive: boolean;
  uploadedAt: string;
  lastAccessedAt?: string;
  category?: string;
  humanSize?: string;
  extension?: string;
}

// Query keys
export const fileKeys = {
  all: ['files'] as const,
  entity: (entityType: EntityType, entityId: string) => 
    [...fileKeys.all, 'entity', entityType, entityId] as const,
  entityWithTags: (entityType: EntityType, entityId: string, tags?: string[]) => 
    [...fileKeys.entity(entityType, entityId), 'tags', tags] as const,
  file: (fileId: string) => [...fileKeys.all, 'file', fileId] as const,
  tags: () => [...fileKeys.all, 'tags'] as const,
};

// Get files for an entity
export function useEntityFiles(
  entityType: EntityType, 
  entityId: string, 
  options?: {
    tags?: string[];
    page?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  const { tags, page = 1, limit = 20, enabled = true } = options || {};
  
  return useQuery({
    queryKey: fileKeys.entityWithTags(entityType, entityId, tags),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (tags && tags.length > 0) {
        tags.forEach(tag => params.append('tags', tag));
      }

      const url = `/files/${entityType}/${entityId}?${params}`;

      const response = await apiClient.get(url);
      return response.data;
    },
    enabled: enabled && !!entityType && !!entityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get file metadata
export function useFile(fileId: string, enabled = true) {
  return useQuery({
    queryKey: fileKeys.file(fileId),
    queryFn: async () => {
      const response = await apiClient.get(`/files/${fileId}`);
      return response.data.data as FileItem;
    },
    enabled: enabled && !!fileId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get available file tags
export function useFileTags() {
  return useQuery({
    queryKey: fileKeys.tags(),
    queryFn: async () => {
      const response = await apiClient.get('/files/tags/list');
      return response.data.data as string[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Upload files mutation
export function useUploadFiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      files: File[];
      entityType: EntityType;
      entityId: string;
      tags: string[];
    }) => {
      const formData = new FormData();
      
      data.files.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('entityType', data.entityType);
      formData.append('entityId', data.entityId);
      formData.append('tags', JSON.stringify(data.tags));
      
      console.log('🔄 Uploading files via hook...', {
        fileCount: data.files.length,
        entityType: data.entityType,
        entityId: data.entityId,
        tags: data.tags
      });

      const response = await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Upload successful via hook:', response.data);
      
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate entity files query
      queryClient.invalidateQueries({
        queryKey: fileKeys.entity(variables.entityType, variables.entityId)
      });
      
      // Optionally update cache with new files
      const newFiles = data.data as FileItem[];
      newFiles.forEach(file => {
        queryClient.setQueryData(fileKeys.file(file._id), file);
      });
    },
  });
}

// Delete file mutation
export function useDeleteFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiClient.delete(`/files/${fileId}`);
      return response.data;
    },
    onSuccess: (data, fileId) => {
      // Remove file from cache
      queryClient.removeQueries({ queryKey: fileKeys.file(fileId) });
      
      // Invalidate all entity files queries
      queryClient.invalidateQueries({
        queryKey: fileKeys.all
      });
    },
  });
}

// Update file tags mutation
export function useUpdateFileTags() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { fileId: string; tags: string[] }) => {
      const response = await apiClient.patch(`/files/${data.fileId}/tags`, {
        tags: data.tags
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update file in cache
      queryClient.setQueryData(
        fileKeys.file(variables.fileId), 
        (oldData: FileItem | undefined) => {
          if (oldData) {
            return { ...oldData, tags: variables.tags as FileTag[] };
          }
          return oldData;
        }
      );
      
      // Invalidate entity files queries
      queryClient.invalidateQueries({
        queryKey: fileKeys.all
      });
    },
  });
}

// Download file with proper handling and toast notifications
export function useFileDownload() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      await downloadFileFromApi(fileId, {
        forceDownload: true, // Force actual download
        onError: (error) => {
          console.error('Download failed:', error);
          throw new Error(error);
        },
        onSuccess: () => {
          console.log('Download completed successfully');
        }
      });
      return { success: true };
    },
  });
}

// Preview file in browser
export function useFilePreview() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      await previewFileFromApi(fileId, {
        onError: (error) => {
          console.error('Preview failed:', error);
          throw new Error(error);
        },
        onSuccess: () => {
          console.log('Preview opened successfully');
        }
      });
      return { success: true };
    },
  });
}

// Custom hook for file operations
export function useFileOperations(entityType: EntityType, entityId: string) {
  const uploadMutation = useUploadFiles();
  const deleteMutation = useDeleteFile();
  const updateTagsMutation = useUpdateFileTags();
  const downloadMutation = useFileDownload();
  
  const uploadFiles = async (files: File[], tags: string[]) => {
    return uploadMutation.mutateAsync({
      files,
      entityType,
      entityId,
      tags
    });
  };
  
  const deleteFile = async (fileId: string) => {
    return deleteMutation.mutateAsync(fileId);
  };
  
  const updateFileTags = async (fileId: string, tags: string[]) => {
    return updateTagsMutation.mutateAsync({ fileId, tags });
  };
  
  const downloadFile = async (fileId: string) => {
    return downloadMutation.mutateAsync(fileId);
  };
  
  return {
    uploadFiles,
    deleteFile,
    updateFileTags,
    downloadFile,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingTags: updateTagsMutation.isPending,
    isDownloading: downloadMutation.isPending,
  };
}
