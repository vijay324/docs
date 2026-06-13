"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { useOrganization } from '@/lib/contexts/organization-context';
import { DEPARTMENT_HIERARCHY } from '@/utils/constants';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Status configuration for tasks
 */
export interface StatusConfig {
  key: string;
  label: string;
  color: string;
  order: number;
  isDefault?: boolean;
  isFinal?: boolean;
  isInitial?: boolean;
}

/**
 * Priority configuration
 */
export interface PriorityConfig {
  key: string;
  label: string;
  color: string;
  order: number;
  isDefault?: boolean;
}

/**
 * Story points scale configuration
 */
export interface StoryPointConfig {
  scale: 'fibonacci' | 'linear' | 'tshirt' | 'custom';
  values: number[];
  labels?: Record<number, string>;
}

/**
 * Department configuration
 */
export interface DepartmentConfig {
  name: string;
  subDepartments: string[];
}

/**
 * Complete workflow configuration
 */
export interface WorkflowConfig {
  taskStatuses: StatusConfig[];
  priorities: PriorityConfig[];
  storyPoints: StoryPointConfig;
  departments?: DepartmentConfig[];
  updatedAt?: string;
  updatedBy?: string;
}

// ============================================================================
// DEFAULT CONFIGURATION (matches backend defaults)
// ============================================================================

const DEFAULT_TASK_STATUSES: StatusConfig[] = [
  { key: 'backlog', label: 'Backlog', color: '#6B7280', order: 0, isInitial: true },
  { key: 'sprint_backlog', label: 'Sprint Backlog', color: '#8B5CF6', order: 1 },
  { key: 'to_do', label: 'To Do', color: '#3B82F6', order: 2, isDefault: true },
  { key: 'in_progress', label: 'In Progress', color: '#F59E0B', order: 3 },
  { key: 'review', label: 'Review', color: '#8B5CF6', order: 4 },
  { key: 'testing', label: 'Testing', color: '#EC4899', order: 5 },
  { key: 'done', label: 'Done', color: '#10B981', order: 6, isFinal: true },
];

const DEFAULT_PRIORITIES: PriorityConfig[] = [
  { key: 'critical', label: 'Critical', color: '#DC2626', order: 0 },
  { key: 'high', label: 'High', color: '#F59E0B', order: 1 },
  { key: 'medium', label: 'Medium', color: '#3B82F6', order: 2, isDefault: true },
  { key: 'low', label: 'Low', color: '#6B7280', order: 3 },
];

const DEFAULT_STORY_POINTS: StoryPointConfig = {
  scale: 'fibonacci',
  values: [0, 1, 2, 3, 5, 8, 13, 21],
};

const DEFAULT_DEPARTMENTS: DepartmentConfig[] = Object.entries(DEPARTMENT_HIERARCHY).map(
  ([name, config]) => ({ name, subDepartments: [...config.subDepartments] })
);

const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  taskStatuses: DEFAULT_TASK_STATUSES,
  priorities: DEFAULT_PRIORITIES,
  storyPoints: DEFAULT_STORY_POINTS,
  departments: DEFAULT_DEPARTMENTS,
};

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

interface WorkflowConfigContextValue {
  // Config data
  config: WorkflowConfig;
  isLoading: boolean;
  error: string | null;
  isUsingDefaults: boolean;

  // Helper getters for common use cases
  taskStatuses: StatusConfig[];
  priorities: PriorityConfig[];
  storyPointValues: number[];
  departments: DepartmentConfig[];

  // Status label helpers
  getStatusLabel: (key: string) => string;
  getStatusColor: (key: string) => string;
  getPriorityLabel: (key: string) => string;
  getPriorityColor: (key: string) => string;

  // Department helpers
  getDepartmentNames: () => string[];
  getSubDepartmentsForDept: (departmentName: string) => string[];
  
  // Validation helpers
  isValidStatus: (key: string) => boolean;
  isValidPriority: (key: string) => boolean;
  isValidStoryPoints: (value: number) => boolean;

  // Actions
  refreshConfig: () => Promise<void>;
}

const defaultContextValue: WorkflowConfigContextValue = {
  config: DEFAULT_WORKFLOW_CONFIG,
  isLoading: true,
  error: null,
  isUsingDefaults: true,
  taskStatuses: DEFAULT_TASK_STATUSES,
  priorities: DEFAULT_PRIORITIES,
  storyPointValues: DEFAULT_STORY_POINTS.values,
  departments: DEFAULT_DEPARTMENTS,
  getStatusLabel: (key: string) => key,
  getStatusColor: (key: string) => '#6B7280',
  getPriorityLabel: (key: string) => key,
  getPriorityColor: (key: string) => '#6B7280',
  getDepartmentNames: () => DEFAULT_DEPARTMENTS.map(d => d.name),
  getSubDepartmentsForDept: (name: string) => DEFAULT_DEPARTMENTS.find(d => d.name === name)?.subDepartments || [],
  isValidStatus: () => true,
  isValidPriority: () => true,
  isValidStoryPoints: () => true,
  refreshConfig: async () => {},
};

const WorkflowConfigContext = createContext<WorkflowConfigContextValue>(defaultContextValue);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface WorkflowConfigProviderProps {
  children: ReactNode;
}

