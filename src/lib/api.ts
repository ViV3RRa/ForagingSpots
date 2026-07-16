import { ClientResponseError } from 'pocketbase';
import pb, { Collections } from './pocketbase';
import { ForagingSpotSchema, ForagingSpotCreateSchema, ForagingSpotUpdateSchema } from './schemas';
import type { ForagingSpot, ForagingSpotCreate, ForagingSpotUpdate, PocketBaseListResult } from './types';

// API service functions for foraging spots CRUD operations

// Parse a list of records, skipping (and warning about) invalid ones so a
// single malformed record can't blank the whole map/list
function parseSpotRecords(records: unknown[]): ForagingSpot[] {
  const spots: ForagingSpot[] = [];
  for (const record of records) {
    const result = ForagingSpotSchema.safeParse(record);
    if (result.success) {
      spots.push(result.data);
    } else {
      console.warn('Skipping invalid foraging spot record:', record, result.error);
    }
  }
  return spots;
}

export const foragingSpotsApi = {
  // Fetch all foraging spots for the current user
  async getAll(): Promise<ForagingSpot[]> {
    try {
      const records = await pb.collection(Collections.FORAGING_SPOTS).getFullList({
        sort: '-created',
        expand: 'user',
      });
      
      return parseSpotRecords(records);
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
      const validatedItems = parseSpotRecords(result.items);

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
      if (!pb.authStore.isValid || !pb.authStore.record?.id) {
        throw new Error('User must be authenticated to create foraging spots');
      }

      // Prepare form data for file uploads
      const formData = new FormData();
      formData.append('type', validatedData.type);
      formData.append('coordinates', JSON.stringify(validatedData.coordinates));
      formData.append('user', pb.authStore.record.id);
      
      if (validatedData.notes) {
        formData.append('notes', validatedData.notes);
      }
      
      formData.append('sharedWith', JSON.stringify(validatedData.sharedWith.length > 0 ? validatedData.sharedWith : []));

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
      // Surfaces as the error-toast description, so keep it Danish
      throw new Error('Fundet kunne ikke oprettes på serveren');
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

      if (validatedData.sharedWith !== undefined) {
        formData.append('sharedWith', JSON.stringify(validatedData.sharedWith));
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
      throw new Error('Fundet kunne ikke opdateres på serveren');
    }
  },

  // Delete a foraging spot
  async delete(id: string): Promise<void> {
    try {
      await pb.collection(Collections.FORAGING_SPOTS).delete(id);
    } catch (error) {
      console.error(`Failed to delete foraging spot ${id}:`, error);
      throw new Error('Fundet kunne ikke slettes på serveren');
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
      
      return parseSpotRecords(records);
    } catch (error) {
      console.error('Failed to fetch filtered foraging spots:', error);
      throw new Error('Failed to fetch filtered foraging spots');
    }
  },
};

/** The current password given for a password change was wrong (PB 400 on
    oldPassword) — the profile sheet shows this inline instead of the generic
    error toast. */
export class WrongPasswordError extends Error {
  constructor() {
    super('Forkert nuværende adgangskode');
    this.name = 'WrongPasswordError';
  }
}

export const usersApi = {
  /** Update name and/or avatar. `avatar` cases: File → replace, null → delete
      the stored file, undefined → leave untouched. */
  async updateProfile(
    userId: string,
    data: { name?: string; avatar?: File | null }
  ): Promise<void> {
    try {
      const formData = new FormData();
      if (data.name !== undefined) {
        formData.append('name', data.name);
      }
      if (data.avatar instanceof File) {
        formData.append('avatar', data.avatar);
      } else if (data.avatar === null) {
        formData.append('avatar', ''); // Empty string removes the stored file
      }
      await pb.collection(Collections.USERS).update(userId, formData);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw new Error('Kunne ikke gemme — prøv igen');
    }
  },

  /** Change the password, then silently re-authenticate: PocketBase invalidates
      the auth token on password change and the SDK clears the auth store —
      without the re-auth the app would bounce to sign-in. */
  async changePassword(
    userId: string,
    email: string,
    data: { oldPassword: string; password: string }
  ): Promise<void> {
    try {
      await pb.collection(Collections.USERS).update(userId, {
        oldPassword: data.oldPassword,
        password: data.password,
        passwordConfirm: data.password,
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      if (
        error instanceof ClientResponseError &&
        error.status === 400 &&
        error.data?.data?.oldPassword
      ) {
        throw new WrongPasswordError();
      }
      throw new Error('Kunne ikke gemme — prøv igen');
    }
    await pb.collection(Collections.USERS).authWithPassword(email, data.password);
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
  
  return new Error('Der opstod en ukendt fejl');
}
