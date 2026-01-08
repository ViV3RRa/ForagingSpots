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

class OfflineDatabase extends Dexie {
  pendingSpots!: Table<PendingSpot, string>;
  pendingImages!: Table<PendingImage, string>;

  constructor() {
    super('ForagingSpotsOffline');
    this.version(1).stores({
      pendingSpots: 'localId',
      pendingImages: 'id, spotId'
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Helper to generate unique local IDs
export function generateLocalId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
