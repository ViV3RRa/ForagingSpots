import type { ForagingType } from '../components/types';

// All available foraging types
export const ALL_FORAGING_TYPES: ForagingType[] = [
  'chanterelle',
  'blueberry',
  'lingonberry',
  'cloudberry',
  'porcini',
  'oyster',
  'elderberry',
  'rosehip',
  'seabuckthorn',
  'generic_mushroom',
  'generic_berry',
  'other'
];

// Get all foraging types as a Set
export function getAllForagingTypesSet(): Set<ForagingType> {
  return new Set(ALL_FORAGING_TYPES);
}

// Get total number of foraging types
export function getTotalForagingTypes(): number {
  return ALL_FORAGING_TYPES.length;
}
