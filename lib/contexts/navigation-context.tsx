"use client";

import type React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationState {
  previousPath: string | null;
  currentPath: string | null;
  referrer: string | null;
}

interface NavigationContextType {
  navigationState: NavigationState;
  setPreviousPath: (path: string) => void;
  setCurrentPath: (path: string) => void;
  setReferrer: (referrer: string) => void;
  navigateBack: () => void;
  getSmartBackPath: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [navigationState, setNavigationState] = useState<NavigationState>({
    previousPath: null,
    currentPath: null,
    referrer: null,
  });

  const setPreviousPath = useCallback((path: string) => {
    setNavigationState(prev => ({ ...prev, previousPath: path }));
  }, []);

  const setCurrentPath = useCallback((path: string) => {
    setNavigationState(prev => ({ 
      ...prev, 
      previousPath: prev.currentPath,
      currentPath: path 
    }));
  }, []);

  const setReferrer = useCallback((referrer: string) => {
    setNavigationState(prev => ({ ...prev, referrer }));
  }, []);

  const getSmartBackPath = useCallback(() => {
    const { previousPath, referrer } = navigationState;
    const currentPath = navigationState.currentPath || '';
    
    // Extract orgSlug from current path (e.g., /acme/dashboard -> acme)
    const pathParts = currentPath.split('/').filter(Boolean);
    const orgSlug = pathParts[0] || '';
    
    // Helper to create org-scoped path
    const getOrgPath = (path: string) => {
      if (!orgSlug) return path;
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `/${orgSlug}/${cleanPath}`;
    };
    
    // If we have a referrer from dashboard, go back to dashboard
    if (referrer === 'dashboard') {
      return getOrgPath('/dashboard');
    }
    
    // If we have a previous path and it's not the current path
    if (previousPath && previousPath !== currentPath) {
      // Previous path should already be org-scoped, return it directly
      return previousPath;
    }
    
    // Default fallback based on current path (already org-scoped)
    // Match patterns like /{orgSlug}/tasks/123 -> /{orgSlug}/tasks
    if (currentPath.includes('/tasks/')) {
      return getOrgPath('/tasks');
    }
    if (currentPath.includes('/projects/')) {
      return getOrgPath('/projects');
    }
    if (currentPath.includes('/sprints/')) {
      return getOrgPath('/sprints');
    }
    if (currentPath.includes('/employees/')) {
      return getOrgPath('/employees');
    }
    
    // Ultimate fallback - org-scoped dashboard
    return getOrgPath('/dashboard');
  }, [navigationState]);

  const navigateBack = useCallback(() => {
    const backPath = getSmartBackPath();
    router.push(backPath as any);
  }, [router, getSmartBackPath]);

  const value: NavigationContextType = {
    navigationState,
    setPreviousPath,
    setCurrentPath,
    setReferrer,
    navigateBack,
    getSmartBackPath,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Hook for tracking navigation in components
export function useNavigationTracker() {
  const { setCurrentPath, setReferrer } = useNavigation();
  
  const trackNavigation = useCallback((path: string, referrer?: string) => {
    setCurrentPath(path);
    if (referrer) {
      setReferrer(referrer);
    }
  }, [setCurrentPath, setReferrer]);

  return { trackNavigation };
}
