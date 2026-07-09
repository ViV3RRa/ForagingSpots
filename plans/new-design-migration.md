# New Design Migration — "Skovens Skatte" Redesign

## Overview

Migrate the entire PWA to the new visual design authored in Claude Design:
**https://claude.ai/design/p/67e5a51f-04a0-4dc5-9ca9-0d4bf9a807b3?file=Skovens+Skatte.dc.html**

The design replaces the current green/material look (Inter, `#4CAF50`, shadcn defaults) with an
earthy, editorial aesthetic: cream/parchment surfaces, deep forest ink, rust accent, serif display
type (Spectral), Work Sans body text, and Space Mono for coordinates/labels. All overlays become
bottom sheets with large top radii (28px), grab handles, and rise/fade animations. Both a light and
a dark palette are defined.

### Scope decisions (agreed 2026-07-06)

- **Visual redesign of all existing screens/flows.**
- **Two new features included:** distance-to-spot (shown in list + detail drawer) and a
  location-permission priming screen. **Excluded:** guest mode, latin species names, "Naviger"
  action — listed under *Out of scope / future* at the end.
- **Map:** custom Mapbox Studio styles (light + dark) tuned to the design palette.
- **Theming:** follows system `prefers-color-scheme` by default, with a manual override persisted
  in localStorage.
- **Strategy:** foundation first (tokens, fonts, primitives, map styles), then screen-by-screen.
  The app must remain runnable after every subtask; temporary visual inconsistency between
  migrated and unmigrated screens is acceptable.

### Design language reference

Token palettes from the design file (`Skovens Skatte.dc.html`, LIGHT/DARK constants):

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#f4efe3` | `#1c261b` | Screen background |
| `--surface` | `#faf6ec` | `#273226` | Cards, inputs, chips, sheets |
| `--ink` | `#23301f` | `#f0e9d6` | Headings, primary text |
| `--ink2` | `#5f5b50` | `#c8d3bf` | Body/secondary text |
| `--muted` | `#8a8577` | `#9fae94` | Tertiary text, placeholders |
| `--faint` | `#a09a8c` | `#8a9880` | Timestamps, disabled |
| `--line` | `#ddd0b4` | `#3a4a34` | Borders on surfaces |
| `--line2` | `#e3d9c2` | `#31402c` | Row dividers |
| `--accent` | `#b5502f` (rust) | `#c9a24b` (gold) | Primary CTA, FAB, destructive tint |
| `--accent-ink` | `#f4efe3` | `#273226` | Text on accent |
| `--brand` | `#2f4a32` (forest) | `#c9a24b` | Locate dot, avatar, secondary actions |
| `--brand-ink` | `#f4efe3` | `#273226` | Text on brand |
| `--mono` | `#a08b5f` | `#c9a24b` | Space Mono labels/coords |
| `--pin-ring` | `#f4efe3` | `#f0e9d6` | Map pin borders |
| `--map-bg` / `--map-land` / `--map-water` / `--map-line` / `--map-trail` | `#e6ddc6` / `#d3ddc0` / `#bcd0e0` / `#cabf9f` / `#c9a15f` | `#1c261b` / `#233020` / `#1f3540` / `#31402c` / `#c9a24b` | Mapbox style targets |
| `--shadow` | `rgba(80,70,40,.14)` | `rgba(0,0,0,.4)` | Elevation |
| `--pulse` | `rgba(47,74,50,.35)` | `rgba(201,162,75,.4)` | Location pulse animation |

**Typography:** Spectral (serif, 400/500/600/700 + italics) for headings, buttons, and editorial
text; Work Sans (400/500/600) for body/UI text; Space Mono (400/700) for coordinates, uppercase
micro-labels (11px, letter-spacing ~.1–.16em), and timestamps.

**Recurring patterns:** 14–16px radii on inputs/buttons, 28px top radius on sheets, pill toggles,
circular gradient type badges with `--pin-ring` borders and inner white highlight
(`inset 0 0 0 2-3px rgba(255,255,255,.3)`), `ss-pulse` / `ss-rise` / `ss-fade` keyframes,
uppercase Space Mono section labels, accent CTA buttons with colored glow shadow
(`0 8px 22px -6px var(--accent)`).

**Spot-type assets:** the 24 PNG illustrations in the design project are byte-identical to the
files already in `public/spot_types/` — no import needed. Gradients per type already live in
`src/components/icons/index.tsx` (`getForagingSpotConfig`) and match the design.

### Architecture constraints (unchanged)

React 19 + TypeScript + Vite, TanStack Query, AuthContext, PocketBase, react-map-gl +
Supercluster, IndexedDB offline layer, vite-plugin-pwa. **No data-layer, API, or offline-sync
changes** except the small additions needed for distance calculation and theme persistence.
Navigation stays state-driven in `App.tsx` / `MainMapScreen.tsx` (no router introduced).

### Screen-to-component map

