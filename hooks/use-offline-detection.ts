"use client";

import { useState, useEffect, useCallback } from 'react';

/**
 * Options for offline detection hook
 */
export interface OfflineDetectionOptions {
  /** Enable periodic connectivity checks */
  enableConnectivityCheck?: boolean;
  /** Interval for connectivity checks in milliseconds */
  checkInterval?: number;
  /** Custom online check function */
  onlineCheck?: () => Promise<boolean>;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Current online status */
  isOnline: boolean;
  /** True if just transitioned to offline */
  wasOffline: boolean;
  /** True if just transitioned to online */
  wasOnline: boolean;
  /** Timestamp of last status change */
  lastChanged: Date | null;
  /** Number of connectivity changes */
  changeCount: number;
}

/**
 * Hook for detecting online/offline status
 *
 * @param options Configuration options
 * @returns Network status object
 */
export function useOfflineDetection(options: OfflineDetectionOptions = {}): NetworkStatus {
  const {
    enableConnectivityCheck = false,
    checkInterval = 30000, // 30 seconds
    onlineCheck
  } = options;

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [wasOnline, setWasOnline] = useState<boolean>(false);
  const [lastChanged, setLastChanged] = useState<Date | null>(null);
  const [changeCount, setChangeCount] = useState<number>(0);

  /**
   * Update online status and handle transitions
   */
  const updateOnlineStatus = useCallback((online: boolean) => {
    const now = new Date();
    const previousOnline = isOnline;

    setIsOnline(online);
    setLastChanged(now);

    if (online !== previousOnline) {
      setChangeCount(prev => prev + 1);

      if (!online) {
        // Just went offline
        setWasOffline(true);
        setWasOnline(false);
      } else {
        // Just came online
        setWasOnline(true);
        setWasOffline(false);
      }
    } else {
      // No change, reset transition flags
      setWasOffline(false);
      setWasOnline(false);
    }
  }, [isOnline]);

  /**
   * Perform connectivity check
   */
  const checkConnectivity = useCallback(async () => {
    try {
      if (onlineCheck) {
        const result = await onlineCheck();
        updateOnlineStatus(result);
      } else {
        // Use navigator.onLine as fallback
        updateOnlineStatus(navigator.onLine);
      }
    } catch (error) {
      console.warn('Connectivity check failed:', error);
      // Assume offline on check failure
      updateOnlineStatus(false);
    }
  }, [onlineCheck, updateOnlineStatus]);

  // Initialize with current status
  useEffect(() => {
    updateOnlineStatus(navigator.onLine);
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => updateOnlineStatus(true);
    const handleOffline = () => updateOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateOnlineStatus]);

  // Periodic connectivity checks if enabled
  useEffect(() => {
    if (!enableConnectivityCheck) return;

    const interval = setInterval(checkConnectivity, checkInterval);

    return () => clearInterval(interval);
  }, [enableConnectivityCheck, checkInterval, checkConnectivity]);

  return {
    isOnline,
    wasOffline,
    wasOnline,
    lastChanged,
    changeCount
  };
}