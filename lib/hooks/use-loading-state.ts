/**
 * Loading State Hooks
 * 
 * Utilities for managing loading states with React Query and other async operations.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";

/**
 * Hook to determine if any queries are loading
 */
export function useIsLoading(...queries: UseQueryResult<any>[]) {
  return queries.some(query => query.isLoading || query.isFetching);
}

/**
 * Hook for managing loading state with debouncing
 */
export function useLoadingState(initialState = false, delay = 300) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [debouncedLoading, setDebouncedLoading] = useState(initialState);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setDebouncedLoading(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setDebouncedLoading(false);
    }
  }, [isLoading, delay]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    isLoading,
    debouncedLoading,
    setLoading,
  };
}

/**
 * Hook for managing loading state with minimum display time
 * Prevents flash of loading states for very fast operations
 */
export function useMinimumLoadingState(
  isLoading: boolean,
  minimumTime = 500
) {
  const [showLoading, setShowLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading && !showLoading) {
      setStartTime(Date.now());
      setShowLoading(true);
    } else if (!isLoading && showLoading) {
      const elapsed = startTime ? Date.now() - startTime : 0;
      const remaining = Math.max(0, minimumTime - elapsed);

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoading(false);
          setStartTime(null);
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        setShowLoading(false);
        setStartTime(null);
      }
    }
  }, [isLoading, showLoading, startTime, minimumTime]);

  return showLoading;
}

/**
 * Hook for managing async operation loading state
 */
export function useAsyncLoading<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    execute,
  };
}

