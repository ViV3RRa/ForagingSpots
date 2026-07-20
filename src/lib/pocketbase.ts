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

/*
 * Thumb sizes must be registered in the file field's `thumbs` option
 * (pb_migrations/1784200220_register_thumb_sizes.js) — PocketBase silently
 * serves the ORIGINAL file for unregistered sizes. Both spot sizes preserve
 * aspect ratio so the tiny placeholder and the image replacing it get framed
 * identically under object-fit: cover (plans/005).
 */
export const SPOT_THUMB = '600x600f';
export const SPOT_PLACEHOLDER_THUMB = '32x0';
export const AVATAR_THUMB = '96x96';

// Utility function to get file URL from PocketBase. Built manually rather
// than via pb.files.getURL(): spot records are Zod-parsed (ForagingSpotSchema
// strips unknown keys), so the SDK's collectionId/collectionName metadata
// never survives and getURL would return a broken URL.
export function getFileUrl(
  record: { id: string; [key: string]: unknown },
  filename: string,
  thumb?: string,
  collection: string = Collections.FORAGING_SPOTS
): string {
  // Non-strings (e.g. a File awaiting upload leaking out of a mutation
  // payload) must never reach the URL — degrade to "no image", not a crash
  if (typeof filename !== 'string' || filename.trim() === '') {
    return '';
  }
  const base = `${pb.baseURL}/api/files/${collection}/${record.id}/${encodeURIComponent(filename)}`;
  return thumb ? `${base}?thumb=${thumb}` : base;
}

// Full-size image URLs for a foraging spot (uploads are client-compressed to ≤1920px)
export function getSpotImageUrls(spot: { id: string; images: string[] }): string[] {
  if (!spot.images || spot.images.length === 0) {
    return [];
  }

  return spot.images.map(filename => getFileUrl(spot, filename));
}

// Display-thumb URLs for a foraging spot (gallery tiles, lightbox strip)
export function getSpotImageThumbnailUrls(spot: { id: string; images: string[] }, thumb: string = SPOT_THUMB): string[] {
  if (!spot.images || spot.images.length === 0) {
    return [];
  }

  return spot.images
    .map(filename => getFileUrl(spot, filename, thumb))
    .filter(url => url !== '');
}

// Tiny blur-up placeholder URLs — same aspect ratio as the originals
export function getSpotImagePlaceholderUrls(spot: { id: string; images: string[] }): string[] {
  return getSpotImageThumbnailUrls(spot, SPOT_PLACEHOLDER_THUMB);
}

// Avatar thumb URL, or null for users without an avatar. Built manually since
// the User type (Zod-inferred) doesn't carry the SDK's collection metadata.
export function getAvatarUrl(user: { id: string; avatar?: string | null }, thumb: string = AVATAR_THUMB): string | null {
  if (!user.avatar) {
    return null;
  }
  return `${pb.baseURL}/api/files/${Collections.USERS}/${user.id}/${user.avatar}?thumb=${thumb}`;
}
