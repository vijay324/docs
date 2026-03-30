import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface SearchResult {
  _id: string;
  type: 'task' | 'project' | 'sprint' | 'employee';
  title?: string;
  name?: string;
  status?: string;
  priority?: string;
  description?: string;
  score: number;
  project?: { name: string };
  sprint?: { title: string };
  // Employee specific fields
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  jobTitle?: string;
  department?: string;
  role?: string;
  isActive?: boolean;
}

export interface SearchResults {
  tasks: SearchResult[];
  projects: SearchResult[];
  sprints: SearchResult[];
  employees: SearchResult[];
}

export interface QuickSearchResults {
  results: SearchResult[];
}

// Debounced search hook
export function useSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  // Debounce the search query
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  // Quick search query for autocomplete
  const {
    data: quickSearchData,
    isLoading: isQuickSearchLoading,
    error: quickSearchError,
    refetch: refetchQuickSearch
  } = useQuery({
    queryKey: ['quickSearch', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { data: { results: [] } };
      }
      const response = await apiClient.quickSearch(debouncedQuery, 8);
      return response.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Full search query for detailed results
  const {
    data: fullSearchData,
    isLoading: isFullSearchLoading,
    error: fullSearchError,
    refetch: refetchFullSearch
  } = useQuery({
    queryKey: ['fullSearch', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { data: { tasks: [], projects: [], sprints: [], employees: [] } };
      }
      const response = await apiClient.unifiedSearch(debouncedQuery, 'all', 10);
      return response.data;
    },
    enabled: false, // Only run when explicitly called
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Update search query
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    if (newQuery.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setIsOpen(false);
  }, []);

  // Open/close search dropdown
  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  // Get quick search results
  const quickResults: SearchResult[] = quickSearchData?.data?.results || [];

  // Get full search results
  const fullResults: SearchResults = fullSearchData?.data || {
    tasks: [],
    projects: [],
    sprints: [],
    employees: []
  };

  // Calculate total results count
  const totalResults = quickResults.length;
  const hasResults = totalResults > 0;

  // Loading states
  const isLoading = isQuickSearchLoading;
  const isSearching = debouncedQuery.length >= 2 && isLoading;

  // Error states
  const error = quickSearchError || fullSearchError;

  return {
    // State
    query,
    debouncedQuery,
    isOpen,
    isLoading,
    isSearching,
    hasResults,
    totalResults,
    error,

    // Results
    quickResults,
    fullResults,

    // Actions
    updateQuery,
    clearSearch,
    openSearch,
    closeSearch,
    refetchQuickSearch,
    refetchFullSearch,

    // Utilities
    canSearch: debouncedQuery.length >= 2,
    isEmpty: query.length === 0,
  };
}

// Hook for entity-specific search
export function useEntitySearch(entityType: 'tasks' | 'projects' | 'sprints' | 'employees') {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  // Debounce the search query
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  // Entity-specific search query
  const {
    data: searchData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['entitySearch', entityType, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { data: { [entityType]: [] } };
      }
      const response = await apiClient.unifiedSearch(debouncedQuery, entityType, 15);
      return response.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const results: SearchResult[] = searchData?.data?.[entityType] || [];

  return {
    query,
    debouncedQuery,
    results,
    isLoading,
    error,
    updateQuery: setQuery,
    clearQuery: () => setQuery(''),
    refetch,
    hasResults: results.length > 0,
    canSearch: debouncedQuery.length >= 2,
  };
}

// Hook for keyboard shortcuts
export function useSearchShortcuts(onToggle: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);
}