export function WorkflowConfigProvider({ children }: WorkflowConfigProviderProps) {
  const { organization, isLoading: orgLoading } = useOrganization();
  
  const [config, setConfig] = useState<WorkflowConfig>(DEFAULT_WORKFLOW_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingDefaults, setIsUsingDefaults] = useState(true);

  /**
   * Fetch workflow configuration from the backend
   */
  const fetchConfig = useCallback(async () => {
    if (!organization?._id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/organizations/${organization._id}/workflow-config`);
      
      if (response.data?.success && response.data?.data?.config) {
        setConfig(response.data.data.config);
        setIsUsingDefaults(response.data.data.isUsingDefaults ?? false);
      } else {
        // Use defaults if no config found
        setConfig(DEFAULT_WORKFLOW_CONFIG);
        setIsUsingDefaults(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch workflow config:', err);
      setError(err.message || 'Failed to load workflow configuration');
      // Fall back to defaults on error
      setConfig(DEFAULT_WORKFLOW_CONFIG);
      setIsUsingDefaults(true);
    } finally {
      setIsLoading(false);
    }
  }, [organization?._id]);

  /**
   * Refresh config - called after saves to invalidate cache
   */
  const refreshConfig = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  // Fetch config when organization is available
  useEffect(() => {
    if (!orgLoading && organization?._id) {
      fetchConfig();
    } else if (!orgLoading && !organization) {
      setIsLoading(false);
    }
  }, [orgLoading, organization?._id, fetchConfig]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getStatusLabel = useCallback((key: string): string => {
    const status = config.taskStatuses.find(s => s.key === key);
    if (status) return status.label;
    
    // Fallback: convert key to label format
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }, [config.taskStatuses]);

  const getStatusColor = useCallback((key: string): string => {
    const status = config.taskStatuses.find(s => s.key === key);
    return status?.color || '#6B7280';
  }, [config.taskStatuses]);

  const getPriorityLabel = useCallback((key: string): string => {
    const priority = config.priorities.find(p => p.key === key);
    if (priority) return priority.label;
    
    // Fallback: capitalize first letter
    return key.charAt(0).toUpperCase() + key.slice(1);
  }, [config.priorities]);

  const getPriorityColor = useCallback((key: string): string => {
    const priority = config.priorities.find(p => p.key === key);
    return priority?.color || '#6B7280';
  }, [config.priorities]);

  const isValidStatus = useCallback((key: string): boolean => {
    return config.taskStatuses.some(s => s.key === key);
  }, [config.taskStatuses]);

  const isValidPriority = useCallback((key: string): boolean => {
    return config.priorities.some(p => p.key === key);
  }, [config.priorities]);

  const isValidStoryPoints = useCallback((value: number): boolean => {
    return config.storyPoints.values.includes(value);
  }, [config.storyPoints.values]);

  const activeDepartments = useMemo<DepartmentConfig[]>(
    () => config.departments && config.departments.length > 0 ? config.departments : DEFAULT_DEPARTMENTS,
    [config.departments]
  );

  const getDepartmentNames = useCallback((): string[] => {
    return activeDepartments.map(d => d.name);
  }, [activeDepartments]);

  const getSubDepartmentsForDept = useCallback((departmentName: string): string[] => {
    return activeDepartments.find(d => d.name === departmentName)?.subDepartments || [];
  }, [activeDepartments]);

  // Memoized context value
  const contextValue = useMemo<WorkflowConfigContextValue>(() => ({
    config,
    isLoading,
    error,
    isUsingDefaults,
    taskStatuses: config.taskStatuses,
    priorities: config.priorities,
    storyPointValues: config.storyPoints.values,
    departments: activeDepartments,
    getStatusLabel,
    getStatusColor,
    getPriorityLabel,
    getPriorityColor,
    getDepartmentNames,
    getSubDepartmentsForDept,
    isValidStatus,
    isValidPriority,
    isValidStoryPoints,
    refreshConfig,
  }), [
    config,
    isLoading,
    error,
    isUsingDefaults,
    activeDepartments,
    getStatusLabel,
    getStatusColor,
    getPriorityLabel,
    getPriorityColor,
    getDepartmentNames,
    getSubDepartmentsForDept,
    isValidStatus,
    isValidPriority,
    isValidStoryPoints,
    refreshConfig,
  ]);

  return (
    <WorkflowConfigContext.Provider value={contextValue}>
      {children}
    </WorkflowConfigContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access workflow configuration
 */
export function useWorkflowConfig(): WorkflowConfigContextValue {
  const context = useContext(WorkflowConfigContext);
  
  if (context === undefined) {
    throw new Error('useWorkflowConfig must be used within a WorkflowConfigProvider');
  }
  
  return context;
}

/**
 * Hook to get status options for select components
 * Returns an array of { value, label, color } for easy use in dropdowns
 */
export function useStatusOptions() {
  const { taskStatuses } = useWorkflowConfig();
  
  return useMemo(() => 
    taskStatuses
      .sort((a, b) => a.order - b.order)
      .map(status => ({
        value: status.label, // Use label as value for backward compatibility
        key: status.key,
        label: status.label,
        color: status.color,
        isInitial: status.isInitial,
        isFinal: status.isFinal,
      })),
    [taskStatuses]
  );
}

/**
 * Hook to get priority options for select components
 */
export function usePriorityOptions() {
  const { priorities } = useWorkflowConfig();
  
  return useMemo(() => 
    priorities
      .sort((a, b) => a.order - b.order)
      .map(priority => ({
        value: priority.label, // Use label as value for backward compatibility
        key: priority.key,
        label: priority.label,
        color: priority.color,
        isDefault: priority.isDefault,
      })),
    [priorities]
  );
}

/**
 * Hook to get story point options for select components
 */
export function useStoryPointOptions() {
  const { config } = useWorkflowConfig();
  
  return useMemo(() => 
    config.storyPoints.values.map(value => ({
      value,
      label: config.storyPoints.labels?.[value] || String(value),
    })),
    [config.storyPoints]
  );
}

export default WorkflowConfigContext;
