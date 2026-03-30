import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface AssignRoleParams {
  taskId: string;
  role: 'reviewer' | 'tester';
  assigneeId: string | null;
  reason?: string;
}

interface AssignRoleResponse {
  success: boolean;
  message: string;
  data: {
    task: any;
  };
}

export function useWorkflowAssignment() {
  const queryClient = useQueryClient();

  const assignRoleMutation = useMutation<AssignRoleResponse, Error, AssignRoleParams>({
    mutationFn: async ({ taskId, role, assigneeId, reason }) => {
      const response = await apiClient.put(`/tasks/${taskId}/assign-role`, {
        role,
        assigneeId,
        reason
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch task queries
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-tasks'] });
      
      console.log(`✅ ${variables.role} assignment successful:`, data.message);
    },
    onError: (error, variables) => {
      console.error(`❌ Failed to assign ${variables.role}:`, error);
    }
  });

  return {
    assignRole: assignRoleMutation.mutateAsync,
    isAssigning: assignRoleMutation.isPending,
    error: assignRoleMutation.error
  };
}
