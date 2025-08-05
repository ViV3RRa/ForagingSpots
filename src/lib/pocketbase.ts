import PocketBase from 'pocketbase';

// Initialize PocketBase client
// You'll need to replace this URL with your actual Pocketbase instance URL
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');
// const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://10.0.2.2:8090'); // For testing on Android emulator

// Enable auto cancellation for duplicate requests
pb.autoCancellation(false);

export default pb;

// Type-safe collection names
export const Collections = {
  USERS: 'users',
  FORAGING_SPOTS: 'foraging_spots',
  SHARED_SPOTS: 'shared_spots',
} as const;

// Utility function to get file URL from PocketBase
export function getFileUrl(record: { id: string; [key: string]: unknown }, filename: string, thumb?: { width?: number; height?: number }): string {
  // Debug the inputs
  console.log('getFileUrl inputs:', { 
    recordId: record.id, 
    filename, 
    thumb, 
    recordKeys: Object.keys(record),
    pbBaseUrl: pb.baseUrl 
  });
  
  if (!filename || filename.trim() === '') {
    console.warn('Empty filename provided to getFileUrl');
    return '';
  }
  
  try {
    // Check if PocketBase is properly configured
    if (!pb.baseUrl) {
      console.error('PocketBase baseUrl is not configured');
      return '';
    }
    
    const url = pb.files.getURL(record, filename, thumb);
    console.log('Generated URL:', url || 'EMPTY URL');
    
    // If still empty, try constructing the URL manually for debugging
    if (!url || url === '') {
      const manualUrl = `${pb.baseUrl}/api/files/${Collections.FORAGING_SPOTS}/${record.id}/${filename}`;
      console.log('Manual URL construction would be:', manualUrl);
      
      // Return the manual URL as fallback for now
      if (thumb) {
        return `${manualUrl}?thumb=${thumb.width}x${thumb.height}`;
      }
      return manualUrl;
    }
    
    return url;
  } catch (error) {
    console.error('Error generating file URL:', error);
    return '';
  }
}

// Manual URL construction for fallback
export function getManualFileUrl(recordId: string, filename: string, thumb?: { width?: number; height?: number }): string {
  if (!pb.baseURL || !filename) {
    return '';
  }
  
  let url = `${pb.baseURL}/api/files/${Collections.FORAGING_SPOTS}/${recordId}/${filename}`;
  
  if (thumb) {
    url += `?thumb=${thumb.width}x${thumb.height}`;
  }
  
  return url;
}

// Utility function to get all image URLs for a foraging spot
export function getSpotImageUrls(spot: { id: string; images: string[] }): string[] {
  if (!spot.images || spot.images.length === 0) {
    return [];
  }
  
  return spot.images.map(filename => getFileUrl(spot, filename));
}

// Utility function to get thumbnail URLs for a foraging spot
export function getSpotImageThumbnailUrls(spot: { id: string; images: string[] }, thumb = { width: 300, height: 300 }): string[] {
  if (!spot.images || spot.images.length === 0) {
    console.log('No images found for spot:', spot.id);
    return [];
  }
  
  console.log('Processing images for spot:', spot.id, 'Images:', spot.images);
  
  return spot.images.map((filename, index) => {
    console.log(`Processing image ${index + 1}/${spot.images.length}:`, filename);
    const url = getFileUrl(spot, filename, thumb);
    console.log(`Generated URL for ${filename}:`, url || 'EMPTY');
    return url;
  }).filter(url => url !== ''); // Filter out empty URLs
}
