import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';


export interface AIGenerationState {
  isGenerating: boolean;
  error: string | null;
  lastGenerated: any | null;
}

export interface TaskGenerationRequest {
  description: string;
  projectContext?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedHours?: number;
}

export interface SprintGenerationRequest {
  goal: string;
  duration?: number;
  teamSize?: number;
  projectContext?: string;
}

export interface GeneratedTaskContent {
  title?: string;
  description?: string;
  acceptanceCriteria?: string[];
  considerations?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedHours?: number;
  storyPoints?: number;
}

export interface GeneratedSprintContent {
  name?: string;
  description?: string;
  goals?: string[];
  sprintGoal?: string;
  capacity?: number;
  velocity?: number;
}

export const useAIGeneration = () => {
  const [state, setState] = useState<AIGenerationState>({
    isGenerating: false,
    error: null,
    lastGenerated: null,
  });

  const setGenerating = useCallback((isGenerating: boolean) => {
    setState(prev => ({ ...prev, isGenerating }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setLastGenerated = useCallback((content: any) => {
    setState(prev => ({ ...prev, lastGenerated: content }));
  }, []);

  const generateTask = useCallback(async (
    request: TaskGenerationRequest,
    onSuccess?: (content: GeneratedTaskContent) => void,
    onError?: (error: string) => void
  ): Promise<GeneratedTaskContent | null> => {
    try {
      setGenerating(true);
      setError(null);

      // Validate input
      if (!request.description || request.description.trim().length < 10) {
        const errorMsg = 'Please provide a description with at least 10 characters';
        setError(errorMsg);
        onError?.(errorMsg);
        // toast.error(errorMsg);
        console.error(errorMsg);
        return null;
      }

      // Clean the request to remove undefined/invalid values
      const cleanRequest = {
        description: request.description,
        ...(request.projectContext && { projectContext: request.projectContext }),
        ...(request.priority && { priority: request.priority }),
        ...(typeof request.estimatedHours === 'number' && request.estimatedHours > 0 && { estimatedHours: request.estimatedHours })
      };

      const response = await apiClient.generateTask(cleanRequest);
      
      if (response.data.success) {
        const content = response.data.data.content as GeneratedTaskContent;
        setLastGenerated(content);
        onSuccess?.(content);
        // toast.success('Task content generated successfully!');
        console.log('Task content generated successfully!');
        return content;
      } else {
        const errorMsg = response.data.error || 'Failed to generate task content';
        setError(errorMsg);
        onError?.(errorMsg);
        // toast.error(errorMsg);
        console.error(errorMsg);
        return null;
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate task content. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        // toast.error('Too many AI requests. Please wait before trying again.');
        console.error('Too many AI requests. Please wait before trying again.');
      } else if (error.response?.status === 503) {
        // toast.error('AI service is temporarily unavailable. Please try again later.');
        console.error('AI service is temporarily unavailable. Please try again later.');
      } else {
        // toast.error(errorMsg);
        console.error(errorMsg);
      }
      
      return null;
    } finally {
      setGenerating(false);
    }
  }, [setGenerating, setError, setLastGenerated]);

  const generateSprint = useCallback(async (
    request: SprintGenerationRequest,
    onSuccess?: (content: GeneratedSprintContent) => void,
    onError?: (error: string) => void
  ): Promise<GeneratedSprintContent | null> => {
    try {
      setGenerating(true);
      setError(null);

      // Validate input
      if (!request.goal || request.goal.trim().length < 10) {
        const errorMsg = 'Please provide a sprint goal with at least 10 characters';
        setError(errorMsg);
        onError?.(errorMsg);
        // toast.error(errorMsg);
        console.error(errorMsg);
        return null;
      }

      // Clean the request to remove undefined/invalid values
      const cleanRequest = {
        goal: request.goal,
        ...(request.projectContext && { projectContext: request.projectContext }),
        ...(typeof request.duration === 'number' && request.duration > 0 && { duration: request.duration }),
        ...(typeof request.teamSize === 'number' && request.teamSize > 0 && { teamSize: request.teamSize })
      };

      const response = await apiClient.generateSprint(cleanRequest);
      
      if (response.data.success) {
        const content = response.data.data.content as GeneratedSprintContent;
        setLastGenerated(content);
        onSuccess?.(content);
        // toast.success('Sprint content generated successfully!');
        console.log('Sprint content generated successfully!');
        return content;
      } else {
        const errorMsg = response.data.error || 'Failed to generate sprint content';
        setError(errorMsg);
        onError?.(errorMsg);
        // toast.error(errorMsg);
        console.error(errorMsg);
        return null;
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate sprint content. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        // toast.error('Too many AI requests. Please wait before trying again.');
        console.error('Too many AI requests. Please wait before trying again.');
      } else if (error.response?.status === 503) {
        // toast.error('AI service is temporarily unavailable. Please try again later.');
        console.error('AI service is temporarily unavailable. Please try again later.');
      } else {
        // toast.error(errorMsg);
        console.error(errorMsg);
      }
      
      return null;
    } finally {
      setGenerating(false);
    }
  }, [setGenerating, setError, setLastGenerated]);

  const generateContent = useCallback(async (
    prompt: string,
    context?: string,
    type: 'task' | 'sprint' = 'task',
    onSuccess?: (content: string) => void,
    onError?: (error: string) => void
  ): Promise<string | null> => {
    try {
      setGenerating(true);
      setError(null);

      // Validate input
      if (!prompt || prompt.trim().length < 5) {
        const errorMsg = 'Please provide a prompt with at least 5 characters';
        setError(errorMsg);
        onError?.(errorMsg);
        // toast.error(errorMsg);
        console.error(errorMsg);
        return null;
      }

      const response = await apiClient.generateContent({
        prompt,
        context,
        type
      });
      
      if (response.data.success) {
        const content = response.data.data.content as string;
        setLastGenerated(content);
        onSuccess?.(content);
        // toast.success('Content generated successfully!');
        console.log('Content generated successfully!');
        return content;
      } else {
        const errorMsg = response.data.error || 'Failed to generate content';
        setError(errorMsg);
        onError?.(errorMsg);
        // toast.error(errorMsg);
        console.error(errorMsg);
        return null;
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate content. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        // toast.error('Too many AI requests. Please wait before trying again.');
        console.error('Too many AI requests. Please wait before trying again.');
      } else if (error.response?.status === 503) {
        // toast.error('AI service is temporarily unavailable. Please try again later.');
        console.error('AI service is temporarily unavailable. Please try again later.');
      } else {
        // toast.error(errorMsg);
        console.error(errorMsg);
      }
      
      return null;
    } finally {
      setGenerating(false);
    }
  }, [setGenerating, setError, setLastGenerated]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const clearLastGenerated = useCallback(() => {
    setLastGenerated(null);
  }, [setLastGenerated]);

  return {
    // State
    isGenerating: state.isGenerating,
    error: state.error,
    lastGenerated: state.lastGenerated,
    
    // Actions
    generateTask,
    generateSprint,
    generateContent,
    clearError,
    clearLastGenerated,
  };
};
