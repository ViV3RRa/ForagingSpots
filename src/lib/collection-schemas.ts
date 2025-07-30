import { z } from 'zod';

// Pocketbase collection field types
export const PocketBaseFieldTypes = {
  TEXT: 'text',
  NUMBER: 'number',
  BOOL: 'bool',
  EMAIL: 'email',
  URL: 'url',
  DATE: 'date',
  SELECT: 'select',
  JSON: 'json',
  FILE: 'file',
  RELATION: 'relation',
  USER: 'user',
  AUTODATE: 'autodate',
} as const;

// Collection schema definitions that match our Zod schemas
export const CollectionSchemas = {
  // Users collection (auth type)
  users: {
    name: 'users',
    type: 'auth' as const,
    fields: {
      name: {
        type: PocketBaseFieldTypes.TEXT,
        required: true,
        options: {
          min: 1,
          max: 100,
        },
      },
      avatar: {
        type: PocketBaseFieldTypes.FILE,
        required: false,
        options: {
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
          thumbs: ['100x100'],
        },
      },
    },
    authOptions: {
      allowEmailAuth: true,
      allowOAuth2Auth: false,
      allowUsernameAuth: false,
      minPasswordLength: 6,
      requireEmail: true,
    },
    apiRules: {
      listRule: 'id = @request.auth.id',
      viewRule: 'id = @request.auth.id',
      createRule: '',
      updateRule: 'id = @request.auth.id',
      deleteRule: 'id = @request.auth.id',
    },
  },

  // Foraging spots collection
  foraging_spots: {
    name: 'foraging_spots',
    type: 'base' as const,
    fields: {
      user: {
        type: PocketBaseFieldTypes.RELATION,
        required: true,
        options: {
          collectionId: 'users',
          cascadeDelete: true,
          maxSelect: 1,
          displayFields: ['name', 'email'],
        },
      },
      type: {
        type: PocketBaseFieldTypes.SELECT,
        required: true,
        options: {
          maxSelect: 1,
          values: ['chanterelle', 'blueberry', 'lingonberry', 'cloudberry', 'other'],
        },
      },
      coordinates: {
        type: PocketBaseFieldTypes.JSON,
        required: true,
        options: {
          maxSize: 1000,
        },
      },
      notes: {
        type: PocketBaseFieldTypes.TEXT,
        required: false,
        options: {
          max: 1000,
        },
      },
    },
    indexes: [
      'CREATE INDEX idx_foraging_spots_user ON foraging_spots (user)',
      'CREATE INDEX idx_foraging_spots_type ON foraging_spots (type)',
      'CREATE INDEX idx_foraging_spots_created ON foraging_spots (created)',
    ],
    apiRules: {
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
    },
  },

  // Shared spots collection (junction table)
  shared_spots: {
    name: 'shared_spots',
    type: 'base' as const,
    fields: {
      spot: {
        type: PocketBaseFieldTypes.RELATION,
        required: true,
        options: {
          collectionId: 'foraging_spots',
          cascadeDelete: true,
          maxSelect: 1,
          displayFields: ['type', 'created'],
        },
      },
      shared_with: {
        type: PocketBaseFieldTypes.RELATION,
        required: true,
        options: {
          collectionId: 'users',
          cascadeDelete: true,
          maxSelect: 1,
          displayFields: ['name', 'email'],
        },
      },
      shared_by: {
        type: PocketBaseFieldTypes.RELATION,
        required: true,
        options: {
          collectionId: 'users',
          cascadeDelete: true,
          maxSelect: 1,
          displayFields: ['name', 'email'],
        },
      },
    },
    indexes: [
      'CREATE INDEX idx_shared_spots_spot ON shared_spots (spot)',
      'CREATE INDEX idx_shared_spots_shared_with ON shared_spots (shared_with)',
      'CREATE INDEX idx_shared_spots_shared_by ON shared_spots (shared_by)',
      'CREATE UNIQUE INDEX idx_shared_spots_unique ON shared_spots (spot, shared_with)',
    ],
    apiRules: {
      listRule: '@request.auth.id != "" && (shared_with = @request.auth.id || shared_by = @request.auth.id)',
      viewRule: '@request.auth.id != "" && (shared_with = @request.auth.id || shared_by = @request.auth.id)',
      createRule: '@request.auth.id != "" && shared_by = @request.auth.id',
      updateRule: '@request.auth.id != "" && shared_by = @request.auth.id',
      deleteRule: '@request.auth.id != "" && shared_by = @request.auth.id',
    },
  },
} as const;

// Validation schemas for collection data
export const CollectionValidationSchemas = {
  // Validate coordinates JSON field
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),

  // Validate foraging spot type
  foragingType: z.enum(['chanterelle', 'blueberry', 'lingonberry', 'cloudberry', 'other']),

  // Validate user data
  userData: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    avatar: z.string().optional(),
  }),

  // Validate foraging spot data
  foragingSpotData: z.object({
    user: z.string(),
    type: z.enum(['chanterelle', 'blueberry', 'lingonberry', 'cloudberry', 'other']),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    notes: z.string().max(1000).optional(),
  }),

  // Validate shared spot data
  sharedSpotData: z.object({
    spot: z.string(),
    shared_with: z.string(),
    shared_by: z.string(),
  }),
} as const;

// Type definitions for collection schemas
export type CollectionName = keyof typeof CollectionSchemas;
export type CollectionSchema = typeof CollectionSchemas[CollectionName];
export type FieldType = typeof PocketBaseFieldTypes[keyof typeof PocketBaseFieldTypes];

// Helper function to get collection schema
export function getCollectionSchema(name: CollectionName): CollectionSchema {
  return CollectionSchemas[name];
}

// Helper function to validate collection data
export function validateCollectionData(collection: CollectionName, data: unknown) {
  switch (collection) {
    case 'users':
      return CollectionValidationSchemas.userData.parse(data);
    case 'foraging_spots':
      return CollectionValidationSchemas.foragingSpotData.parse(data);
    case 'shared_spots':
      return CollectionValidationSchemas.sharedSpotData.parse(data);
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}