| Design screen | Existing component(s) | Subtask |
|---|---|---|
| Welcome | `WelcomeScreen.tsx` | 2.1 |
| Sign in | `SignInScreen.tsx` (+ `SignUpScreen.tsx` restyle) | 2.2 |
| App chrome (search bar, filter btn, avatar, Kort/Liste toggle, FAB, location chip) | `TopBar.tsx`, `FloatingActionButton.tsx`, `FilterButton.tsx`, `MainMapScreen.tsx` | 2.3 |
| Map view (pins, clusters, locate, user dot) | `MapView.tsx` | 2.4 |
| List view + empty state | `SpotListView.tsx` | 2.5 |
| Detail drawer | `PinDetailsDrawer.tsx` | 2.6 |
| Add/edit sheet (type grid) | `AddEditModal.tsx` | 2.7 |
| Filter sheet (category tabs + species list) | `FilterDialog.tsx` | 2.8 |
| "Flyt placering" fullscreen map editor | `LocationPickerModal.tsx` | 2.9 |
| Photo lightbox | `ImageViewer.tsx` | 2.10 |
| Delete confirm | `ConfirmationDialog.tsx` | 2.11 |
| Map error card | `MapView.tsx` (+ `MainMapScreen.tsx` chrome) | 2.12 |
| List toolbar, sort menu, row action sheet | `SpotListView.tsx` | 2.13 |
| Map cluster + compass | `MapView.tsx` | 2.14 |
| Sign-in error/loading states | `SignInScreen.tsx`, `SignUpScreen.tsx` | 2.15 |
| Top-bar filter dot + photo avatar | `TopBar.tsx` | 2.16 |
| Detail gallery buckets, share section, offline lock | `PinDetailsDrawer.tsx` | 2.17 |
| Location permission priming (new) | new component | 3.1 |
| Offline banner | `OfflineBanner.tsx`, `PendingSyncBadge.tsx` | 3.2 |
| PWA install sheet | `PWAInstallPrompt.tsx` | 3.3 |
| PWA update toast | `PWAUpdatePrompt.tsx` | 3.4 |
| Splash / manifest | `vite.config.ts`, `index.html`, icons | 3.5 |
| Success/error toasts | `src/main.tsx` Toaster, `ui/sonner.tsx`, call sites | 3.6 |
| App icon set (monogram, new) | `public/app-icon/`, `vite.config.ts`, `index.html` | 3.7 |
| No-location badge + degraded chrome (new) | `MainMapScreen.tsx`, `MapView.tsx`, `useUserLocation.ts` | 3.8 |
| Satellite map mode (new) | `MapView.tsx`, `MainMapScreen.tsx`, `src/utils/mapbox.ts` | 3.9 |

---

## Subtask files

Each subtask is specified in its own self-contained file under `plans/subtasks/`, written so a
fresh AI agent (no shared context with any other session) can implement it. Every file links back
to this plan for context and instructs the implementer to look up the exact design markup and
token values from the Claude Design project via MCP before writing code.

