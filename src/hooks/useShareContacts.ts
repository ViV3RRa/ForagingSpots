import { useMemo } from 'react';
import type { ForagingSpotWithPending } from '../lib/types';

/**
 * Usernames the current user has shared spots with before, ranked by how
 * often (most-shared-with first, alphabetical tiebreak). Feeds the
 * "Delt med før" suggestion chips in the add/edit sheet.
 *
 * Derived only from the user's OWN spots — the server list also contains
 * spots shared WITH the user (list rule matches on sharedWith too), and
 * those must not leak other people's contacts into the suggestions.
 * Pending offline spots are always self-created but carry a placeholder
 * user id, hence the _pending escape hatch.
 *
 * Names are the raw strings stored in sharedWith (typos included) — no
 * lookup, no validation, per the sharing model.
 */
export function useShareContacts(
  spots: ForagingSpotWithPending[],
  currentUserId: string,
): string[] {
  return useMemo(() => {
    const frequency = new Map<string, number>();
    for (const spot of spots) {
      if (spot.user !== currentUserId && !spot._pending) continue;
      for (const username of spot.sharedWith ?? []) {
        frequency.set(username, (frequency.get(username) ?? 0) + 1);
      }
    }
    return [...frequency.keys()].sort(
      (a, b) => frequency.get(b)! - frequency.get(a)! || a.localeCompare(b)
    );
  }, [spots, currentUserId]);
}
