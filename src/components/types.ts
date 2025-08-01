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

export type ForagingType = 'chanterelle' | 'blueberry' | 'lingonberry' | 'cloudberry' | 'porcini' | 'oyster' | 'elderberry' | 'rosehip' | 'seabuckthorn' | 'generic_mushroom' | 'generic_berry' | 'other';

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