| Subtask | File | Status |
|---|---|---|
| 1.1 Design tokens & theme infrastructure | [subtasks/1.1-tokens-and-theme.md](subtasks/1.1-tokens-and-theme.md) | ✅ Done (2026-07-06) |
| 1.2 Typography | [subtasks/1.2-typography.md](subtasks/1.2-typography.md) | ✅ Done (2026-07-06) |
| 1.3 Base UI primitives | [subtasks/1.3-ui-primitives.md](subtasks/1.3-ui-primitives.md) | ✅ Done (2026-07-06) |
| 1.4 Custom Mapbox styles | [subtasks/1.4-mapbox-styles.md](subtasks/1.4-mapbox-styles.md) | ✅ Done (2026-07-06) |
| 2.1 Welcome screen | [subtasks/2.1-welcome-screen.md](subtasks/2.1-welcome-screen.md) | ✅ Done (2026-07-06) |
| 2.2 Sign-in screens | [subtasks/2.2-signin-screens.md](subtasks/2.2-signin-screens.md) | ✅ Done (2026-07-07) |
| 2.3 App chrome | [subtasks/2.3-app-chrome.md](subtasks/2.3-app-chrome.md) | ✅ Done (2026-07-07) |
| 2.4 Map view | [subtasks/2.4-map-view.md](subtasks/2.4-map-view.md) | ✅ Done (2026-07-07) |
| 2.5 List view + empty state + distance | [subtasks/2.5-list-view.md](subtasks/2.5-list-view.md) | ✅ Done (2026-07-07) |
| 2.6 Detail drawer | [subtasks/2.6-detail-drawer.md](subtasks/2.6-detail-drawer.md) | ✅ Done (2026-07-08) |
| 2.7 Add/edit sheet | [subtasks/2.7-add-edit-sheet.md](subtasks/2.7-add-edit-sheet.md) | ✅ Done (2026-07-08) |
| 2.8 Filter sheet | [subtasks/2.8-filter-sheet.md](subtasks/2.8-filter-sheet.md) | ✅ Done (2026-07-08) |
| 2.9 Location editor | [subtasks/2.9-location-editor.md](subtasks/2.9-location-editor.md) | ✅ Done (2026-07-08) |
| 2.10 Photo lightbox | [subtasks/2.10-photo-lightbox.md](subtasks/2.10-photo-lightbox.md) | ✅ Done (2026-07-08) |
| 2.11 Delete confirmation | [subtasks/2.11-delete-confirm.md](subtasks/2.11-delete-confirm.md) | ✅ Done (2026-07-08) |
| 2.12 Map error state | [subtasks/2.12-map-error.md](subtasks/2.12-map-error.md) | ✅ Done (2026-07-08) |
| 2.13 List toolbar, sort menu & row action sheet | [subtasks/2.13-list-toolbar-rowmenu.md](subtasks/2.13-list-toolbar-rowmenu.md) | ✅ Done (2026-07-08) |
| 2.14 Map cluster & compass | [subtasks/2.14-map-cluster-compass.md](subtasks/2.14-map-cluster-compass.md) | ✅ Done (2026-07-08) |
| 2.15 Sign-in error & loading states | [subtasks/2.15-signin-states.md](subtasks/2.15-signin-states.md) | ✅ Done (2026-07-08) |
| 2.16 Top-bar states | [subtasks/2.16-topbar-states.md](subtasks/2.16-topbar-states.md) | ✅ Done (2026-07-08) |
| 2.17 Detail drawer states (reconciliation) | [subtasks/2.17-detail-states.md](subtasks/2.17-detail-states.md) | ✅ Done (2026-07-08) |
| 3.1 Location permission screen | [subtasks/3.1-permission-screen.md](subtasks/3.1-permission-screen.md) | ✅ Done (2026-07-08) |
| 3.2 Offline banner & sync badge | [subtasks/3.2-offline-banner.md](subtasks/3.2-offline-banner.md) | ✅ Done (2026-07-08) |
| 3.3 PWA install sheet | [subtasks/3.3-install-sheet.md](subtasks/3.3-install-sheet.md) | ✅ Done (2026-07-09) |
| 3.4 PWA update toast | [subtasks/3.4-update-toast.md](subtasks/3.4-update-toast.md) | ✅ Done (2026-07-09) |
| 3.5 Splash, manifest & identity | [subtasks/3.5-splash-manifest.md](subtasks/3.5-splash-manifest.md) | ✅ Done (2026-07-09) |
| 3.6 Action toasts | [subtasks/3.6-action-toasts.md](subtasks/3.6-action-toasts.md) | ✅ Done (2026-07-09) |
| 3.7 App icon replacement | [subtasks/3.7-app-icon-replacement.md](subtasks/3.7-app-icon-replacement.md) | ✅ Done (2026-07-09) |
| 3.8 No-location state | [subtasks/3.8-no-location-state.md](subtasks/3.8-no-location-state.md) | ✅ Done (2026-07-09) |
| 3.9 Satellite map mode | [subtasks/3.9-satellite-mode.md](subtasks/3.9-satellite-mode.md) | |
| 4.1 Dark-mode + safe-area audit | [subtasks/4.1-dark-mode-audit.md](subtasks/4.1-dark-mode-audit.md) | |
| 4.2 Dead-code cleanup | [subtasks/4.2-cleanup.md](subtasks/4.2-cleanup.md) | |
| 4.3 Asset optimization | [subtasks/4.3-asset-optimization.md](subtasks/4.3-asset-optimization.md) | |
| 4.4 Final verification & QA | [subtasks/4.4-final-verification.md](subtasks/4.4-final-verification.md) | |

The sections below remain the master overview of each phase; the subtask files are the
implementation-ready specifications.

---

## Phase 1 — Foundation

Everything later phases depend on. After this phase the app still looks largely old, but the new
tokens, fonts, theme switching, and restyled primitives are in place and the map already uses the
new custom styles.

### 1.1 Design tokens & theme infrastructure

**Fits into plan:** every screen subtask styles exclusively against these tokens; theming
(system + manual override) must exist before any screen adopts dark-variant colors.

- Rewrite `src/styles/tokens.css`: replace the current green/oklch palette with the LIGHT table
  above under `:root` and the DARK table under `.dark`, keeping the CSS-variable names used by
  Tailwind/shadcn (`--background`, `--primary`, `--accent`, `--border`, …) mapped onto the new
  values, and adding the design-specific tokens (`--brand`, `--mono`, `--pin-ring`, `--map-*`,
  `--pulse`) as first-class variables.
- Add the design keyframes (`ss-pulse`, `ss-rise`, `ss-fade`) to `tailwind.config.js` /
  `tokens.css` as reusable animations.
- Preserve the existing safe-area utility classes.
- New `ThemeContext` (or small `useTheme` hook + provider in `App.tsx`):
  - resolves theme = manual override (localStorage key, e.g. `ss-theme`) ?? system
    `prefers-color-scheme`;
  - toggles `.dark` on `<html>`; listens for system changes when no override;
  - exposes `{theme, setTheme(light|dark|system)}` for the toggle added in 2.3;
  - updates `<meta name="theme-color">` dynamically (light `#f4efe3` / dark `#1c261b`).

**Done when:** app renders unchanged-but-recolored with new variables; toggling `.dark` manually
in devtools shows the dark palette; theme follows OS setting and survives reload with an override.

### 1.2 Typography (self-hosted fonts + type scale)

**Fits into plan:** the serif/mono identity is the most visible part of the redesign; must be
offline-capable (PWA), so no Google Fonts CDN at runtime.

