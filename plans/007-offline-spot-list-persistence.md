# Plan 007 — Offline spot list via TanStack Query persistence

**Status: implemented** (2026-07-20; lint + build pass, manual offline
verification against local PocketBase still pending)

Persist the `foraging_spots` query cache to IndexedDB so a cold app start with
no signal still renders the user's pins — the "check my spots in the forest"
scenario the app exists for. Full background, the rejected service-worker
approach, and the ranked out-of-sync risks are in
`feature_ideas/offline-spot-list-via-query-persistence.md`; this plan is the
implementation.

The feature is **not** "add a persister" — it is "add a persister *with* a
dehydrate filter, mutation-settle gating, and auth-scoped invalidation." Each
of those maps to a numbered risk in the feature idea and to a step below.

## Approach decision

**Client-wide `persistQueryClient` + `shouldDehydrateQuery` filter**, not the
per-query `experimental_createQueryPersister`. Rationale:

- Stable (non-experimental) API.
- `PersistQueryClientProvider` gives one `useIsRestoring()` signal we fold into
  the existing BootSplash gate (step 6) — a per-query persister has no single
  restore barrier, so the map could paint "0 pins" for a frame before restore.
- The dehydrate filter is a one-liner because the all-spots key is exactly
  `['foraging-spots']` (length 1) and everything else extends it.

**Persister backing: hand-rolled, Dexie.** `dexie` is already a dependency
(`src/lib/offlineDb.ts`); a `Persister` is just three async methods over one
row. No `idb-keyval` / async-storage-persister package.

## Dependency

Add **`@tanstack/react-query-persist-client`** (matches the installed
`@tanstack/react-query` `^5.83.0` line). It re-exports `persistQueryClient`,
`PersistQueryClientProvider`, and `useIsRestoring`. No other package.

## Steps

### 1. Dexie store for the persisted blob (`src/lib/offlineDb.ts`)

Add a single-row table beside `pendingSpots` / `pendingImages`. Bump the Dexie
version to 2 (additive `stores()` — existing offline data is untouched).

```ts
export interface PersistedQueryCache {
  key: string;        // fixed 'reactQuery' — one row
  userId: string;     // owner scope (see step 3)
  buster: string;     // schema version tag
  savedAt: number;    // for maxAge gc
  client: unknown;    // dehydrated client JSON
}

// in the class:
persistedQueryCache!: Table<PersistedQueryCache, string>;

// constructor:
this.version(2).stores({
  pendingSpots: 'localId',
  pendingImages: 'id, spotId',
  persistedQueryCache: 'key',
});
```

### 2. The persister module (new `src/lib/queryPersister.ts`)

A `Persister` (`persistClient` / `restoreClient` / `removeClient`) over the
Dexie row, plus a `PERSIST_BUSTER` constant and a `removePersistedQueryCache()`
export for sign-out (step 5).

Key behaviours, each tied to a risk:

