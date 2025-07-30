import pb, { Collections } from './pocketbase';
import { ForagingSpotSchema, ForagingSpotCreateSchema, ForagingSpotUpdateSchema } from './schemas';
import type { ForagingSpot, ForagingSpotCreate, ForagingSpotUpdate, PocketBaseListResult } from './types';

// API service functions for foraging spots CRUD operations

export const foragingSpotsApi = {
  // Fetch all foraging spots for the current user
  async getAll(): Promise<ForagingSpot[]> {
    try {
      const records = await pb.collection(Collections.FORAGING_SPOTS).getFullList({
        sort: '-created',
        expand: 'user',
      });
      
      // Validate and parse each record with Zod
      return records.map(record => ForagingSpotSchema.parse(record));
    } catch (error) {
      console.error('Failed to fetch foraging spots:', error);
      throw new Error('Failed to fetch foraging spots');
    }
  },

  // Fetch paginated foraging spots
  async getList(page = 1, perPage = 50): Promise<PocketBaseListResult<ForagingSpot>> {
    try {
      const result = await pb.collection(Collections.FORAGING_SPOTS).getList(page, perPage, {
        sort: '-created',
        expand: 'user',
      });

      // Validate and parse each record
      const validatedItems = result.items.map(record => ForagingSpotSchema.parse(record));

      return {
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        items: validatedItems,
      };
    } catch (error) {
      console.error('Failed to fetch foraging spots list:', error);
      throw new Error('Failed to fetch foraging spots list');
    }
  },

  // Fetch a single foraging spot by ID
  async getById(id: string): Promise<ForagingSpot> {
    try {
      const record = await pb.collection(Collections.FORAGING_SPOTS).getOne(id, {
        expand: 'user',
      });
      
      return ForagingSpotSchema.parse(record);
    } catch (error) {
      console.error(`Failed to fetch foraging spot ${id}:`, error);
      throw new Error(`Failed to fetch foraging spot`);
    }
  },

  // Create a new foraging spot
  async create(data: ForagingSpotCreate): Promise<ForagingSpot> {
    try {
      // Validate input data
      const validatedData = ForagingSpotCreateSchema.parse(data);
      
      // Ensure user is authenticated
      if (!pb.authStore.isValid || !pb.authStore.model?.id) {
        throw new Error('User must be authenticated to create foraging spots');
      }

      // Create the record with user ID
      const record = await pb.collection(Collections.FORAGING_SPOTS).create({
        ...validatedData,
        user: pb.authStore.model.id,
      });

      // Fetch the created record with expanded user data
      const createdRecord = await pb.collection(Collections.FORAGING_SPOTS).getOne(record.id, {
        expand: 'user',
      });

      return ForagingSpotSchema.parse(createdRecord);
    } catch (error) {
      console.error('Failed to create foraging spot:', error);
      throw new Error('Failed to create foraging spot');
    }
  },

  // Update an existing foraging spot
  async update(id: string, data: ForagingSpotUpdate): Promise<ForagingSpot> {
    try {
      // Validate input data
      const validatedData = ForagingSpotUpdateSchema.parse(data);
      
      // Update the record
      const record = await pb.collection(Collections.FORAGING_SPOTS).update(id, validatedData);

      // Fetch the updated record with expanded user data
      const updatedRecord = await pb.collection(Collections.FORAGING_SPOTS).getOne(record.id, {
        expand: 'user',
      });

      return ForagingSpotSchema.parse(updatedRecord);
    } catch (error) {
      console.error(`Failed to update foraging spot ${id}:`, error);
      throw new Error('Failed to update foraging spot');
    }
  },

  // Delete a foraging spot
  async delete(id: string): Promise<void> {
    try {
      await pb.collection(Collections.FORAGING_SPOTS).delete(id);
    } catch (error) {
      console.error(`Failed to delete foraging spot ${id}:`, error);
      throw new Error('Failed to delete foraging spot');
    }
  },

  // Get foraging spots with filters
  async getFiltered(filters: {
    type?: string[];
    userId?: string;
    search?: string;
  } = {}): Promise<ForagingSpot[]> {
    try {
      const filterConditions: string[] = [];
      
      // Filter by type
      if (filters.type && filters.type.length > 0) {
        const typeFilter = filters.type.map(t => `type="${t}"`).join(' || ');
        filterConditions.push(`(${typeFilter})`);
      }
      
      // Filter by user
      if (filters.userId) {
        filterConditions.push(`user="${filters.userId}"`);
      }
      
      // Search in notes
      if (filters.search) {
        filterConditions.push(`notes~"${filters.search}"`);
      }

      const filter = filterConditions.length > 0 ? filterConditions.join(' && ') : '';

      const records = await pb.collection(Collections.FORAGING_SPOTS).getFullList({
        sort: '-created',
        expand: 'user',
        filter,
      });
      
      return records.map(record => ForagingSpotSchema.parse(record));
    } catch (error) {
      console.error('Failed to fetch filtered foraging spots:', error);
      throw new Error('Failed to fetch filtered foraging spots');
    }
  },
};

// Error handling utility
export function handleApiError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return new Error(String(error.message));
  }
  
  return new Error('An unknown error occurred');
}
