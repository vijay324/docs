"use client";

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useOfflineDetection, NetworkStatus, OfflineDetectionOptions } from '@/hooks/use-offline-detection';


/**
 * Context interface for offline status
 */
interface OfflineContextType extends NetworkStatus {
  /** Force a connectivity check */
  checkConnectivity: () => void;
  /** Enable/disable toast notifications */
  enableToasts: boolean;
  /** Set toast notification preference */
  setEnableToasts: (enabled: boolean) => void;
}

/**
 * Props for the OfflineProvider component
 */
interface OfflineProviderProps {
  children: ReactNode;
  /** Configuration options for offline detection */
  options?: OfflineDetectionOptions;
  /** Whether to show toast notifications by default */
  enableToasts?: boolean;
  /** Custom messages for toast notifications */
  messages?: {
    offline?: string;
    online?: string;
  };
  /** Whether to enable debug logging */
  debug?: boolean;
}

// Create the context
const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

/**
 * Provider component for offline status management
 * 
 * Provides global offline/online status and handles toast notifications
 * when connectivity changes.
 */
export function OfflineProvider({
  children,
  options = {},
  enableToasts = true,
  messages = {
    offline: "You are offline",
    online: "You are back online"
  },
  debug = false
}: OfflineProviderProps) {
  const [toastsEnabled, setToastsEnabled] = React.useState(enableToasts);
  const networkStatus = useOfflineDetection(options);

  /**
   * Force a connectivity check (useful for manual refresh)
   */
  const checkConnectivity = React.useCallback(() => {
    // This will trigger the useOfflineDetection hook to perform a check
    // if enableConnectivityCheck is enabled in options
    if (debug) {
      console.log('🔄 Manual connectivity check requested');
    }
  }, [debug]);

  /**
   * Handle offline/online transitions with toast notifications
   */
  useEffect(() => {
    if (!toastsEnabled) return;

   
  }, [networkStatus.wasOffline, networkStatus.wasOnline, toastsEnabled, messages, debug]);

  /**
   * Log connectivity changes in debug mode
   */
  useEffect(() => {
    if (debug && networkStatus.lastChanged) {
      console.log('🌐 Connectivity status:', {
        isOnline: networkStatus.isOnline,
        lastChanged: networkStatus.lastChanged,
        changeCount: networkStatus.changeCount
      });
    }
  }, [networkStatus.isOnline, networkStatus.lastChanged, networkStatus.changeCount, debug]);

  const contextValue: OfflineContextType = {
    ...networkStatus,
    checkConnectivity,
    enableToasts: toastsEnabled,
    setEnableToasts: setToastsEnabled
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
}

/**
 * Hook to access offline context
 * 
 * @throws Error if used outside of OfflineProvider
 */
export function useOfflineContext(): OfflineContextType {
  const context = useContext(OfflineContext);
  
  if (context === undefined) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  
  return context;
}

/**
 * Hook to get just the online status (simplified)
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useOfflineContext();
  return isOnline;
}

/**
 * Hook to get connectivity change events
 */
export function useConnectivityChanges() {
  const context = useOfflineContext();
  
  return {
    isOnline: context.isOnline,
    justWentOffline: context.wasOffline,
    justCameOnline: context.wasOnline,
    lastChanged: context.lastChanged,
    changeCount: context.changeCount
  };
}