- **Auth scoping (risk #4 — cross-user leak, non-negotiable).** Read
  `pb.authStore.record?.id` *inside* each method (not at module load — it must
  stay correct across an in-session user switch):
  - `persistClient`: stamp `userId` with the current id. If there is no current
    user, no-op (nothing to protect, nothing to persist).
  - `restoreClient`: if the stored `userId` !== current id (or no current
    user), return `undefined` so nothing restores. This is the guard the
    service-worker route fundamentally can't do.
- **Mutation-settle gating (risk #2 — persisting optimistic, unconfirmed
  state).** `persistClient` no-ops while `queryClient.isMutating() > 0`, so the
  throttled writer can't snapshot the cache between an optimistic
  `setQueryData` and the server confirm/rollback in `useUpdateSpot` /
  `useDeleteSpot`. A settled later write captures the reconciled state.
  (`persistQueryClient` throttles ~1 s, so a skipped write is picked up by the
  next one — no lost data.)
- **maxAge gc.** `persistQueryClient` discards a snapshot older than
  `PERSIST_MAX_AGE` (2 years — same "you don't revisit a spot every year"
  reasoning as the image cache TTLs; it's the real ceiling on the offline
  window) against the stored client's own `timestamp`.

`buster` mismatch → treat as no stored cache (return `undefined`); bump
`PERSIST_BUSTER` whenever `ForagingSpotSchema` shape changes so an old payload
is dropped instead of parsed into a broken shape.

### 3. Wire the provider (`src/main.tsx`)

Swap `QueryClientProvider` (`main.tsx:54`) for `PersistQueryClientProvider`:

```tsx
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    maxAge: PERSIST_MAX_AGE,          // 2 years
    buster: PERSIST_BUSTER,
    dehydrateOptions: {
      // Risk #1 — persist ONLY the all-spots list. pendingSpotsQueryKey
      // (['pendingSpots']) is an in-memory mirror of Dexie (the real source
      // of truth); persisting it makes a second, freezable copy that drifts
      // into ghost pins. Filtered lists / details are excluded too.
      shouldDehydrateQuery: (q) =>
        q.queryKey.length === 1 && q.queryKey[0] === 'foraging-spots'
        && q.state.status === 'success',
      // Don't persist mutations at all — reconcile via the background refetch.
      shouldDehydrateMutation: () => false,
    },
  }}
>
```

Note the `status === 'success'` guard: never persist an error/pending snapshot.

### 4. Raise gcTime for the all-spots query (`src/hooks/useForagingSpots.ts:17`)

A query is evicted — and its persisted copy is meaningless — once `gcTime`
passes with no observer, so `gcTime` must stay `>= PERSIST_MAX_AGE`. Bump only
the all-spots query; `Infinity` trivially satisfies the bound (the query is
observed for the whole authed session, so it never lingers wastefully):

```ts
gcTime: Infinity,
```

`staleTime` stays `2 * 60 * 1000`, so online behaviour is unchanged: restore
instantly, refetch in the background. Leave the global `gcTime` (10 min) and
the other queries alone.

### 5. Clear on sign-out (`src/contexts/AuthContext.tsx:147`)

In `signOut`, after `pb.authStore.clear()`, drop both the live and persisted
copies so the next user starts clean (belt-and-suspenders with the step-2
restore-time id check):

```ts
queryClient.removeQueries({ queryKey: queryKeys.foragingSpots.all });
await removePersistedQueryCache();
```

`AuthContext` doesn't currently import `queryClient`; import the singleton from
`src/lib/queryClient` directly (it's module-scoped, not the hook) plus
`removePersistedQueryCache` from the new module.

### 6. Boot gate stays correct (`src/App.tsx:159`)

Two adjustments so a restored-but-offline start doesn't hang or flash:

- Gate the splash on restoration: `const isRestoring = useIsRestoring();` and
  extend the guard to
  `if (isLoading || isRestoring || (isAuthenticated && spotsLoading)) return <BootSplash/>`.
  This prevents the map painting "0 pins" for a frame before the async restore
  lands.
- Confirm `spotsLoading` no longer blocks offline: once restored, the query is
  `status: 'success'` with data, so `isLoading` is `false` even while a
  doomed background refetch is in flight — the map shows restored pins instead
  of the splash. (Verify in step "Verify", offline relaunch.)

## Out-of-sync risks — where each is handled

Mirrors the ranked list in the feature idea:

1. Double-persisting the pending store → **step 3** `shouldDehydrateQuery`
   filter (only `['foraging-spots']`).
2. Persisting optimistic, unconfirmed state → **step 2** `isMutating()` gate +
   **step 3** `shouldDehydrateMutation: () => false`.
3. Restore-then-refetch staleness (a mutation firing before the first
   post-restore refetch snapshots stale `previousSpots`) → low probability,
   accepted; the background refetch reconciles. No code beyond the above.
4. Cross-user leak → **step 2** restore-time `userId` check + **step 5**
   clear-on-sign-out.

## Not in scope

- No persistence of filtered lists, share contacts, or detail queries.
- No change to the pending-spots offline path (`usePendingSpots` /
  `offlineDb` pending tables) — it remains the source of truth for
  offline-created spots and is deliberately kept out of the persisted blob.
- No service-worker API route (rejected — auth-blind Cache API leaks across
  users; see feature idea).
- No image persistence — thumbs already come from the `pb-thumbs` CacheFirst
  route (plan/vite.config.ts), and full-size originals stay network-only.

## Verification

- `npm run lint` and `npm run build` pass. (`experimental` API is avoided, so
  no eslint/type friction expected.)
- Manual against local PocketBase (`serve.sh`, port 8090):
  1. **The core scenario.** Sign in online → confirm pins load → kill network
     (DevTools offline, or airplane mode on device) → force-quit the PWA →
     relaunch offline: pins render from the restored cache, thumbs come from
     `pb-thumbs`, the detail drawer opens and shows images. No BootSplash hang.
  2. **Cross-user leak (the non-negotiable).** Still offline-capable: sign out,
     sign in as a second account, go offline, relaunch → **no** spots from the
     first user appear.
  3. **Optimistic-write survives-restart.** Edit a spot's notes online, and
     while the request is in flight (throttle the network) force-quit →
     relaunch: the list shows the *server-confirmed* value, not a half-applied
     optimistic one (mutation-settle gate).
  4. **Online unchanged.** Normal online use: list still restores instantly and
     refetches in the background within `staleTime`; no stale pin lingers after
     a create/update/delete (existing invalidation still fires).
  5. **Buster.** Bump `PERSIST_BUSTER`, reload → old payload is dropped and a
     fresh fetch repopulates; no parse crash.
```
