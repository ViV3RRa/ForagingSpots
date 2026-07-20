import { useEffect } from 'react';
import { getSpotImagePlaceholderUrls } from '../lib/pocketbase';
import type { ForagingSpotWithPending } from '../lib/types';

/* Survives remounts on purpose: the goal is one network fetch per placeholder
   per session, not per component lifetime. */
const warmedUrls = new Set<string>();

/*
 * Eagerly warms the 32px blur-up placeholders (SPOT_PLACEHOLDER_THUMB) for
 * every server spot into the browser's image cache. Without this the drawer's
 * BlurImage only starts fetching the placeholder when a spot is opened, so on
 * slow connections the tile shimmers over an empty background — the exact gap
 * the placeholder exists to cover. Deferred to idle and fetched at low
 * priority so it never competes with map tiles or the spot list itself.
 * Pending (offline) spots are skipped: their images are local object URLs
 * with no thumb variants.
 */
export function usePreloadSpotPlaceholders(spots: ForagingSpotWithPending[]) {
  useEffect(() => {
    const urls = spots
      .filter((spot) => !spot._pending)
      .flatMap((spot) => getSpotImagePlaceholderUrls(spot))
      .filter((url) => !warmedUrls.has(url));
    if (urls.length === 0) return;

    const preload = () => {
      for (const url of urls) {
        warmedUrls.add(url);
        const img = new Image();
        img.fetchPriority = 'low';
        img.decoding = 'async';
        img.src = url;
      }
    };

    // requestIdleCallback is missing on Safari/iOS — the primary PWA target —
    // so fall back to a short timeout past the initial render burst
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(preload, 800);
    return () => window.clearTimeout(timer);
  }, [spots]);
}
