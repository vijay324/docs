'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { platformAdminApi } from '@/lib/platform-admin-api';
import { SecurePlatformAdminStorage } from '@/lib/secure-platform-admin-storage';
import {
  PlatformAdmin,
  PlatformAdminEmployee,
  PlatformPermission
} from '@/lib/types/platform-admin';

interface PlatformAdminContextValue {
  admin: PlatformAdmin | null;
  employee: PlatformAdminEmployee | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: PlatformPermission[];

  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Permission helpers
  can: (permission: PlatformPermission) => boolean;
  canAny: (permissions: PlatformPermission[]) => boolean;
  canAll: (permissions: PlatformPermission[]) => boolean;

  // Refresh user data
  refreshUser: () => Promise<void>;
}

const PlatformAdminContext = createContext<PlatformAdminContextValue | undefined>(undefined);

export function PlatformAdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [employee, setEmployee] = useState<PlatformAdminEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!admin;
  const permissions = admin?.permissions || [];

  // Permission check helpers
  const can = useCallback((permission: PlatformPermission): boolean => {
    if (!admin) return false;
    if (admin.level === 'owner') return true;
    return permissions.includes(permission);
  }, [admin, permissions]);

  const canAny = useCallback((perms: PlatformPermission[]): boolean => {
    if (!admin) return false;
    if (admin.level === 'owner') return true;
    return perms.some(p => permissions.includes(p));
  }, [admin, permissions]);

  const canAll = useCallback((perms: PlatformPermission[]): boolean => {
    if (!admin) return false;
    if (admin.level === 'owner') return true;
    return perms.every(p => permissions.includes(p));
  }, [admin, permissions]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const response = await platformAdminApi.getMe();
      if (response.data.success && response.data.data) {
        setAdmin(response.data.data.admin);
        setEmployee(response.data.data.employee);
        platformAdminApi.setAdminData(response.data.data.admin);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      platformAdminApi.clearAuth();
      setAdmin(null);
      setEmployee(null);
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await platformAdminApi.login(email, password);
      if (response.data.success && response.data.data) {
        // Note: Admin data is not returned in login response, only after 2FA verification
        // For now, we'll need to handle 2FA flow properly
        // TODO: Implement proper 2FA login flow
        throw new Error('2FA verification required - login flow needs update');
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await platformAdminApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      platformAdminApi.clearAuth();
      setAdmin(null);
      setEmployee(null);
      setIsLoading(false);
      router.push('/super-admin/login');
    }
  }, [router]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      // SECURITY: Sync tokens from cookies to memory on page load
      SecurePlatformAdminStorage.syncFromCookies();
      
      if (!platformAdminApi.isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      // SECURITY: Check if fingerprint is valid (prevents token theft)
      if (!SecurePlatformAdminStorage.verifyFingerprint()) {
        console.warn('[Security] Device fingerprint mismatch - clearing auth');
        platformAdminApi.clearAuth();
        setIsLoading(false);
        return;
      }

      try {
        // Try to load from storage first
        const storedAdmin = platformAdminApi.getAdminData();
        if (storedAdmin) {
          setAdmin(storedAdmin);
        }

        // Then verify with server
        await refreshUser();
      } catch (error) {
        console.error('Auth initialization error:', error);
        platformAdminApi.clearAuth();
        setAdmin(null);
        setEmployee(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshUser]);

  return (
    <PlatformAdminContext.Provider
      value={{
        admin,
        employee,
        isLoading,
        isAuthenticated,
        permissions,
        login,
        logout,
        can,
        canAny,
        canAll,
        refreshUser
      }}
    >
      {children}
    </PlatformAdminContext.Provider>
  );
}

export function usePlatformAdmin() {
  const context = useContext(PlatformAdminContext);
  if (context === undefined) {
    throw new Error('usePlatformAdmin must be used within a PlatformAdminProvider');
  }
  return context;
}

// HOC for protected routes
export function withPlatformAdminAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: PlatformPermission[]
) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, isLoading, canAll } = usePlatformAdmin();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/super-admin/login');
      }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (requiredPermissions && !canAll(requiredPermissions)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-zinc600 dark:text-zinc400">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

