import { FORAGING_TYPES, type ForagingType } from '../components/types';

// Get all foraging types as a Set
export function getAllForagingTypesSet(): Set<ForagingType> {
  return new Set(FORAGING_TYPES);
}

// Get total number of foraging types
export function getTotalForagingTypes(): number {
  return FORAGING_TYPES.length;
}
