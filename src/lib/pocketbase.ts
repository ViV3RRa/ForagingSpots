import PocketBase from 'pocketbase';

// Initialize PocketBase client
// You'll need to replace this URL with your actual Pocketbase instance URL
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Enable auto cancellation for duplicate requests
pb.autoCancellation(false);

export default pb;

// Type-safe collection names
export const Collections = {
  USERS: 'users',
  FORAGING_SPOTS: 'foraging_spots',
  SHARED_SPOTS: 'shared_spots',
} as const;