- Add `@fontsource/spectral` (400/500/600/700 + italic 400/500), `@fontsource/work-sans`
  (400/500/600), `@fontsource/space-mono` (400/700); import the needed weights in `main.tsx`.
- Tailwind config: `font-serif` → Spectral, `font-sans` → Work Sans, `font-mono` → Space Mono.
- Update base typography rules in `tokens.css` (headings serif 600, body Work Sans, and a
  `.label-mono` utility/component for the uppercase Space Mono micro-label pattern).
- Verify Workbox precaches the font files (they're build assets, so default `globPatterns`
  should cover woff2; confirm).

**Done when:** fonts render offline in a production preview build; headings are Spectral,
labels Space Mono.

### 1.3 Base UI primitives restyle

**Fits into plan:** all screen subtasks compose these; restyling them once avoids repeating
one-off styles per screen.

- `src/components/ui/button.tsx`: variants for the design's buttons — primary (accent bg, Spectral
  600, 16px radius, glow shadow), secondary (surface + line border), ghost/text (ink2), icon
  buttons (44–52px circles/squares on surface).
- `src/components/ui/input.tsx`, `textarea`, `label`: 54px height, 14px radius, surface bg, line
  border, Spectral input text, Space Mono uppercase field labels.
- Bottom sheet: standardize on one primitive (shadcn `Sheet`/`Drawer`) with the design's sheet
  chrome — 28px top radius, centered grab handle, `ss-rise` entrance, `rgba(20,15,8,.4)` scrim
  with `ss-fade`. `PinDetailsDrawer`, `AddEditModal`, `FilterDialog`, `PWAInstallPrompt` will all
  adopt it in Phase 2/3.
- Shared small components: `TypeBadge` (circular gradient icon badge, sizes 44–72px, ring +
  inner-highlight treatment — extracted because map pins, list rows, detail header, type grid, and
  filter rows all use it) and `MonoLabel` (uppercase Space Mono section label).
- Complete `src/utils/danishLabels.ts`: only 12 of 25 `FORAGING_TYPES` have Danish labels today;
  the type grid and filter sheet display names prominently, so fill in the remaining 13.

**Done when:** a scratch/dev screen (can reuse `IconShowcase.tsx`) renders buttons, inputs, a
sheet, `TypeBadge`, and `MonoLabel` matching the design in both themes.

### 1.4 Custom Mapbox styles (light + dark)

**Fits into plan:** the map is the app's centerpiece; the earthy basemap is what makes the
redesign land. Doing it in Phase 1 lets every later screenshot/review happen against the real map.

- In Mapbox Studio, create two styles (start from Monochrome or Outdoors) tuned to the palette:
  light → land `#d3ddc0`, background `#e6ddc6`, water `#bcd0e0`, roads/contours `#cabf9f`,
  trails/paths `#c9a15f`; dark → `#233020` / `#1c261b` / `#1f3540` / `#31402c` / `#c9a24b`.
  Keep POI/label density low to match the design's calm look.
- Add env vars `VITE_MAPBOX_STYLE_LIGHT` / `VITE_MAPBOX_STYLE_DARK` (with sensible fallbacks) in
  `src/utils/mapbox.ts`.
- `MapView.tsx` and `LocationPickerModal.tsx`: pick style URL from the active theme; verify
  Workbox's Mapbox CacheFirst rule covers the new style/tile URLs for offline.

**Done when:** map renders the new basemap in both themes and switches with the theme toggle;
tiles still cache offline.

---

## Phase 2 — Screen-by-screen migration

Each subtask restyles one surface to the design, using Phase 1 primitives. Order roughly follows
user flow; 2.3 (app chrome) should precede 2.4–2.5 since they live inside it.

### 2.1 Welcome screen

**Fits into plan:** first screen a new user sees; smallest surface, good pilot for the new
language. Design ref: `isWelcome` block.

- Rebuild `WelcomeScreen.tsx`: decorative topo-curve SVG background, overlapping `TypeBadge`
  cluster illustration (chanterelle/blueberry/porcini/raspberry), Space Mono kicker
  ("Din personlige"), 44px Spectral title, description, primary CTA "Kom i gang" → sign-in, text
  button "Jeg har allerede en konto" → sign-in.
- Remove the old TreePine/Leaf illustration and green gradients.

### 2.2 Sign-in (and sign-up) screens

**Fits into plan:** completes the unauthenticated flow in the new language. Design ref:
`isSignin` block.

- Restyle `SignInScreen.tsx`: circular back button, Spectral h1 ("Velkommen tilbage"), Space Mono
  field labels, 54px inputs (with password visibility toggle as in the design), bottom-anchored
  primary CTA. Keep existing error/loading behavior.
- Restyle `SignUpScreen.tsx` with the same recipe so it's consistent if/when re-enabled (it is
  currently not wired into `App.tsx`; leave wiring as-is).
- No guest mode (out of scope).

### 2.3 App chrome (top bar, view toggle, FAB, location chip)

**Fits into plan:** the persistent frame around map/list; later subtasks render inside it.
Design ref: floating top bar, bottom toggle, FAB, location chip blocks.

