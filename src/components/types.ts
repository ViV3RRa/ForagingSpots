export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export const FORAGING_TYPES = [
  'bay_bolete',
  'black_currant',
  'black_trumpet',
  'blackberry',
  'blueberry',
  'chanterelle',
  'cloudberry',
  'cranberry',
  'elderberry',
  'field_mushroom',
  'generic_berry',
  'generic_mushroom',
  'hedgehog_mushroom',
  'lingonberry',
  'oyster',
  'parasol_mushroom',
  'porcini',
  'raspberry',
  'red_currant',
  'rosehip',
  'seabuckthorn',
  'sheathed_woodtuft',
  'sloe',
  'wild_strawberry',
  'other'
] as const;

export type ForagingType = typeof FORAGING_TYPES[number];

export interface ForagingSpot {
  id: string;
  userId: string;
  type: ForagingType;
  coordinates: Coordinates;
  notes?: string;
  timestamp: Date;
  sharedWith: string[]; // Array of user emails
}

export interface MapPin {
  id: string;
  position: Coordinates;
  type: ForagingType;
  title: string;
  timestamp: Date;
}
