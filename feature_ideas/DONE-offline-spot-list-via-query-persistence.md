# Offline spot list via TanStack Query persistence

> ## ✅ DONE — implemented 2026-07-20
> Shipped via **`plans/007-offline-spot-list-persistence.md`**. This document is
> kept for context/rationale; the plan is the source of truth for the final
> implementation (2-year `maxAge`, `gcTime: Infinity`, `PERSIST_BUSTER`). All
> four out-of-sync risks below are handled there.

**Idea:** persist the spots query cache to IndexedDB so a cold app start with
no signal still shows the user's pins — the real "check my spots in the
forest" scenario a foraging app exists for.

## The gap today

Offline support is already strong *around* the spot list, but not for the
list itself:

- App shell: precached by Workbox ✅
- Map tiles/styles/glyphs: `mapbox-cache` (CacheFirst) ✅
- Spot image thumbs: `pb-thumbs` (CacheFirst) + idle-time placeholder preload
  (`usePreloadSpotPlaceholders`) ✅
- New spots created offline: `usePendingSpots` in IndexedDB ✅
- **The spot records themselves: memory-only** ❌ — `useForagingSpots` has
  `gcTime` 5 min and no persister, so an offline cold start renders a working
  map with zero pins, and the cached thumbs never even get asked for.

## Why not a service-worker route for the API?

A Workbox `NetworkFirst` route on `/api/collections/foraging_spots/records`
would be one config block, but the Cache API is auth-blind: the request
carries the user's token, yet the cached response is stored per-origin. Sign
out, sign in as another user on the same device, go offline → the SW serves
the previous user's spots. Rejected.

## Sketch: `persistQueryClient` into IndexedDB

- `@tanstack/react-query-persist-client` + an IndexedDB persister
  (`experimental_createQueryPersister` with an `idb-keyval`-style store, or a
  small hand-rolled one next to `usePendingSpots`' existing IDB code).
- Persist only `queryKeys.foragingSpots.all` (dehydrate filter) — no need to
  persist filtered lists, share contacts, etc.
- Raise `gcTime` for that query (persistence never outlives `gcTime`;
  something like 30 days, while `staleTime` stays 2 min so online behavior is
  unchanged: restore instantly, refetch in background).
- **Auth scoping:** clear the persisted cache on sign-out (AuthContext), and
  key/validate the persisted payload by user id so user A's restore can never
  leak to user B. This is the part the SW approach can't do and the whole
  reason to do it client-side.
- `buster` string tied to the schema version so a Zod/shape change invalidates
  old payloads instead of failing to parse.

## Out-of-sync risks (this app specifically)

The hazard is real because two write paths already exist — optimistic server
mutations (`useUpdateSpot`/`useDeleteSpot`) and the offline Dexie queue
(`usePendingSpots`) — and a persisted snapshot can catch either mid-flight.
Ranked by likelihood:

1. **Double-persisting the pending store.** `persistQueryClient` dehydrates
   the *whole* client by default, including `pendingSpotsQueryKey` — which is
   only an in-memory mirror of Dexie (the real source of truth). Persisting it
   creates a second, freezable copy that drifts (e.g. a synced+deleted pending
   spot lingers in the snapshot → ghost pin on cold start).
   **Fix:** `shouldDehydrateQuery` filter persisting *only*
   `queryKeys.foragingSpots.all`.
2. **Persisting optimistic, unconfirmed state.** The persister writes on a
   throttle and can snapshot the cache between an optimistic write and the
   server confirm/rollback. Kill the app in that window (easy on mobile) and
   the next launch restores a state that never committed. Turns a transient UI
   glitch into one that survives a restart.
   **Fix:** gate persistence on mutations settled (`isMutating() === 0`), or
   don't persist mutation state and rely on the background refetch to
   reconcile.
3. **Restore-then-refetch staleness.** A mutation firing before the first
   post-restore refetch snapshots `previousSpots` from stale data; an error
   rolls back to it. Low probability, new window vs. memory-only cache.
4. **Cross-user leak** (see above) — a correctness/exposure bug, not cosmetic,
   so the auth-scoped keying + clear-on-sign-out is non-negotiable.

Takeaway: the feature is not "add a persister" — it's "add a persister *with*
a dehydrate filter, mutation-settle gating, and auth-scoped invalidation."

## Touchpoints

- `src/lib/queryClient.ts` — persister wiring
- `src/contexts/AuthContext.tsx` — clear on sign-out
- `src/hooks/useForagingSpots.ts` — `gcTime` bump for the all-spots query
- `App.tsx` boot gate (`spotsLoading`) — make sure a restored-but-stale cache
  skips the BootSplash instead of blocking on the failing refetch

## Verify

Sign in online → kill network → force-quit PWA → relaunch: pins render from
the restored cache, thumbs come from `pb-thumbs`, detail drawer works.
Then: sign out (still offline-capable path) → sign in as another user →
no stale spots from the first user.
