import Dexie, { type Table } from 'dexie';
import type { ForagingType, Coordinates } from './types';

// Pending spot stored in IndexedDB
export interface PendingSpot {
  localId: string;
  type: ForagingType;
  coordinates: Coordinates;
  notes?: string;
  sharedWith: string[];
  createdAt: string;
}

// Image blob stored in IndexedDB
export interface PendingImage {
  id: string;
  spotId: string;
  blob: Blob;
  filename: string;
}

// Single-row snapshot of the dehydrated TanStack Query client (plan 007).
// Scoped to one user so a restore can never leak another user's spots.
export interface PersistedQueryCache {
  key: string;      // fixed 'reactQuery' — only ever one row
  userId: string;   // owner scope; restore rejects a mismatch
  buster: string;   // schema version tag; a change drops the old payload
  savedAt: number;  // Date.now() at write, for maxAge gc
  client: unknown;  // dehydrated client JSON
}

class OfflineDatabase extends Dexie {
  pendingSpots!: Table<PendingSpot, string>;
  pendingImages!: Table<PendingImage, string>;
  persistedQueryCache!: Table<PersistedQueryCache, string>;

  constructor() {
    super('ForagingSpotsOffline');
    this.version(1).stores({
      pendingSpots: 'localId',
      pendingImages: 'id, spotId'
    });
    // v2 adds the query-cache row (additive — existing offline data untouched)
    this.version(2).stores({
      pendingSpots: 'localId',
      pendingImages: 'id, spotId',
      persistedQueryCache: 'key'
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Helper to generate unique local IDs
export function generateLocalId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
