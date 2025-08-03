import { z } from 'zod';
import { FORAGING_TYPES } from '../components/types';

// Coordinates schema
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Foraging type enum schema
export const ForagingTypeSchema = z.enum(FORAGING_TYPES);

// User schema (for Pocketbase users collection)
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  username: z.string().optional(),
  avatar: z.string().optional(),
  created: z.string(),
  updated: z.string(),
  // Note: password field is not included for security reasons
  // It's only used during registration and not stored in client state
});

// User login schema (for form validation)
export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Foraging spot schema (for Pocketbase foraging_spots collection)
export const ForagingSpotSchema = z.object({
  id: z.string(),
  user: z.string(), // Pocketbase relation field
  type: ForagingTypeSchema,
  coordinates: CoordinatesSchema,
  notes: z.string().optional(),
  created: z.string(),
  updated: z.string(),
  sharedWith: z.array(z.string()).default([]), // Array of email addresses for sharing
  // Pocketbase expand fields (populated when using expand query)
  expand: z.object({
    user: UserSchema.optional(),
  }).optional(),
});

// Foraging spot creation schema (for form validation)
export const ForagingSpotCreateSchema = z.object({
  type: ForagingTypeSchema,
  coordinates: CoordinatesSchema,
  notes: z.string().optional(),
  sharedWith: z.array(z.string()).default([]),
});

// Foraging spot update schema (for form validation)
export const ForagingSpotUpdateSchema = z.object({
  type: ForagingTypeSchema.optional(),
  coordinates: CoordinatesSchema.optional(),
  notes: z.string().optional(),
});

// Map pin schema (for UI display)
export const MapPinSchema = z.object({
  id: z.string(),
  position: CoordinatesSchema,
  type: ForagingTypeSchema,
  title: z.string(),
  timestamp: z.date(),
});

// Shared spot schema (if implementing sharing functionality later)
export const SharedSpotSchema = z.object({
  id: z.string(),
  spot: z.string(), // Relation to foraging_spots
  shared_with: z.string(), // Relation to users
  shared_by: z.string(), // Relation to users
  created: z.string(),
  updated: z.string(),
});
