"use client";

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { errorHandler } from './error-handler';


interface QueryProviderProps {
  children: React.ReactNode;
}

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
  { ssr: false }
);

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: any, query) => {
            // Handle query errors globally
            // Safely serialize query key to avoid [object Object] in logs
            const queryKeyString = query.queryKey.map(key =>
              typeof key === 'object' ? JSON.stringify(key) : String(key)
            ).join('/');
            
            // Skip error logging for expected 404s on task detail queries (deleted tasks)
            const isTaskDetailQuery = query.queryKey[0] === 'tasks' && query.queryKey[1] === 'detail';
            const is404Error = error?.statusCode === 404 || error?.status === 404 || 
                              error?.response?.status === 404 || error?.message?.includes('404');
            
            if (isTaskDetailQuery && is404Error) {
              // Silently handle 404 for task detail queries (expected for deleted tasks)
              return;
            }
            
            errorHandler.handleError(error, `Query: ${queryKeyString}`);

            // Log network error for query failures
            if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
              console.error('Network error occurred during query');
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, variables, context, mutation) => {
            // Handle mutation errors globally
            errorHandler.handleError(error, `Mutation: ${mutation.options.mutationKey?.join('/') || 'Unknown'}`);
          },
          onSuccess: (data, variables, context, mutation) => {
            // Show success toast for mutations (except delete - handled by undo toast)
            const mutationKey = mutation.options.mutationKey?.join('/') || '';
            if (mutationKey.includes('create')) {
              // Create mutation
            } else if (mutationKey.includes('update')) {
              // Update mutation
            }
            // Skip automatic success toast for delete - handled by undo toast
            if (process.env.NODE_ENV === 'development') {
              console.log(`Mutation success: ${mutationKey}`);
            }
          },
        }),
        defaultOptions: {
          queries: {
            // Optimized caching strategy for production-grade performance
            staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
            gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer for faster revisits
            retry: (failureCount, error: any) => {
              // Use error handler to determine if retryable
              return errorHandler.isRetryableError(error) && failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false, // Avoid unnecessary backend load on every tab focus
            refetchOnReconnect: true, // Refetch when reconnecting
            refetchOnMount: false, // Don't always refetch - use cached data if fresh

            // Performance optimizations
            structuralSharing: true, // Enable structural sharing for better performance
            notifyOnChangeProps: ['data', 'error', 'isLoading'], // Only notify on relevant changes

            // Network mode optimizations
            networkMode: 'online', // Only run queries when online
            
            // Query deduplication - prevent duplicate requests
            queryKeyHashFn: (queryKey) => {
              return JSON.stringify(queryKey);
            },
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Only retry on network/server errors
              return errorHandler.isRetryableError(error) && failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

            // Network mode for mutations
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
