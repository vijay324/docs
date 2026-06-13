"use client";

import { useCallback, useEffect, useRef } from 'react';
import { driver, type Driver, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getTourSteps, type TourPage } from '@/lib/constants/tour-steps';
import { useProductTourStatus } from '@/lib/hooks/use-product-tour-status';

interface UseTourOptions {
  page: TourPage;
  autoStart?: boolean;
  delay?: number;
}

/**
 * Hook for managing product tour with backend persistence.
 * Tour shows only on first sign-in and never repeats.
 */
export function useTour({ page, autoStart = true, delay = 2000 }: UseTourOptions) {
  const driverRef = useRef<Driver | null>(null);
  const hasStartedRef = useRef(false);
  
  const { isCompleted, isLoading, completeTour } = useProductTourStatus();

  // Initialize Driver.js instance with clean styling
  const initDriver = useCallback(() => {
    const steps = getTourSteps(page);
    
    if (steps.length === 0) return null;

    const config: Config = {
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: steps.map((step) => ({
        element: step.element,
        popover: {
          title: step.popover.title,
          description: step.popover.description,
          side: step.popover.side,
          align: step.popover.align,
        },
      })),
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Got it!',
      progressText: '{{current}} / {{total}}',
      popoverClass: 'flotick-tour-popover',
      overlayColor: 'rgba(0, 0, 0, 0.75)',
      stagePadding: 12,
      stageRadius: 12,
      allowClose: true,
      overlayClickBehavior: 'close',
      onDestroyStarted: () => {
        // Mark tour as complete when finished (either completed or dismissed)
        completeTour();
        driverRef.current?.destroy();
      },
      onDestroyed: () => {
        driverRef.current = null;
      },
    };

    return driver(config);
  }, [page, completeTour]);

  // Start the tour
  const start = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }
    
    driverRef.current = initDriver();
    if (driverRef.current) {
      driverRef.current.drive();
    }
  }, [initDriver]);

  // Stop the tour
  const stop = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  // Replay tour manually
  const replay = useCallback(() => {
    start();
  }, [start]);

  // Auto-start tour for users who haven't completed it (first sign-in only)
  useEffect(() => {
    // Don't auto-start if:
    // - autoStart is disabled
    // - already started
    // - still loading backend status
    // - tour already completed on backend
    // - not on dashboard (only auto-start on dashboard)
    if (!autoStart || hasStartedRef.current || isLoading || isCompleted) {
      return;
    }

    // Only auto-start on dashboard page for first-time users
    if (page !== 'dashboard') {
      return;
    }

    hasStartedRef.current = true;
    const timer = setTimeout(() => {
      start();
    }, delay);
    
    return () => clearTimeout(timer);
  }, [autoStart, delay, start, isLoading, isCompleted, page]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, []);

  return {
    start,
    stop,
    replay,
    isCompleted,
    isLoading,
  };
}
