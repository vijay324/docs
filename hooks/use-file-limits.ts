"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getApiUrl } from "@/utils/api-config";

/**
 * File limits state returned from the API
 */
export interface FileLimitsState {
  plan: 'free' | 'pro' | 'max';
  entityType: string;
  entityId: string;
  currentCount: number;
  maxFiles: number;
  canUpload: boolean;
  remainingSlots: number;
  isUnlimited: boolean;
  upgradeRequired: boolean;
  blockedMessage: string | null;
}

/**
 * useFileLimits Hook
 * Fetches and manages file upload limits for a specific entity based on organization plan
 */
export function useFileLimits(entityType: string, entityId: string) {
  const [limits, setLimits] = useState<FileLimitsState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    // Don't fetch if we don't have required params
    if (!entityId || !entityType) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        getApiUrl(`plan-status/file-limits/${entityType}/${entityId}`),
        { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setLimits(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch file limits');
      }
    } catch (err) {
      console.error('[useFileLimits] Error fetching limits:', err);
      setError('Network error while fetching file limits');
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  // Fetch limits on mount and when entity changes
  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  // Memoized convenience properties
  const canUpload = useMemo(() => limits?.canUpload ?? true, [limits]);
  const isFreePlan = useMemo(() => limits?.plan === 'free', [limits]);
  const isProPlan = useMemo(() => limits?.plan === 'pro' || limits?.plan === 'max', [limits]);
  const remainingSlots = useMemo(() => limits?.remainingSlots ?? 0, [limits]);
  const upgradeRequired = useMemo(() => limits?.upgradeRequired ?? false, [limits]);
  const isUnlimited = useMemo(() => limits?.isUnlimited ?? false, [limits]);
  const blockedMessage = useMemo(() => limits?.blockedMessage ?? null, [limits]);
  const currentCount = useMemo(() => limits?.currentCount ?? 0, [limits]);
  const maxFiles = useMemo(() => limits?.maxFiles ?? 0, [limits]);
  
  // Computed limit percentage for progress indicators
  const usagePercentage = useMemo(() => {
    if (!limits || limits.isUnlimited || limits.maxFiles === 0) return 0;
    return Math.round((limits.currentCount / limits.maxFiles) * 100);
  }, [limits]);

  // Check if near limit (80% or more used)
  const isNearLimit = useMemo(() => {
    if (!limits || limits.isUnlimited) return false;
    return usagePercentage >= 80;
  }, [limits, usagePercentage]);

  return {
    // Raw state
    limits,
    isLoading,
    error,
    
    // Actions
    refetch: fetchLimits,
    
    // Convenience properties
    canUpload,
    isFreePlan,
    isProPlan,
    remainingSlots,
    upgradeRequired,
    isUnlimited,
    blockedMessage,
    currentCount,
    maxFiles,
    usagePercentage,
    isNearLimit,
  };
}

export default useFileLimits;
