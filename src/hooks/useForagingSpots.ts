import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { foragingSpotsApi, handleApiError } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import type { ForagingSpot, ForagingSpotCreate, ForagingSpotUpdate, ForagingType, ForagingSpotWithPending } from '../lib/types';
import { toast } from 'sonner';
import { usePendingSpots, addPendingSpot, updatePendingSpot, deletePendingSpot, pendingSpotsQueryKey } from './usePendingSpots';

// Hook to fetch all foraging spots (merged with pending offline spots)
export function useForagingSpots(isAuthenticated: boolean = true) {
  const { pendingSpots } = usePendingSpots();

  const query = useQuery({
    queryKey: queryKeys.foragingSpots.all,
    queryFn: foragingSpotsApi.getAll,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Merge server spots with pending offline spots
  const data = useMemo((): ForagingSpotWithPending[] => {
    const serverSpots = (query.data || []) as ForagingSpotWithPending[];
    // Pending spots appear first
    return [...pendingSpots, ...serverSpots];
  }, [query.data, pendingSpots]);

  return {
    ...query,
    data,
  };
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

// Hook to create a new foraging spot (offline-aware)
export function useCreateSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    // Run mutations immediately even when offline - we handle offline logic ourselves
    // Without this, TanStack Query v5 pauses mutations when device goes offline mid-session
    networkMode: 'always',
    mutationFn: async (newSpot: ForagingSpotCreate) => {
      // Check navigator.onLine directly - NOT from React state
      // React state would be stale if device went offline after hook mounted
      if (navigator.onLine) {
        // Online: use normal API
        return foragingSpotsApi.create(newSpot);
      } else {
        // Offline: save to IndexedDB first, then return the result
        // This ensures the spot is persisted before showing in UI
        const localId = await addPendingSpot({
          type: newSpot.type,
          coordinates: newSpot.coordinates,
          notes: newSpot.notes,
          images: newSpot.images as File[],
          sharedWith: newSpot.sharedWith,
        });

        // Return with the ACTUAL ID that was saved to IndexedDB
        const pendingSpot: ForagingSpotWithPending = {
          id: localId,
          user: 'current-user',
          type: newSpot.type,
          coordinates: newSpot.coordinates,
          notes: newSpot.notes,
          images: [],
          sharedWith: newSpot.sharedWith,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _pending: true,
        };

        return pendingSpot;
      }
    },
    // NOTE: No onMutate optimistic update for offline creates
    // This prevents ID mismatch between temp-ID and actual pending-ID
    // The UI updates via pendingSpotsQueryKey invalidation after IndexedDB write succeeds
    onError: (error) => {
      const errorMessage = handleApiError(error).message;
      toast.error('Kunne ikke gemme — prøv igen', {
        description: errorMessage,
      });
    },
    onSuccess: (data) => {
      if ((data as ForagingSpotWithPending)._pending) {
        // Offline: invalidate and force refetch pending spots query to show the new spot
        // refetchType 'all' ensures immediate refetch even with staleTime: Infinity
        queryClient.invalidateQueries({ queryKey: pendingSpotsQueryKey, refetchType: 'all' });
        toast.info('Fund gemt offline', {
          description: 'Synkroniseres når forbindelsen genoprettes',
        });
      } else {
        // Online: update server spots cache
        queryClient.setQueryData<ForagingSpot>(queryKeys.foragingSpots.detail(data.id), data);
        queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
        toast.success('Fund gemt');
      }
    },
  });
}

// Hook to update a foraging spot (offline-aware for pending spots)
export function useUpdateSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    // Run mutations immediately even when offline - we handle offline logic ourselves
    networkMode: 'always',
    mutationFn: async ({ id, data }: { id: string; data: ForagingSpotUpdate }) => {
      const isPendingSpot = id.startsWith('pending-');

      if (isPendingSpot) {
        // Update pending spot directly in IndexedDB
        await updatePendingSpot(id, data);
        // Return updated spot shape for optimistic UI
        return { id, ...data, _pending: true } as ForagingSpotWithPending;
      }

      // Server spot - use API
      return foragingSpotsApi.update(id, data);
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.foragingSpots.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.foragingSpots.detail(id) });

      // Snapshot the previous values
      const previousSpots = queryClient.getQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all);
      const previousSpot = queryClient.getQueryData<ForagingSpot>(queryKeys.foragingSpots.detail(id));

      // The payload's image keys must not be spread into cached spots: `images`
      // holds File objects for upload and a cached spot's `images` holds server
      // filenames (components render them through getFileUrl — a File there
      // crashes the detail drawer, which stays mounted behind the edit sheet).
      // Optimistically a spot shows the kept existing images; the new uploads
      // appear when onSuccess writes the server record.
      const { images: newImageFiles, existingImageFilenames, ...fields } = data;
      const patch = {
        ...fields,
        ...(newImageFiles !== undefined || existingImageFilenames !== undefined
          ? { images: existingImageFilenames ?? [] }
          : {}),
        updated: new Date().toISOString(),
      };

      // Optimistically update the list
      if (previousSpots) {
        const updatedSpots = previousSpots.map(spot =>
          spot.id === id ? { ...spot, ...patch } : spot
        );
        queryClient.setQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all, updatedSpots);
      }

      // Optimistically update the individual spot
      if (previousSpot) {
        queryClient.setQueryData<ForagingSpot>(queryKeys.foragingSpots.detail(id), {
          ...previousSpot,
          ...patch,
        });
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
      toast.error('Kunne ikke opdatere — prøv igen', {
        description: errorMessage,
      });
    },
    onSuccess: (data) => {
      const isPendingSpot = (data as ForagingSpotWithPending)._pending;

      if (isPendingSpot) {
        // Pending spot updated in IndexedDB - invalidate and force refetch
        queryClient.invalidateQueries({ queryKey: pendingSpotsQueryKey, refetchType: 'all' });
        toast.success('Fund opdateret', {
          description: 'Synkroniseres når forbindelsen genoprettes',
        });
      } else {
        // Server spot - update cache
        queryClient.setQueryData<ForagingSpot>(queryKeys.foragingSpots.detail(data.id), data);
        queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
        toast.success('Fund opdateret');
      }
    },
  });
}

// Hook to delete a foraging spot (offline-aware for pending spots)
export function useDeleteSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    // Run mutations immediately even when offline - we handle offline logic ourselves
    networkMode: 'always',
    mutationFn: async (id: string) => {
      const isPendingSpot = id.startsWith('pending-');

      if (isPendingSpot) {
        // Delete pending spot from IndexedDB
        await deletePendingSpot(id);
        return { id, _pending: true };
      }

      // Server spot - use API
      await foragingSpotsApi.delete(id);
      return { id, _pending: false };
    },
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
      toast.error('Kunne ikke slette — prøv igen', {
        description: errorMessage,
      });
    },
    onSuccess: (result) => {
      if (result._pending) {
        // Pending spot deleted from IndexedDB - invalidate and force refetch
        queryClient.invalidateQueries({ queryKey: pendingSpotsQueryKey, refetchType: 'all' });
        toast.success('Fund slettet');
      } else {
        // Server spot - update cache
        queryClient.removeQueries({ queryKey: queryKeys.foragingSpots.detail(result.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
        toast.success('Fund slettet');
      }
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
