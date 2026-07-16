import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient shared across the application.
 *
 * Default config:
 *   - staleTime: 1 minute (data considered fresh for 60s)
 *   - gcTime: 5 minutes (cache retained after unmount)
 *   - retry: 1 (single retry on failure)
 *   - refetchOnWindowFocus: disabled in production for performance
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: process.env['NODE_ENV'] === 'development',
    },
    mutations: {
      retry: 0,
    },
  },
});
