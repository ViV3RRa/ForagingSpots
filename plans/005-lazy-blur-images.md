# Plan 005 — Lazy blur-up images (spot photos + avatar)

**Status: implemented** (2026-07-16; migration verified against local PB —
32x0/600x600f/96x96 serve small files, unregistered sizes fall back to the
original. Not yet deployed to the NAS).

Bring the blur-up lazy-loading pattern from
https://blog.webdevsimplified.com/2023-05/lazy-load-images/ to every remote
image in the app: a tiny aspect-preserved thumbnail shows immediately
(blurred, with a shimmer sweep), and the real image fades in over it when
loaded. No FFmpeg step — PocketBase generates thumbs on request via
`?thumb=WxH`, including aspect-preserving variants.

## Why this also fixes an existing perf bug

Spot-photo "thumbnails" currently download **full originals**, twice over:

1. **No thumb sizes registered.** PocketBase only serves thumb sizes listed in
   the file field's `thumbs` option and silently falls back to the original
   otherwise. The snapshot migration (`1783683771_collections_snapshot.js`)
   has `users.avatar` → `thumbs: null` (line 150) and `foraging_spots.images`
   → `thumbs: []` (line 321).
2. **The thumb param never reaches the server anyway.** `getFileUrl`
   (`src/lib/pocketbase.ts:21`) passes `{width, height}` as the SDK's
   query-params object, so requests go out as `?width=300&height=300` — not
   `?thumb=300x300`. PocketBase ignores those params.

So even step 1 of this plan (migration + helper fix) is a straight win
independent of the blur-up work.

## Decisions from the 2026-07-16 discussion

- **Every thumb size is aspect-preserving** (like ffmpeg `scale=20:-1`). The
  blog's requirement is that placeholder and real image share aspect ratio so
  `cover`/`contain` position them identically and the fade doesn't jump.
  A square-cropped tile thumb breaks this in non-square cells: in the 1.7:1
  hero tile, `cover` of a 400x400 center-crop shows ~33% less width than
  `cover` of the original-aspect placeholder → visible zoom jump on fade.
- **Universal placeholder = `32x0`** (width 32, height auto — the `scale=20:-1`
  equivalent). Used for BOTH the gallery tile and the lightbox card; the
  lightbox reuses the exact URL the tile already fetched, so its placeholder
  is served from cache. 32 not 20: a `20x0` thumb of a wide panorama rounds
  to ~1 row of pixels; 32 gives margin at still-sub-1kB sizes.
- **Display thumb = `600x600f`** (fit inside 600×600, long side 600, aspect
  preserved). Typical 4:3 phone photos → 600×450, short side 450px, which
  covers a ~170 css px tile at 2× DPR with margin. Accepted trade-off:
  extreme panoramas (>16:9) get a soft short side in tiles — preferred over
  the zoom-jump that square crops cause on every non-square fade. `f` (not
  `600x0`) so portrait images don't pass through at near-original size.
- **Lightbox placeholder is the blurry `32x0`, not a sharp mid-size.** Chosen
  for simplicity + guaranteed cache hit (Instagram-style full-screen blur
  that resolves). Upgrade path if it ever feels too blurry: add a sharper
  size to the thumbs list and swap one URL.
- **Shimmer, not pulse** (user preference): diagonal gradient band sweeping
  via `transform: translateX(-100% → 100%)` (~1.4s loop, compositor-only —
  several tiles animate at once on a phone). Tint the band with the app cream
  (`rgba(244, 239, 227, …)`) rather than pure white. Wrap keyframes in
  `@media (prefers-reduced-motion: no-preference)`; reduced-motion users get
  the static blur.
- **Avatars get thumbs but no blur-up.** At 48px (TopBar) / 104px
  (ProfileSheet) a placeholder is pointless, Radix Avatar already shows the
  initial-letter fallback until load, and cropped avatars can be PNG with
  alpha (float over the map) — a blurred backdrop behind them would look odd.
- Uploads are compressed client-side to max 1920px / ~1MB JPEG
  (`src/utils/imageCompression.ts` DEFAULT_COMPRESSION_OPTIONS), so "original
  as the lightbox full image" is acceptable; the ladder is 32 → 600 → ≤1920.
- ~~The lightbox card is `object-cover` in a fixed 3:4 frame~~ — **changed
  post-implementation** (user: the fixed 3:4 crop "destroys the image's
  original aspect ratio"): the card now adopts each photo's own aspect ratio,
  measured via BlurImage's `onNaturalSize` (the 32x0 placeholder reports it
  almost immediately; the full image refines it). Sized with container-query
  units — `width: min(100cqw, 430px, 100cqh × ratio)` on a
  `container-type: size` slide — i.e. the largest same-ratio box that fits.
  3:4 remains only as the pre-measurement fallback.

## 1. Migration — register thumb sizes

New JS migration in `pocketbase/pb_migrations/`:

- `foraging_spots.images` → `thumbs: ["32x0", "600x600f"]`
- `users.avatar` → `thumbs: ["96x96"]` (TopBar already requests this size)

PocketBase generates thumbs lazily on first request, existing files included —
no backfill. Down-migration restores `[]`/`null`. **Deploy note:** must also
run on the NAS instance (pb_migrations ships with the compose setup per the
runbook); until it runs there, prod serves originals exactly as today — no
breakage, just no win.

## 2. Helper rework — `src/lib/pocketbase.ts`

- Switch the thumb parameter to PocketBase's string format
  (`?thumb=600x600f`). The `{width, height}` object shape can't express
  `32x0`/`600x600f` anyway.
