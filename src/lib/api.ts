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
      
      // Debug logging
      console.log('Raw foraging spots from API:', records);
      
      // Validate and parse each record with Zod
      return records.map(record => {
        console.log('Processing record:', record);
        const parsed = ForagingSpotSchema.parse(record);
        console.log('Parsed record:', parsed);
        return parsed;
      });
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

      // Prepare form data for file uploads
      const formData = new FormData();
      formData.append('type', validatedData.type);
      formData.append('coordinates', JSON.stringify(validatedData.coordinates));
      formData.append('user', pb.authStore.model.id);
      
      if (validatedData.notes) {
        formData.append('notes', validatedData.notes);
      }
      
      if (validatedData.sharedWith.length > 0) {
        formData.append('sharedWith', JSON.stringify(validatedData.sharedWith));
      }

      // Add image files to form data
      if (validatedData.images && validatedData.images.length > 0) {
        validatedData.images.forEach((file: File) => {
          formData.append('images', file);
        });
      }

      // Create the record with files
      const record = await pb.collection(Collections.FORAGING_SPOTS).create(formData);

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
      
      // Prepare form data for file uploads
      const formData = new FormData();
      
      if (validatedData.type) {
        formData.append('type', validatedData.type);
      }
      
      if (validatedData.coordinates) {
        formData.append('coordinates', JSON.stringify(validatedData.coordinates));
      }
      
      if (validatedData.notes !== undefined) {
        formData.append('notes', validatedData.notes);
      }

      // Handle image updates: combine existing filenames with new files
      if (validatedData.images || validatedData.existingImageFilenames) {
        console.log('Processing image updates:', {
          newFiles: validatedData.images?.length || 0,
          existingFilenames: validatedData.existingImageFilenames || []
        });
        
        // For PocketBase file fields, we need to:
        // 1. Send existing filenames as strings to keep them
        // 2. Send new Files to upload them
        // 3. Any existing files NOT included will be deleted
        
        // First add existing image filenames to keep
        if (validatedData.existingImageFilenames && validatedData.existingImageFilenames.length > 0) {
          validatedData.existingImageFilenames.forEach((filename: string) => {
            console.log('Keeping existing image:', filename);
            formData.append('images', filename);
          });
        }
        
        // Then add new image files to upload
        if (validatedData.images && validatedData.images.length > 0) {
          validatedData.images.forEach((file: File, index: number) => {
            console.log(`Adding new image file ${index + 1}:`, file.name, file.size);
            formData.append('images', file);
          });
        }
        
        // If neither existing nor new images, this means remove all images
        if ((!validatedData.existingImageFilenames || validatedData.existingImageFilenames.length === 0) &&
            (!validatedData.images || validatedData.images.length === 0)) {
          console.log('Removing all images');
          formData.append('images', ''); // Empty string removes all files
        }
      }

      // Update the record
      const record = await pb.collection(Collections.FORAGING_SPOTS).update(id, formData);

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
