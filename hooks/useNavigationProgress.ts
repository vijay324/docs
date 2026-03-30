"use client";

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { startProgress, completeProgress, configureProgress, resetProgressConfig } from '@/components/ui/route-progress';

export interface NavigationOptions {
  /**
   * Progress speed configuration
   * - 'fast': For quick internal navigation
   * - 'normal': Default speed
   * - 'slow': For heavy pages or external links
   */
  speed?: 'fast' | 'normal' | 'slow';
  
  /**
   * Delay before starting progress (in ms)
   * Useful to prevent progress bar for very fast navigations
   */
  startDelay?: number;
  
  /**
   * Minimum time to show progress bar (in ms)
   * Ensures users see the progress feedback
   */
  minDuration?: number;
  
  /**
   * Whether to show progress for this navigation
   */
  showProgress?: boolean;
}

export function useNavigationProgress() {
  const router = useRouter();

  const navigate = useCallback(
    async (
      url: string, 
      options: NavigationOptions = {}
    ) => {
      const {
        speed = 'normal',
        startDelay = 0,
        minDuration = 200,
        showProgress = false,
      } = options;

      if (!showProgress) {
        router.push(url as any);
        return;
      }

      // Configure progress speed
      if (speed !== 'normal') {
        configureProgress(speed);
      }

      let progressStarted = false;
      const startTime = Date.now();

      // Start progress after delay
      const startTimer = setTimeout(() => {
        startProgress();
        progressStarted = true;
      }, startDelay);

      try {
        // Navigate to the new route
        router.push(url as any);

        // Ensure minimum duration for progress visibility
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
          if (progressStarted) {
            completeProgress();
          }
          
          // Reset to default configuration
          if (speed !== 'normal') {
            resetProgressConfig();
          }
        }, remainingTime);

      } catch (error) {
        // Clear timers and complete progress on error
        clearTimeout(startTimer);
        if (progressStarted) {
          completeProgress();
        }
        
        // Reset configuration
        if (speed !== 'normal') {
          resetProgressConfig();
        }
        
        throw error;
      }
    },
    [router]
  );

  const navigateBack = useCallback(
    (options: NavigationOptions = {}) => {
      const { showProgress = false } = options;
      
      if (showProgress) {
        startProgress();
        setTimeout(() => {
          completeProgress();
        }, 300);
      }
      
      router.back();
    },
    [router]
  );

  const navigateForward = useCallback(
    (options: NavigationOptions = {}) => {
      const { showProgress = false } = options;
      
      if (showProgress) {
        startProgress();
        setTimeout(() => {
          completeProgress();
        }, 300);
      }
      
      router.forward();
    },
    [router]
  );

  const replace = useCallback(
    async (
      url: string, 
      options: NavigationOptions = {}
    ) => {
      const {
        speed = 'normal',
        startDelay = 0,
        minDuration = 200,
        showProgress = false,
      } = options;

      if (!showProgress) {
        router.replace(url as any);
        return;
      }

      // Configure progress speed
      if (speed !== 'normal') {
        configureProgress(speed);
      }

      let progressStarted = false;
      const startTime = Date.now();

      // Start progress after delay
      const startTimer = setTimeout(() => {
        startProgress();
        progressStarted = true;
      }, startDelay);

      try {
        // Replace current route
        router.replace(url as any);

        // Ensure minimum duration for progress visibility
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
          if (progressStarted) {
            completeProgress();
          }
          
          // Reset to default configuration
          if (speed !== 'normal') {
            resetProgressConfig();
          }
        }, remainingTime);

      } catch (error) {
        // Clear timers and complete progress on error
        clearTimeout(startTimer);
        if (progressStarted) {
          completeProgress();
        }
        
        // Reset configuration
        if (speed !== 'normal') {
          resetProgressConfig();
        }
        
        throw error;
      }
    },
    [router]
  );

  const refresh = useCallback(
    (options: NavigationOptions = {}) => {
      const { showProgress = false } = options;
      
      if (showProgress) {
        startProgress();
        setTimeout(() => {
          completeProgress();
        }, 500);
      }
      
      router.refresh();
    },
    [router]
  );

  return {
    navigate,
    navigateBack,
    navigateForward,
    replace,
    refresh,
    // Direct access to router for cases where progress isn't needed
    router,
  };
}

// Convenience functions for common navigation patterns
export const useQuickNavigation = () => {
  const { navigate } = useNavigationProgress();
  
  return useCallback(
    (url: string) => navigate(url, { speed: 'fast', startDelay: 50 }),
    [navigate]
  );
};

export const useSlowNavigation = () => {
  const { navigate } = useNavigationProgress();
  
  return useCallback(
    (url: string) => navigate(url, { speed: 'slow', minDuration: 500 }),
    [navigate]
  );
};

export const useSilentNavigation = () => {
  const { navigate } = useNavigationProgress();
  
  return useCallback(
    (url: string) => navigate(url, { showProgress: false }),
    [navigate]
  );
};
