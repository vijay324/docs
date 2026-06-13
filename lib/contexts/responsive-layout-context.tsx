"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

// Breakpoints matching the wireframe requirements
const BREAKPOINTS = {
  mobile: 768, // Below 768px is mobile
  tablet: 1024, // 768px to 1024px is tablet
  desktop: 1024, // 1024px and above is desktop
} as const;

export type ScreenSize = "mobile" | "tablet" | "desktop";

interface ResponsiveLayoutContextType {
  // Screen size detection
  screenSize: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Sidebar state management
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Actions
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  toggleCollapse: () => void;
  
  // Mobile drawer state
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const ResponsiveLayoutContext = createContext<ResponsiveLayoutContextType | undefined>(undefined);

export function ResponsiveLayoutProvider({ children }: { children: React.ReactNode }) {
  const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Screen size detection
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setScreenSize("mobile");
      } else if (width < BREAKPOINTS.tablet) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  // Auto-close drawer when switching to desktop
  useEffect(() => {
    if (screenSize === "desktop") {
      setIsDrawerOpen(false);
    }
  }, [screenSize]);

  // Computed values
  const isMobile = screenSize === "mobile";
  const isTablet = screenSize === "tablet";
  const isDesktop = screenSize === "desktop";
  
  // For mobile/tablet, sidebar is controlled by drawer state
  // For desktop, sidebar is always "open" but can be collapsed
  const sidebarOpen = isDesktop ? true : isDrawerOpen;

  // Actions for desktop sidebar
  const collapseSidebar = useCallback(() => {
    if (isDesktop) {
      setSidebarCollapsed(true);
    }
  }, [isDesktop]);

  const expandSidebar = useCallback(() => {
    if (isDesktop) {
      setSidebarCollapsed(false);
    }
  }, [isDesktop]);

  const toggleCollapse = useCallback(() => {
    if (isDesktop) {
      setSidebarCollapsed(prev => !prev);
    }
  }, [isDesktop]);

  // Actions for mobile/tablet drawer
  const openDrawer = useCallback(() => {
    if (!isDesktop) {
      setIsDrawerOpen(true);
    }
  }, [isDesktop]);

  const closeDrawer = useCallback(() => {
    if (!isDesktop) {
      setIsDrawerOpen(false);
    }
  }, [isDesktop]);

  const toggleDrawer = useCallback(() => {
    if (!isDesktop) {
      setIsDrawerOpen(prev => !prev);
    }
  }, [isDesktop]);

  // Legacy actions (for backward compatibility)
  const openSidebar = isDesktop ? expandSidebar : openDrawer;
  const closeSidebar = isDesktop ? collapseSidebar : closeDrawer;
  const toggleSidebar = isDesktop ? toggleCollapse : toggleDrawer;

  const value: ResponsiveLayoutContextType = {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    sidebarOpen,
    sidebarCollapsed,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    collapseSidebar,
    expandSidebar,
    toggleCollapse,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };

  return (
    <ResponsiveLayoutContext.Provider value={value}>
      {children}
    </ResponsiveLayoutContext.Provider>
  );
}

export function useResponsiveLayout() {
  const context = useContext(ResponsiveLayoutContext);
  if (context === undefined) {
    throw new Error("useResponsiveLayout must be used within a ResponsiveLayoutProvider");
  }
  return context;
}
