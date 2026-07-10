# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Skovens Skatte" (Forest Treasures) is a Danish foraging spots tracker PWA. Users can map and track locations of mushrooms, berries, and other forageable items in Denmark. Built with React 19, TypeScript, and PocketBase backend.

## Common Commands

```bash
# Development
npm run dev          # Start Vite dev server with PWA enabled
npm run build        # TypeScript compile + Vite production build
npm run lint         # ESLint check
npm run preview      # Preview production build

# Backend (run from pocketbase directory)
./pocketbase serve   # Start PocketBase server (default: http://127.0.0.1:8090)
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design tokens (see `src/styles/tokens.css`)
- **State Management**: TanStack Query for server state, React Context for auth
- **Backend**: PocketBase (self-hosted, binary in `/pocketbase`)
- **Maps**: Mapbox GL via react-map-gl with Supercluster for marker clustering
- **Forms**: controlled components + Zod validation (react-hook-form was removed in the redesign)
- **PWA**: vite-plugin-pwa with Workbox for offline caching

### Key Directories
- `src/lib/` - Core utilities: PocketBase client, API service, Zod schemas, TypeScript types
- `src/hooks/` - Custom hooks including TanStack Query hooks for CRUD operations
- `src/contexts/` - AuthContext for authentication state
- `src/components/ui/` - Reusable UI components (shadcn/ui style)
- `src/components/icons/` - Custom foraging type icons (mushrooms, berries)
- `pocketbase/` - PocketBase binary and data (pb_data, pb_migrations)

### Data Flow
1. **Auth**: `AuthContext` wraps app, uses PocketBase auth store with automatic token refresh
2. **API Layer**: `src/lib/api.ts` - CRUD operations for foraging spots using PocketBase SDK
3. **Query Layer**: `src/hooks/useForagingSpots.ts` - TanStack Query hooks with optimistic updates
4. **Validation**: All types defined with Zod schemas in `src/lib/schemas.ts`, TypeScript types inferred via `z.infer<>` in `src/lib/types.ts`

### Foraging Types
`FORAGING_TYPES` const array in `src/components/types.ts` feeds into `ForagingTypeSchema` Zod enum. Each type has a corresponding icon component and Danish label (`src/utils/danishLabels.ts`).

### Environment Variables
- `VITE_POCKETBASE_URL` - PocketBase server URL (defaults to http://127.0.0.1:8090)
- `VITE_MAPBOX_ACCESS_TOKEN` - Mapbox API token (configured in `src/utils/mapbox.ts`)

### PocketBase Collections
- `users` - User accounts
- `foraging_spots` - Main data: type, coordinates (JSON), notes, images (file field), sharedWith (usernames array)
- `shared_spots` - For future sharing functionality

### Image Handling
Images are stored in PocketBase file storage. `src/lib/pocketbase.ts` exports helpers: `getFileUrl()`, `getSpotImageUrls()`, `getSpotImageThumbnailUrls()`. Images are compressed client-side before upload (`src/utils/imageCompression.ts`).