- `TopBar.tsx` → floating layout over the map: search field (48px, surface, Spectral placeholder
  "Søg blandt fund…"), square filter icon-button, circular brand avatar with user initial opening
  the existing dropdown menu. Top gradient scrim from `--bg` to transparent. Keep existing search
  behavior from `SpotListView` — decide during implementation whether search state lifts to
  `MainMapScreen` so the floating bar drives both views (design shows one persistent search bar).
- Add the **theme toggle** (light/dark/system) to the avatar dropdown menu, wired to
  `ThemeContext` from 1.1.
- Bottom-center pill toggle "Kort / Liste" (replaces the current view toggle's location/look),
  active tab ink-filled (light) / gold (dark).
- `FloatingActionButton.tsx`: 60px accent circle, bottom-right, glow shadow.
- Location chip (bottom-left, map only): reuse/derive current locality display if available —
  if the app has no reverse-geocoding today, show coordinates or omit; note in implementation.
- Respect safe-area insets for the floating bar and bottom controls.

### 2.4 Map view

**Fits into plan:** applies the design's pin/control language on top of the 1.4 basemap.
Design ref: `isMap` block.

- Marker redesign in `MapView.tsx`: pins become `TypeBadge` (52px) with `--pin-ring` border and
  small stem; clusters restyled to match (surface/brand circle with Spectral count — design shows
  no clusters, so derive a consistent treatment).
- User-location dot: brand-colored with `ss-pulse` ring.
- Locate button: 52px circle above the FAB, surface bg, brand icon; **active state** (following
  GPS) inverts to brand bg / light ink as in the design (`locateBg`/`locateInk` logic).
- Remove now-redundant old control styling.

### 2.5 List view + empty state

**Fits into plan:** second half of the main toggle; consumes chrome from 2.3. Design ref:
`isList` / `isListEmpty` blocks.

- `SpotListView.tsx` rows: 60px `TypeBadge`, Spectral 19px name, Space Mono relative timestamp
  right-aligned ("2 d.", "1 u." — add a small Danish relative-date util), single-line ellipsized
  notes, Space Mono coordinates line, hairline `--line2` dividers. Top padding clears the
  floating bar; bottom padding clears the toggle/FAB.
- **Distance-to-spot (new feature):** haversine util (`src/utils/distance.ts`), user position from
  a shared `useUserLocation` hook (extract/reuse the geolocation tracking already in
  `MapView.tsx` so map + list + detail share one watcher). Show formatted distance ("0,8 km",
  Danish decimal comma) in rows when position is available; omit gracefully when not.
- Empty state: dashed-circle illustration with faded generic mushroom PNG, Spectral "Ingen fund
  endnu", copy, accent CTA "Markér dit første fund" → opens add sheet.
- Keep existing sort/search functionality (restyle the sort control with new primitives).

### 2.6 Detail drawer

**Fits into plan:** the richest surface; consumes `TypeBadge`, sheet chrome, distance util.
Design ref: `showDetail` block.

- Rebuild `PinDetailsDrawer.tsx` on the 1.3 sheet primitive (max-height 88%, grab handle):
  - Header: 72px `TypeBadge` + Spectral 26px name (type label; no latin name — out of scope).
  - Photo gallery: large tile + column of small tiles per design, real images via
    `getSpotImageThumbnailUrls`; "+" dashed tile hooks into existing add-image flow
    (`ImageCapture`); "N fotos" count chip; tiles open the lightbox (2.10). Handle 0/1/2/3+
    image layouts.
  - Meta rows (Space Mono labels, hairline dividers): Koordinater (+ "Redigér ›" accent link →
    location editor 2.9), Fundet (created date, Danish format), **Afstand** (distance util from
    2.5).
  - Notes section with Spectral body text.
  - Action row: primary brand button (design shows "Naviger" — out of scope, so make the primary
    slot the Edit action and keep Delete as the outlined icon button; or Share, whichever maps
    cleanest to current actions — decide at implementation, but all current actions
    [edit/delete/share/unshare] must remain reachable).
  - Keep pending-sync badge and shared-with UI, restyled with new tokens.

### 2.7 Add/edit sheet

**Fits into plan:** primary creation flow; consumes type grid pattern and inputs from 1.3.
Design ref: `isAdd` block.

- Rebuild `AddEditModal.tsx` as a bottom sheet (max-height 92%): header row with Spectral title
  ("Nyt fund" / edit variant) + circular close button.
- Type picker: 4-column grid of square gradient tiles (all 25 types, PNG icons, Danish labels
  from the completed 1.3 label map), selected tile ringed with accent. Replaces the current
  select-based picker.
  - *Design revision (2026-07-08):* the grid became a **species selector** — a 46px "Søg art…"
    search field (Spectral placeholder, mono search icon) above the grid, and the grid showing
    max 8 tiles (4×2) at a time as horizontally snap-scrolled pages, with 6px pagination dots
    below (one per page, active dot `--map-trail`); the generic picks (Andre bær, Andre svampe,
    Andet) are always appended to search results. Implemented post-2.7.
- Placering row: surface field with pulsing brand dot + Space Mono coords + "Nuværende" hint;
  tapping opens the location editor (2.9).
- Notes textarea, "Tilføj foto" secondary button (existing `ImageCapture` flow), accent "Gem fund"
  CTA. Keep react-hook-form + Zod wiring and offline/pending behavior untouched.

### 2.8 Filter sheet

**Fits into plan:** completes the map/list toolset from 2.3's filter button. Design ref:
`isFilter` block.

- Rebuild `FilterDialog.tsx` as a bottom sheet: header with "Filtrér" + accent "Nulstil" reset.
- Category segment (Alle / Svampe / Bær): needs a mushroom-vs-berry categorization of
  `FORAGING_TYPES` (add a `category` map in `src/utils/foragingTypes.ts`; `other` counts as both
  or its own bucket — decide at implementation). Category acts as a bulk filter over the species
  list below.
- Species checklist: rows with 44px `TypeBadge`, Spectral name, square accent checkbox. Drive from
  the types present in the user's spots (as the design does with `filterTypes`), falling back to
  all types.
- Footer: accent "Vis resultater" apply button. Keep the existing filter-state contract with
  `MainMapScreen`/`MapView`/`SpotListView`.

### 2.9 Location editor ("Flyt placering")

**Fits into plan:** replaces `LocationPickerModal` with the design's fullscreen drag-map pattern;
used from both detail drawer (2.6) and add sheet (2.7). Design ref: `isLocation` block.

- Fullscreen takeover: real Mapbox map (1.4 style) fills the screen; **fixed center pin**
  (`TypeBadge` + stem + ground shadow) while the map pans underneath — pin "lifts" (translateY +
  larger shadow) while dragging, matching the design's affordance.
- Floating chrome: circular back button + "Flyt placering" title bar; italic hint chip ("Træk
  kortet for at placere pin"); bottom card with live Space Mono coordinates (map center) +
  accuracy hint, and accent "Bekræft placering" CTA.
- On confirm, return coordinates through the same callback contract `LocationPickerModal` has
  today.

### 2.10 Photo lightbox

**Fits into plan:** invoked from the 2.6 gallery. Design ref: `isPhoto` block.

- Restyle `ImageViewer.tsx`: near-black `#141009` backdrop, Space Mono "n / N" counter, circular
  close button, large rounded (20px) image with bottom gradient caption (spot name, date ·
  coords), thumbnail strip with accent ring on the active thumb. Keep existing swipe/navigation
  behavior if present.

### 2.11 Delete confirmation

**Fits into plan:** last modal surface; small. Design ref: `isDelete` block.

- Restyle `ConfirmationDialog.tsx`: centered 24px-radius card, tinted circular trash icon
  (`delTint`), Spectral title "Slet dette fund?", body copy with spot name, stacked accent
  "Slet fund" + outlined "Annullér" buttons. Keep it generic enough for other confirmations.

### 2.12 Map error state

**Fits into plan:** added to the design after the initial scoping (2026-07-08); replaces the
hard-coded English red error screen in `MapView.tsx`. Design ref: `isMapError` block.

- Design's error card over a `--map-bg` + faded-contours backdrop: surface card (22px radius)
  with `--map-land` disc + brand broken-map icon, Spectral "Kortet kunne ikke indlæses", body
  copy, accent "Prøv igen" (retry/remount), outlined "Vis fund som liste" (switch to list view),
  Space Mono error-detail footer.
- Extend detection beyond the missing-token check to runtime style-load failures
  (react-map-gl `onError`).
- While the error shows: hide FAB, locate button, and location chip (per the design's
  `showFab`/`isMapReady` logic); keep top bar and view toggle. Needs the error state surfaced to
  `MainMapScreen.tsx`.

### 2.13–2.17 Missing-element designs (added 2026-07-08)

The 1.1–2.6 implementations included provisional token-styled treatments for elements the mock
didn't show (see `plans/claude-design-brief-missing-elements.md`). Canonical designs for all of
them now exist in the design file; these subtasks reconcile the code:

- **2.13 List toolbar, sort menu & row action sheet** — count + custom sort popover (replaces
  the shadcn Select), row meta chip row (shared "Delt · N" chip), and the design's bottom action
  sheet replacing the row `DropdownMenu`. Design refs: `isList` toolbar, `sortOpen`, `isRowMenu`.
- **2.14 Map cluster & compass** — canonical cluster marker (brand circle + halo ring) and the
  compass-rose reset-north button. Design refs: cluster comment in `isMap`, `isCompass`.
- **2.15 Sign-in error & loading states** — accent-tinted error card, spinner CTA (`ss-spin`
  keyframe), Danish copy. Design refs: `signinErr`, `signinLoading`.
- **2.16 Top-bar states** — filter active-dot and photo-avatar variant. Design refs:
  `filterActive`, `avatarPhoto`.
- **2.17 Detail drawer states** — gallery buckets `g0`–`g5` (add tile under max, "+N" overlay at
  max), redesigned share section (always-visible @-input, user rows, "Kun dig" empty card), and
  the amber offline-lock notice with dimmed actions. Design refs: `showDetail` gallery/share,
  `detailLocked`.

Pending-sync chips and pin indicators were also designed; they belong to subtask 3.2
(`PendingSyncBadge`/`PendingSyncIcon`), whose spec has been updated accordingly.

---

## Phase 3 — PWA & system surfaces

### 3.1 Location permission priming screen (new feature)

**Fits into plan:** new UX step the design introduces — explains *why* location is needed before
the browser prompt, improving grant rates. Design ref: `isPermission` block.

- New component `LocationPermissionScreen.tsx`: pulsing brand target illustration, Spectral
  headline ("Find dine steder igen og igen"), reassurance copy, accent "Tillad placering" CTA
  (triggers `navigator.geolocation` / the `useUserLocation` hook's start) and "Ikke nu" skip.
- Flow wiring in `App.tsx`/`MainMapScreen.tsx`: show once after first sign-in when permission
  state is `prompt` (use the Permissions API where available); never block the app — skipping
  proceeds to the map without location features. Persist "asked" flag (localStorage) so it
  doesn't nag; re-entry point if the user later taps Locate without permission.

### 3.2 Offline banner & sync badge

**Fits into plan:** offline mode is a core recent feature (see git history); the design gives it
a dedicated treatment. Design ref: `isOffline` block.

- Restyle `OfflineBanner.tsx` to the floating card: amber-tinted surface (`offlineBg/Border/Ink`
  values for both themes), wifi-off icon, Spectral "Offline · viser gemte fund" + explanatory
  subline, positioned below the floating top bar, `ss-fade` in. Keep pending-count display.
- Restyle `PendingSyncBadge.tsx` with new tokens.

### 3.3 PWA install sheet

**Fits into plan:** design ref: `isInstall` block.

- Rebuild `PWAInstallPrompt.tsx` on the sheet primitive: app-icon tile (brand square with badge
  cluster), "Føj til hjemmeskærm" title + domain, three benefit cards (Åbner lynhurtigt / Virker
  offline / Fuld skærm), accent "Installér app" button (Android `beforeinstallprompt`), and the
  iOS share-icon instruction row under an "på iPhone" divider. Keep existing platform detection
  and session-dismiss logic.

### 3.4 PWA update toast

**Fits into plan:** design ref: `isUpdate` block.

- Restyle `PWAUpdatePrompt.tsx`: dark ink-colored toast card top of screen, refresh icon tile,
  Spectral "Ny version tilgængelig" + subline, accent "Opdatér" button. Keep the
  prompt-controlled SW update flow.

### 3.5 Splash, manifest & app identity

**Fits into plan:** makes the installed PWA match the design end-to-end. Design ref: `isSplash`
block.

- ~~Regenerate app icons from the badge-cluster concept~~ — superseded: the design's final
  monogram icon set landed 2026-07-09 and its rollout is subtask **3.7**; this subtask no longer
  touches icon files.
- `vite.config.ts` manifest: `theme_color: #2f4a32` (or `#f4efe3` — match chrome), 
  `background_color: #f4efe3`, name/short_name check.
- `index.html`: theme-color metas (light/dark media variants — coordinated with 1.1's dynamic
  updates), iOS `apple-touch-icon`, optional iOS splash images with the brand background.
- Native PWA splash comes from manifest colors + icon; the design's animated splash screen is a
  nice-to-have in-app boot screen — implement only if trivial (e.g. brief branded div while
  AuthContext restores), otherwise note as future.

### 3.6 Action toasts (success / error)

**Fits into plan:** added to the design after the initial scoping (2026-07-08); the design gives
the sonner feedback toasts a dedicated treatment. Design ref: `isToastSuccess` / `isToastError`
blocks + `fireToast` (3200ms auto-dismiss).

- Restyle sonner to the design's bottom-anchored cards (~110px above bottom, 16px radius,
  `ss-rise`, Spectral 15px message, circular dismiss ✕): success on `--brand` with gold check
  disc, error on rust-brown `#7a2e1c` with warning-triangle disc.
- Move the Toaster (mounted in `src/main.tsx`, currently top-right) to bottom-center, 3200ms
  default duration, themed via the app's `useTheme`.
- Align all toast copy to Danish "fund" terminology ("Fund gemt", "Fund slettet",
  "Kunne ikke gemme — prøv igen"); fix remaining English messages.

### 3.7 App icon replacement (added 2026-07-09)

**Fits into plan:** the design gained a final app icon — a Spectral "S" monogram in paper white
on terracotta with faint contour rings (`App Icon - Skovens Skatte.dc.html`), superseding the
badge-cluster concept 3.5 originally described. The exported PNG ladder (40–1024px) is already
committed in `public/app-icon/` and the install sheet (3.3) uses it.

- Point favicon, apple-touch-icons (`index.html`), and the manifest 192/512/maskable entries
  (`vite.config.ts`) at the new set; fix the stale `includeAssets` list (phantom `favicon.ico` /
  `masked-icon.svg`).
- Verify the maskable safe zone; generate a padded maskable variant only if needed.
- Delete the six old green icon files from `public/` after confirming nothing references them.

### 3.8 No-location state (added 2026-07-09)

**Fits into plan:** added to the design after the initial scoping; gives the "permission granted
but no GPS fix" (and denied/unsupported) case a visible treatment instead of today's silent
degradation. Design ref: `showNoLoc` block + `noLoc` state in `Skovens Skatte.dc.html`.

- Centered amber badge "Ingen lokation — tjek din GPS" (Space Mono 11px, crossed-pin icon)
  replaces the location chip on the map view; the **locate button is removed** while no location
  is available.
- `useUserLocation` exposes a status so consumers can distinguish "locating" from "unavailable".
- The add sheet always opens (FAB is never a dead button); without a location its Placering
  section shows the design's amber warning + "Tilføj lokation manuelt" button (opens the 2.9
  location editor), and "Gem fund" stays disabled until a location arrives automatically
  ("Nuværende") or is picked manually ("Manuel"). Design ref: `addLocEl`/`addLoc` in the script.

### 3.9 Satellite map mode (added 2026-07-09)

**Fits into plan:** added to the design after the initial scoping; lets users inspect terrain
(canopy, clearings, field edges) on real imagery. Design ref: `mapStyle` state, `toggleMapStyle`,
`mapBgEl` / `layersBg` / `layersInk` / `layersLabel` in `Skovens Skatte.dc.html`.

- 52px circular "layers" toggle top-right below the floating bar (visible when map ready — also
  in the no-location state; hidden with sheets/map error). Inactive: surface + brand icon;
  active: inverted brand fill, same pattern as the locate button. Icon-only, `aria-label`
  "Satellit"/"Kort".
- Basemap swaps to a **custom Mapbox Studio satellite style** (single, theme-independent;
  Satellite Streets classic template thinned per the 1.4 recipe, trails as light-gold dashes) —
  stock `satellite-streets-v12` fallback via `VITE_MAPBOX_STYLE_SATELLITE`. All other map chrome
  (pins, clusters, user dot, chip, locate, compass) is unchanged.
- Mode is session-only (persists across view switches/sheets; boots in base mode). Location
  editor stays on the base style.

## Phase 4 — Polish & cleanup

### 4.1 Dark-mode + safe-area audit

Walk every screen in both themes (and iOS standalone mode): contrast, `--pin-ring` on dark maps,
scrims, safe-area insets on floating chrome and sheets, keyboard-over-sheet behavior in the add
flow. Fix stragglers.

### 4.2 Dead-code and style cleanup

Remove the old green tokens, unused shadcn variants, unused per-type icon components in
`src/components/icons/` (the SVG ones superseded by PNGs — verify unused first), `IconShowcase`
if not kept as a style reference, and any Dialog-based leftovers replaced by sheets. `npm run
lint` + `npm run build` clean.

### 4.3 Asset optimization (optional but recommended)

`public/spot_types/*.png` total ~19 MB (600 KB–1 MB each) and are displayed at ≤72px. Resize to
~160px and compress (expect >90% reduction) — big win for offline precache size and first-load.
Verify visual quality at all badge sizes.

### 4.4 Final verification

- `npm run build` + `npm run preview`; Lighthouse PWA pass.
- Manual QA script: welcome → sign-in → permission priming → map (locate, pins, cluster) → list
  (search, sort, distance) → detail (gallery, lightbox, edit location, share, delete) → add flow
  (type grid, photo, save) → filter → offline mode (banner, pending sync) → install prompt →
  update toast → theme toggle + system theme change → map error card (invalid/missing token) →
  no-location badge + hidden locate button (DevTools Sensors: "Location unavailable") →
  satellite toggle (imagery, inverted button, persists across view switch, hidden with
  sheets/map error, offline tiles) →
  success/error toasts (save, delete, failed mutation) → list sort menu + row action sheet →
  map cluster + compass (rotate) → sign-in error/loading → detail gallery at 0/1/2/3/5 photos →
  share section (empty + populated) → offline-locked detail.

---

## Out of scope / future ideas

Deliberately excluded from this migration (design shows them; agreed to skip):

- **Guest mode** ("Fortsæt som gæst" on sign-in) — needs an account-less data story.
- **Latin species names** in list/detail — needs a species metadata map.
- **"Naviger" action** in the detail drawer — deep-link to Apple/Google Maps directions.
- Animated in-app splash beyond the manifest splash (see 3.5).
- Reverse-geocoded location chip label ("Silkeborg Skov") if no geocoding exists today (see 2.3).

## Suggested execution order & dependencies

```
1.1 tokens/theme ──► 1.2 fonts ──► 1.3 primitives ──► 2.1 welcome ──► 2.2 sign-in
        │                                   │
        └────► 1.4 mapbox styles            ├──► 2.3 chrome ──► 2.4 map ──► 2.5 list
                                            │        │
                                            │        └──► 2.8 filter
                                            ├──► 2.6 detail ──► 2.9 location editor
                                            │        └──► 2.10 lightbox   └─(also 2.7)
                                            ├──► 2.7 add/edit
                                            └──► 2.11 delete confirm
Phase 3 (3.1–3.5) after 2.3; Phase 4 last.
```

Each subtask should end with the app building (`npm run build`) and running (`npm run dev`)
with no regressions in CRUD, auth, offline sync, or PWA behavior.