- **Post-implementation correction:** URLs must be built manually, NOT via
  `pb.files.getURL()` — spot records are Zod-parsed and `ForagingSpotSchema`
  strips unknown keys, so the SDK's `collectionId`/`collectionName` metadata
  never survives and `getURL` returns a broken URL. (The old code's "manual
  URL construction" fallback existed to paper over exactly this; it was the
  live path all along.)
- `getSpotImageThumbnailUrls(spot, thumb = '600x600f')`.
- New `getSpotImagePlaceholderUrls(spot)` → `32x0` URLs.
- New `getAvatarUrl(user, thumb = '96x96')` — TopBar builds this URL by hand
  today (`TopBar.tsx:54`), ProfileSheet loads the **full** file
  (`ProfileSheet.tsx:178`); both switch to the helper.
- Drop the verbose `console.log` debugging throughout `getFileUrl` /
  `getSpotImageThumbnailUrls` while in there (flagged in the survey; it logs
  on every URL build).

## 3. `BlurImage` component — `src/components/ui/blur-image.tsx`

Props: `{ src, placeholderSrc?, alt, className? (wrapper), imgClassName?,
onError? }`.

- Wrapper `div` — `relative overflow-hidden` + existing `bg-line2` tile tone;
  callers keep their rounding/size classes on it.
- Placeholder: ~~`background-image` with `background-size: cover` (blog's
  approach)~~ — **corrected post-implementation** to an eager, absolutely
  positioned `<img fetchPriority="high">` with `object-cover`: background
  images fetch at the browser's lowest priority (queued behind every `<img>`
  on the page), which made the placeholder arrive too late to be useful.
- Real `<img>`: `loading="lazy" decoding="async"`, `opacity-0` →
  `opacity-100` with a ~250ms transition once loaded.
- **Load detection**: `onLoad` sets state, but a ref callback must also check
  `img.complete` — for HTTP-cached and Workbox-served images the load event
  can fire before React attaches the handler. In the `complete` fast path,
  skip the transition entirely (no blur flash for cached images).
- Shimmer: `::before` (or an absolutely-positioned span) with the cream
  gradient band, `animation: ss-shimmer 1.4s infinite`; rendered only while
  not loaded. Keyframes live in `src/styles/tokens.css` next to the other
  `ss-*` animations, inside `prefers-reduced-motion: no-preference`.
- `placeholderSrc` is optional: pending-spot images are local object URLs
  (`PinDetailsDrawer` pendingImageUrls) with no thumb variants — they render
  without blur-up, keeping the fade.
- `onError` forwarded so PinDetailsDrawer keeps its fall-back-to-full-URL
  behavior.

## 4. Adoption

- **PinDetailsDrawer `photoTile`** (`PinDetailsDrawer.tsx:170`): replace the
  raw `<img>` with `BlurImage` — placeholder `32x0`, src `600x600f` (via the
  reworked helpers at lines 78–79). The "+N"/photo-count overlays stay as
  siblings above it. Pending spots pass `placeholderSrc: undefined`.
- **ImageViewer main card** (`ImageViewer.tsx:198`): replace the spinner +
  manual `loadedUrls` fade with `BlurImage` — placeholder `32x0` (cache hit
  from the tile), src = original. The component needs the placeholder URLs
  passed down alongside the existing `thumbnailUrls` prop. The 58px strip
  thumbs (line 240) keep using the display-thumb URLs — heavier than a 58px
  strip needs in isolation, but they're the same URLs the gallery tiles just
  fetched, so they're cache hits; no new size warranted.
- **ImageCapture grid** (optional, low priority): already-uploaded images in
  the edit flow could adopt BlurImage; freshly-picked local previews stay
  plain. Fine to defer.
- **Avatars**: TopBar + ProfileSheet via `getAvatarUrl` (ProfileSheet stops
  downloading the full file for a 104px circle). No BlurImage.
- **`decoding="async"`** on the remaining static `<img>`s (BootSplash,
  PWAInstallPrompt, SpotListView empty state); spot-type icons keep
  `loading="eager"`.

## 5. Gotchas / open checks

- **Workbox runtime caching**: check `vite.config.ts` for a runtime route
  caching `/api/files/` — if present, the new `?thumb=` query strings are
  distinct cache entries (fine, they're small; old full-size entries age
  out), and the SW makes the `img.complete` fast path the common case.
- **Offline**: placeholder + real image both fail → wrapper's `bg-line2` tone
  shows, `onError` fires as today. No regression, no special handling.
- **Local PB verification** that the migration actually bites: after running
  it, `curl -sI '…?thumb=32x0'` should return a tiny content-length, and an
  *unregistered* size (e.g. `?thumb=123x0`) should return the original size —
  which also demonstrates the pre-existing bug.
- Remember the serve.sh / port-8090 and prod-URL-baked-into-builds gotchas
  when testing (see memory).

## 6. Verification

1. Migration applied locally → thumb URLs return small files (curl sizes for
   `32x0`, `600x600f`, `96x96`).
2. Network tab on the spot drawer: tiles fetch `600x600f` (tens of kB, not
   ~1MB originals); opening the lightbox issues **no new placeholder request**
   (32x0 served from cache); original loads and fades in.
3. Slow-network throttle: shimmer visible over blurred placeholders, no
   layout shift, no zoom jump on fade (test a 16:9 photo in the 1.7:1 hero
   tile specifically — that's the case square crops would have broken).
4. Cached revisit: tiles appear instantly sharp, no blur flash.
5. Reduced motion (macOS/iOS setting): static blur, no shimmer.
6. Avatar: TopBar + ProfileSheet request `?thumb=96x96`.
7. `npx tsc -b && npm run lint && npm run build` clean.
