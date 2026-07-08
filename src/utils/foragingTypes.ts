import { FORAGING_TYPES, type ForagingType } from '../components/types';

// Get all foraging types as a Set
export function getAllForagingTypesSet(): Set<ForagingType> {
  return new Set(FORAGING_TYPES);
}

// Get total number of foraging types
export function getTotalForagingTypes(): number {
  return FORAGING_TYPES.length;
}

export type ForagingCategory = 'mushroom' | 'berry' | 'other';

// Category map for the filter sheet's Alle/Svampe/Bær segment. 'other' is its
// own bucket: it is only included under "Alle", not under "Svampe" or "Bær",
// since a generic find isn't necessarily either.
const FORAGING_CATEGORIES: Record<ForagingType, ForagingCategory> = {
  bay_bolete: 'mushroom',
  black_currant: 'berry',
  black_trumpet: 'mushroom',
  blackberry: 'berry',
  blueberry: 'berry',
  chanterelle: 'mushroom',
  cloudberry: 'berry',
  cranberry: 'berry',
  elderberry: 'berry',
  field_mushroom: 'mushroom',
  generic_berry: 'berry',
  generic_mushroom: 'mushroom',
  hedgehog_mushroom: 'mushroom',
  lingonberry: 'berry',
  oyster: 'mushroom',
  parasol_mushroom: 'mushroom',
  porcini: 'mushroom',
  raspberry: 'berry',
  red_currant: 'berry',
  rosehip: 'berry',
  seabuckthorn: 'berry',
  sheathed_woodtuft: 'mushroom',
  sloe: 'berry',
  wild_strawberry: 'berry',
  other: 'other',
};

export function getForagingCategory(type: ForagingType): ForagingCategory {
  return FORAGING_CATEGORIES[type];
}

export function getTypesInCategory(category: ForagingCategory): ForagingType[] {
  return FORAGING_TYPES.filter((type) => FORAGING_CATEGORIES[type] === category);
}
