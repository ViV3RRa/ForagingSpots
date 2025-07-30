import { z } from 'zod';
import {
  CoordinatesSchema,
  ForagingTypeSchema,
  UserSchema,
  UserLoginSchema,
  ForagingSpotSchema,
  ForagingSpotCreateSchema,
  ForagingSpotUpdateSchema,
  MapPinSchema,
  SharedSpotSchema,
} from './schemas';

// Infer TypeScript types from Zod schemas
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type ForagingType = z.infer<typeof ForagingTypeSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type ForagingSpot = z.infer<typeof ForagingSpotSchema>;
export type ForagingSpotCreate = z.infer<typeof ForagingSpotCreateSchema>;
export type ForagingSpotUpdate = z.infer<typeof ForagingSpotUpdateSchema>;
export type MapPin = z.infer<typeof MapPinSchema>;
export type SharedSpot = z.infer<typeof SharedSpotSchema>;

// Additional utility types for API responses
export type PocketBaseRecord = {
  id: string;
  created: string;
  updated: string;
};

export type PocketBaseListResult<T> = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
};

// Auth state type
export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

// API error type
export type ApiError = {
  message: string;
  status?: number;
  data?: Record<string, unknown>;
};
