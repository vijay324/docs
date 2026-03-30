"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { bffApiClient } from '@/lib/bff-api-client';
import { useAuth } from '@/lib/auth-context';
import SessionAuthStorage from '@/lib/session-auth-storage';

/**
 * Organization data interface
 */
export interface Organization {
  _id: string;
  name: string;
  slug: string;
  organizationType?: string;
  industry?: string;
  organizationSize?: string;
  country?: string;
  timezone?: string;
  description?: string;
  websiteUrl?: string;
  workMode?: string;
  plan: 'free' | 'pro' | 'max';
  planStatus: 'active' | 'suspended';
  createdAt: string;
}

/**
 * Organization context value interface
 */
interface OrganizationContextValue {
  // Organization data
  organization: Organization | null;
  orgSlug: string | null;
  orgId: string | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Organization validation
  isValidOrg: boolean;
  isMember: boolean;
  
  // User's actual organization slug (for redirect purposes)
  userOrgSlug: string | null;
  
  // Actions
  refreshOrganization: () => Promise<void>;
  clearOrganization: () => void;
  
  // Helper for org-scoped routes
  getOrgPath: (path: string) => string;
  getOrgApiPath: (path: string) => string;
}

/**
 * Default context value
 */
const defaultContextValue: OrganizationContextValue = {
  organization: null,
  orgSlug: null,
  orgId: null,
  isLoading: true,
  error: null,
  isValidOrg: false,
  isMember: false,
  userOrgSlug: null,
  refreshOrganization: async () => {},
  clearOrganization: () => {},
  getOrgPath: (path: string) => path,
  getOrgApiPath: (path: string) => path,
};

/**
 * Organization Context
 */
const OrganizationContext = createContext<OrganizationContextValue>(defaultContextValue);

/**
 * Organization Provider Props
 */
interface OrganizationProviderProps {
  children: ReactNode;
  orgSlug?: string; // Can be passed directly or extracted from URL params
}

/**
 * Organization Provider Component
 * 
 * Provides organization context to child components.
 * Fetches organization data based on URL slug and validates user membership.
 * Now waits for auth context to be ready before fetching to prevent race conditions.
 */
export function OrganizationProvider({ children, orgSlug: propOrgSlug }: OrganizationProviderProps) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get auth context to ensure we wait for authentication before fetching org data
  const { isLoaded: authLoaded, isAuthenticated, user: authUser } = useAuth();
  
  // Get orgSlug from props or URL params
  const orgSlug = propOrgSlug || (params?.orgSlug as string) || null;
  
  // Track user's actual organization for redirect purposes
  const [userOrgSlug, setUserOrgSlug] = useState<string | null>(null);
  
  // Ref to track if we've already fetched to prevent duplicate calls
  const hasFetchedRef = useRef(false);
  
  // State
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);

  /**
   * Fetch organization data from API
   */
  const fetchOrganization = useCallback(async () => {
    if (!orgSlug) {
      setIsLoading(false);
      setError('No organization specified');
      return;
    }

    // Don't fetch if auth is not ready
    if (!authLoaded) {
      return;
    }

    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Get user's stored organization for slug mismatch detection
    const storedOrg = SessionAuthStorage.getOrganization();
    if (storedOrg?.slug) {
      setUserOrgSlug(storedOrg.slug);
    }

    try {
      const response = await bffApiClient.get<any>(`/o/${orgSlug}`);

      if (response.success && response.data?.organization) {
        const org = response.data.organization;
        setOrganization(org);
        SessionAuthStorage.setOrganization({
          slug: org.slug,
          _id: org._id,
        });
        setUserOrgSlug(org.slug ?? null);
        setIsMember(true);
        setError(null);
      } else {
        setError('Failed to load organization');
        setOrganization(null);
        setIsMember(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch organization:', err);
      
      // Check if this is an access/404 error and we have user's correct org
      // If so, auto-redirect to their actual organization
      const storedOrg = SessionAuthStorage.getOrganization();
      const statusCode = err.status || err.response?.status;
      if ((statusCode === 404 || statusCode === 403) && storedOrg?.slug && storedOrg.slug.toLowerCase() !== orgSlug.toLowerCase()) {
        // User tried to access wrong org - redirect to their actual org
        const correctPath = pathname?.replace(`/${orgSlug}`, `/${storedOrg.slug}`) || `/${storedOrg.slug}/dashboard`;
        console.log(`[OrgContext] Slug mismatch detected. Redirecting from /${orgSlug} to ${correctPath}`);
        router.replace(correctPath as any);
        return;
      }
      
      // Handle specific error cases
      if (statusCode === 404) {
        setError('Organization not found');
      } else if (statusCode === 403) {
        setError('You do not have access to this organization');
        setIsMember(false);
      } else if (statusCode === 401) {
        // User not authenticated - let auth context handle redirect
        // Don't redirect here to avoid race conditions with auth context
        setError('Authentication required');
      } else {
        setError(err.message || 'Failed to load organization');
      }
      
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, [orgSlug, router, pathname, authLoaded, isAuthenticated, authUser?.id]);

  /**
   * Refresh organization data
   */
  const refreshOrganization = useCallback(async () => {
    hasFetchedRef.current = false; // Reset flag to allow re-fetch
    await fetchOrganization();
  }, [fetchOrganization]);

  /**
   * Clear organization data
   */
  const clearOrganization = useCallback(() => {
    setOrganization(null);
    setIsMember(false);
    setError(null);
    hasFetchedRef.current = false;
  }, []);

  /**
   * Get org-scoped frontend path
   */
  const getOrgPath = useCallback((path: string): string => {
    if (!orgSlug) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/${orgSlug}/${cleanPath}`;
  }, [orgSlug]);

  /**
   * Get org-scoped API path
   */
  const getOrgApiPath = useCallback((path: string): string => {
    if (!orgSlug) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/o/${orgSlug}/${cleanPath}`;
  }, [orgSlug]);

  // Fetch organization when auth is ready and authenticated
  useEffect(() => {
    // Wait for auth to be loaded
    if (!authLoaded) {
      return;
    }

    // If not authenticated, don't fetch (let auth layer handle redirect)
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (hasFetchedRef.current && organization) {
      return;
    }

    hasFetchedRef.current = true;
    fetchOrganization();
  }, [authLoaded, isAuthenticated, orgSlug, fetchOrganization, organization]);

  // Memoized context value
  const contextValue = useMemo<OrganizationContextValue>(() => ({
    organization,
    orgSlug,
    orgId: organization?._id || null,
    isLoading,
    error,
    isValidOrg: !!organization && !error,
    isMember,
    userOrgSlug,
    refreshOrganization,
    clearOrganization,
    getOrgPath,
    getOrgApiPath,
  }), [
    organization,
    orgSlug,
    isLoading,
    error,
    isMember,
    userOrgSlug,
    refreshOrganization,
    clearOrganization,
    getOrgPath,
    getOrgApiPath,
  ]);

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access organization context
 */
export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  
  return context;
}

/**
 * Hook to require organization context (throws if not in org scope)
 */
export function useRequiredOrganization(): OrganizationContextValue & { organization: Organization } {
  const context = useOrganization();
  
  if (!context.organization) {
    throw new Error('Organization context is required but not available');
  }
  
  return context as OrganizationContextValue & { organization: Organization };
}

export default OrganizationContext;

