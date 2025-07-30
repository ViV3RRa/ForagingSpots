import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foragingSpotsApi, handleApiError } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import type { ForagingSpot, ForagingSpotCreate, ForagingSpotUpdate, ForagingType } from '../lib/types';
import { toast } from 'sonner';

// Hook to fetch all foraging spots
export function useForagingSpots() {
  return useQuery({
    queryKey: queryKeys.foragingSpots.all,
    queryFn: foragingSpotsApi.getAll,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch filtered foraging spots
export function useFilteredForagingSpots(filters: {
  type?: ForagingType[];
  userId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.foragingSpots.list(filters),
    queryFn: () => foragingSpotsApi.getFiltered({
      type: filters.type,
      userId: filters.userId,
      search: filters.search,
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!(filters.type || filters.userId || filters.search), // Only run if filters are provided
  });
}

// Hook to fetch a single foraging spot
export function useForagingSpot(id: string) {
  return useQuery({
    queryKey: queryKeys.foragingSpots.detail(id),
    queryFn: () => foragingSpotsApi.getById(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id, // Only run if ID is provided
  });
}

// Hook to create a new foraging spot
export function useCreateSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: foragingSpotsApi.create,
    onMutate: async (newSpot: ForagingSpotCreate) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.foragingSpots.all });

      // Snapshot the previous value
      const previousSpots = queryClient.getQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all);

      // Optimistically update to the new value
      if (previousSpots) {
        const optimisticSpot: ForagingSpot = {
          id: `temp-${Date.now()}`, // Temporary ID
          user: 'current-user', // Will be replaced with actual user ID
          ...newSpot,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };

        queryClient.setQueryData<ForagingSpot[]>(
          queryKeys.foragingSpots.all,
          [...previousSpots, optimisticSpot]
        );
      }

      // Return a context object with the snapshotted value
      return { previousSpots };
    },
    onError: (error, _newSpot, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSpots) {
        queryClient.setQueryData(queryKeys.foragingSpots.all, context.previousSpots);
      }
      
      const errorMessage = handleApiError(error).message;
      toast.error('Failed to create foraging spot', {
        description: errorMessage,
      });
    },
    onSuccess: (data) => {
      // Update the cache with the server response
      queryClient.setQueryData<ForagingSpot>(queryKeys.foragingSpots.detail(data.id), data);
      
      // Invalidate and refetch the list
      queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
      
      toast.success('Foraging spot created successfully!');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
    },
  });
}

// Hook to update a foraging spot
export function useUpdateSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ForagingSpotUpdate }) =>
      foragingSpotsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.foragingSpots.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.foragingSpots.detail(id) });

      // Snapshot the previous values
      const previousSpots = queryClient.getQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all);
      const previousSpot = queryClient.getQueryData<ForagingSpot>(queryKeys.foragingSpots.detail(id));

      // Optimistically update the list
      if (previousSpots) {
        const updatedSpots = previousSpots.map(spot =>
          spot.id === id
            ? { ...spot, ...data, updated: new Date().toISOString() }
            : spot
        );
        queryClient.setQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all, updatedSpots);
      }

      // Optimistically update the individual spot
      if (previousSpot) {
        const updatedSpot = { ...previousSpot, ...data, updated: new Date().toISOString() };
        queryClient.setQueryData<ForagingSpot>(queryKeys.foragingSpots.detail(id), updatedSpot);
      }

      return { previousSpots, previousSpot };
    },
    onError: (error, { id }, context) => {
      // Roll back optimistic updates
      if (context?.previousSpots) {
        queryClient.setQueryData(queryKeys.foragingSpots.all, context.previousSpots);
      }
      if (context?.previousSpot) {
        queryClient.setQueryData(queryKeys.foragingSpots.detail(id), context.previousSpot);
      }

      const errorMessage = handleApiError(error).message;
      toast.error('Failed to update foraging spot', {
        description: errorMessage,
      });
    },
    onSuccess: (data) => {
      // Update the cache with the server response
      queryClient.setQueryData<ForagingSpot>(queryKeys.foragingSpots.detail(data.id), data);
      
      // Invalidate the list to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
      
      toast.success('Foraging spot updated successfully!');
    },
  });
}

// Hook to delete a foraging spot
export function useDeleteSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: foragingSpotsApi.delete,
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.foragingSpots.all });

      // Snapshot the previous value
      const previousSpots = queryClient.getQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all);

      // Optimistically remove the spot
      if (previousSpots) {
        const filteredSpots = previousSpots.filter(spot => spot.id !== id);
        queryClient.setQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all, filteredSpots);
      }

      return { previousSpots };
    },
    onError: (error, _id, context) => {
      // Roll back the optimistic update
      if (context?.previousSpots) {
        queryClient.setQueryData(queryKeys.foragingSpots.all, context.previousSpots);
      }

      const errorMessage = handleApiError(error).message;
      toast.error('Failed to delete foraging spot', {
        description: errorMessage,
      });
    },
    onSuccess: (_, id) => {
      // Remove the individual spot from cache
      queryClient.removeQueries({ queryKey: queryKeys.foragingSpots.detail(id) });
      
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
      
      toast.success('Foraging spot deleted successfully!');
    },
  });
}

// Utility hook to prefetch a foraging spot
export function usePrefetchForagingSpot() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.foragingSpots.detail(id),
      queryFn: () => foragingSpotsApi.getById(id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
}
