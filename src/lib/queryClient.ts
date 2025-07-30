import { QueryClient } from '@tanstack/react-query';

// Create and configure the QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data stays fresh (no refetch needed)
      staleTime: 5 * 60 * 1000, // 5 minutes
      // How long data stays in cache when not being used
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (useful for real-time updates)
      refetchOnWindowFocus: true,
      // Refetch when coming back online
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        // Retry up to 2 times for mutations
        return failureCount < 2;
      },
      // Retry delay for mutations
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // All foraging spots queries
  foragingSpots: {
    all: ['foraging-spots'] as const,
    lists: () => [...queryKeys.foragingSpots.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.foragingSpots.lists(), filters] as const,
    details: () => [...queryKeys.foragingSpots.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.foragingSpots.details(), id] as const,
  },
  // User-related queries
  users: {
    all: ['users'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  // Shared spots queries (for future use)
  sharedSpots: {
    all: ['shared-spots'] as const,
    lists: () => [...queryKeys.sharedSpots.all, 'list'] as const,
    list: (userId?: string) => [...queryKeys.sharedSpots.lists(), userId] as const,
  },
} as const;
