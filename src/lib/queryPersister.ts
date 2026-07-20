import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import pb from './pocketbase';
import { queryClient } from './queryClient';
import { offlineDb } from './offlineDb';

/*
 * IndexedDB persister for the TanStack Query client (plan 007). Backs a single
 * Dexie row so a cold, offline app start can restore the user's spot list.
 *
 * The library (persistQueryClient) handles buster + maxAge invalidation against
 * the returned client's own buster/timestamp; this persister adds the two
 * things the library can't: per-user scoping and mutation-settle gating.
 */

// Bump when the shape of a persisted query (ForagingSpotSchema) changes, so an
// old payload is dropped by persistQueryClient instead of restored broken.
export const PERSIST_BUSTER = 'v1-foraging-spots';

// Persisted spots must survive a long offline gap — you don't revisit a spot
// every year (same reasoning as the 2-year image cache TTLs in vite.config).
// This is the real ceiling on the offline window; the all-spots gcTime
// (useForagingSpots) only has to stay >= this. A stale snapshot self-heals via
// the 2-min staleTime refetch the moment there's signal, so offline the
// trade-off is stale-but-present over empty; buster + user-scoping still guard
// correctness regardless of age.
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 365 * 2; // 2 years

const ROW_KEY = 'reactQuery';

// authStore hydrates synchronously from localStorage, so the current user id is
// available here even though the persister sits above AuthProvider in the tree.
// Read per-call (not once) so it stays correct across an in-session user switch.
function currentUserId(): string | undefined {
  return pb.authStore.record?.id;
}

export const queryPersister: Persister = {
  async persistClient(client: PersistedClient) {
    const userId = currentUserId();
    // No signed-in user → nothing to scope the payload to; don't persist.
    if (!userId) return;
    // Risk #2: never snapshot the cache mid-mutation — between an optimistic
    // setQueryData and the server confirm/rollback in useUpdateSpot /
    // useDeleteSpot. The throttled writer re-runs once mutations settle and
    // the query cache changes again, capturing the reconciled state.
    if (queryClient.isMutating() > 0) return;
    await offlineDb.persistedQueryCache.put({
      key: ROW_KEY,
      userId,
      buster: client.buster,
      savedAt: client.timestamp,
      client,
    });
  },

  async restoreClient() {
    const row = await offlineDb.persistedQueryCache.get(ROW_KEY);
    if (!row) return undefined;
    // Risk #4: only the owning user may restore. A mismatch — or a signed-out
    // state (no current id) — yields nothing. This is the guard the auth-blind
    // service-worker Cache API fundamentally cannot make.
    if (!row.userId || row.userId !== currentUserId()) return undefined;
    return row.client as PersistedClient;
  },

  async removeClient() {
    await offlineDb.persistedQueryCache.delete(ROW_KEY);
  },
};

// Called from AuthContext.signOut so the next user on the device starts clean
// (belt-and-suspenders with the restore-time id check above).
export async function removePersistedQueryCache(): Promise<void> {
  await offlineDb.persistedQueryCache.delete(ROW_KEY);
}
