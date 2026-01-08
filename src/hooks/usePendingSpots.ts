import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { offlineDb, generateLocalId, type PendingSpot, type PendingImage } from '../lib/offlineDb';
import { foragingSpotsApi } from '../lib/api';
import type { ForagingType, Coordinates, ForagingSpotWithPending } from '../lib/types';
import { toast } from 'sonner';

// Query key for pending spots - exported for use in other hooks
export const pendingSpotsQueryKey = ['pendingSpots'];

interface AddPendingSpotParams {
  type: ForagingType;
  coordinates: Coordinates;
  notes?: string;
  images: File[];
  sharedWith: string[];
}

// Add a spot to the offline queue
export async function addPendingSpot(params: AddPendingSpotParams): Promise<string> {
  const localId = generateLocalId();

  // Store the spot
  const pendingSpot: PendingSpot = {
    localId,
    type: params.type,
    coordinates: params.coordinates,
    notes: params.notes,
    sharedWith: params.sharedWith,
    createdAt: new Date().toISOString(),
  };

  await offlineDb.pendingSpots.add(pendingSpot);

  // Store each image as a blob
  for (const file of params.images) {
    const pendingImage: PendingImage = {
      id: `${localId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      spotId: localId,
      blob: file,
      filename: file.name,
    };
    await offlineDb.pendingImages.add(pendingImage);
  }

  return localId;
}

// Get all pending spots
export async function getPendingSpots(): Promise<PendingSpot[]> {
  return await offlineDb.pendingSpots.toArray();
}

// Get images for a pending spot
export async function getPendingImages(spotId: string): Promise<File[]> {
  const images = await offlineDb.pendingImages.where('spotId').equals(spotId).toArray();
  return images.map(img => new File([img.blob], img.filename, { type: img.blob.type }));
}

// Get image URLs for display (object URLs from blobs)
export async function getPendingImageUrls(spotId: string): Promise<string[]> {
  const images = await offlineDb.pendingImages.where('spotId').equals(spotId).toArray();
  return images.map(img => URL.createObjectURL(img.blob));
}

// Delete a pending spot and its images
export async function deletePendingSpot(localId: string): Promise<void> {
  await offlineDb.pendingImages.where('spotId').equals(localId).delete();
  await offlineDb.pendingSpots.delete(localId);
}

// Update a pending spot in IndexedDB
export async function updatePendingSpot(
  localId: string,
  data: { type?: ForagingType; coordinates?: Coordinates; notes?: string; sharedWith?: string[]; images?: File[] }
): Promise<void> {
  const updates: Partial<PendingSpot> = {};
  if (data.type !== undefined) updates.type = data.type;
  if (data.coordinates !== undefined) updates.coordinates = data.coordinates;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.sharedWith !== undefined) updates.sharedWith = data.sharedWith;

  await offlineDb.pendingSpots.update(localId, updates);

  // Update images if provided
  if (data.images !== undefined) {
    // Delete existing images for this spot
    await offlineDb.pendingImages.where('spotId').equals(localId).delete();

    // Add new images
    for (const file of data.images) {
      const pendingImage: PendingImage = {
        id: `${localId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        spotId: localId,
        blob: file,
        filename: file.name,
      };
      await offlineDb.pendingImages.add(pendingImage);
    }
  }
}

// Sync all pending spots to the server
export async function syncPendingSpots(): Promise<{ synced: number; failed: number }> {
  const pendingSpots = await getPendingSpots();

  if (pendingSpots.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const spot of pendingSpots) {
    try {
      // Get images for this spot
      const images = await getPendingImages(spot.localId);

      // Upload to server
      await foragingSpotsApi.create({
        type: spot.type,
        coordinates: spot.coordinates,
        notes: spot.notes,
        images,
        sharedWith: spot.sharedWith,
      });

      // Remove from local storage on success
      await deletePendingSpot(spot.localId);
      synced++;
    } catch (error) {
      console.error(`Failed to sync spot ${spot.localId}:`, error);
      failed++;
    }
  }

  return { synced, failed };
}

// Convert pending spot to ForagingSpotWithPending for display
export function pendingSpotToForagingSpot(spot: PendingSpot): ForagingSpotWithPending {
  return {
    id: spot.localId,
    user: 'current-user',
    type: spot.type,
    coordinates: spot.coordinates,
    notes: spot.notes,
    images: [], // Images loaded separately via getPendingImageUrls
    sharedWith: spot.sharedWith,
    created: spot.createdAt,
    updated: spot.createdAt,
    _pending: true,
  };
}

// Hook to get and manage pending spots (uses TanStack Query for shared state)
export function usePendingSpots() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Use TanStack Query for pending spots - shared across all hook instances
  const { data: pendingSpots = [] } = useQuery({
    queryKey: pendingSpotsQueryKey,
    queryFn: async () => {
      const spots = await getPendingSpots();
      return spots.map(pendingSpotToForagingSpot);
    },
    staleTime: Infinity, // Only refetch when explicitly invalidated
    // Allow query to run/refetch even when offline - data is from local IndexedDB
    networkMode: 'always',
  });

  // Refresh by invalidating the query - triggers re-render in all components
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: pendingSpotsQueryKey });
  }, [queryClient]);

  // Sync function
  const sync = useCallback(async () => {
    if (isSyncing) return;

    const spots = await getPendingSpots();
    if (spots.length === 0) return;

    setIsSyncing(true);

    try {
      const result = await syncPendingSpots();

      if (result.synced > 0) {
        toast.success(`${result.synced} spot${result.synced > 1 ? 's' : ''} synced`);
      }

      if (result.failed > 0) {
        toast.error(`${result.failed} spot${result.failed > 1 ? 's' : ''} failed to sync`);
      }

      // Invalidate to reload pending spots
      refresh();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refresh]);

  return {
    pendingSpots,
    isSyncing,
    sync,
    refresh,
  };
}
