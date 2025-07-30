// Temporary compatibility layer to bridge old and new type systems
// This will be removed once all components are migrated to the new types

import type { User as NewUser, ForagingSpot as NewForagingSpot } from './types';
import type { User as OldUser, ForagingSpot as OldForagingSpot } from '../components/types';

// Convert new User type to old User type for compatibility
export function newUserToOld(user: NewUser): OldUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    password: '', // Password not stored in client state for security
  };
}

// Convert old User type to new User type
export function oldUserToNew(user: OldUser): NewUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: undefined,
    avatar: undefined,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

// Convert new ForagingSpot to old ForagingSpot for compatibility
export function newSpotToOld(spot: NewForagingSpot): OldForagingSpot {
  return {
    id: spot.id,
    userId: spot.user,
    type: spot.type,
    coordinates: spot.coordinates,
    notes: spot.notes,
    timestamp: new Date(spot.created),
    sharedWith: [], // Sharing will be implemented with shared_spots collection
  };
}

// Convert old ForagingSpot to new ForagingSpot
export function oldSpotToNew(spot: OldForagingSpot): NewForagingSpot {
  return {
    id: spot.id,
    user: spot.userId,
    type: spot.type,
    coordinates: spot.coordinates,
    notes: spot.notes,
    created: spot.timestamp.toISOString(),
    updated: spot.timestamp.toISOString(),
  };
}

// Convert array of new spots to old spots
export function newSpotsToOld(spots: NewForagingSpot[]): OldForagingSpot[] {
  return spots.map(newSpotToOld);
}

// Convert array of old spots to new spots
export function oldSpotsToNew(spots: OldForagingSpot[]): NewForagingSpot[] {
  return spots.map(oldSpotToNew);
}
