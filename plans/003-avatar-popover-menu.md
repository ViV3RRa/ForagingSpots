# Plan 003 — Avatar popover (account menu) redesign

Design reference: `Skovens Skatte.dc.html` in the Claude Design project, jump-rail state
`account` ("Konto-menu"). Prototype markup lines ~271–302, theme-row logic ~1219–1227.

## What exists today

`src/components/TopBar.tsx:76-124` already has a Radix `DropdownMenu` on the avatar with:
a static name/email block, a "Tema" radio group (Lyst/Mørkt/Følg system via
`ThemeContext.setPreference`, persisted to `localStorage['ss-theme']`), and a "Log ud" item
calling `onSignOut`. Functionally the new design keeps all of this — the changes are
(a) a fully restyled panel and (b) the name/email block becomes a **tappable profile row**
that opens the new "Rediger profil" sheet (plan 004).

## Approach

Keep the Radix `DropdownMenu` (free: outside-tap/Escape dismissal, focus management,
anchor positioning) and restyle its content to match the design, rather than hand-rolling
a popover like the `SpotListView` sort menu. `align="end"` + `sideOffset` reproduces the
design's placement (right-aligned under the avatar).

## Changes

### 1. Panel chrome (`DropdownMenuContent`)

- Width `250px` (design: `width:250px`), `rounded-[18px]`, `p-[6px]`,
  `border border-line bg-surface`, shadow `0 16px 40px -10px rgba(0,0,0,.34)`,
  entrance `animate-[ss-fade_.16s_ease]` (keyframe already in `tokens.css`).
- If the default Radix item styling from `ui/dropdown-menu.tsx` fights the design,
  restyle via `className` per item — don't fork the ui component.

### 2. Profile row (new, replaces the static name/email block)

Top of the menu, a `DropdownMenuItem` (so it closes the menu on select):

- 44px circular avatar, `overflow-hidden`, `bg-brand`, border `2px solid var(--pin-ring)`
  + `0 0 0 1px var(--line)` ring — reuse the existing `Avatar`/`AvatarImage`/`AvatarFallback`
  pattern from the trigger button (`TopBar.tsx:42-44` builds the file URL with `?thumb=96x96`).
- Text block (`flex-1 min-w-0`): name — Spectral (`font-serif`) 16px semibold `text-ink`,
  truncated; email — 13px `text-muted`, truncated.
- Trailing chevron-right, 16px, stroke `var(--mono)`.
- Row: `gap-12px`, `padding 12px 12px 13px`, `rounded-[13px]`.
- `onSelect` → `onOpenProfile()` (new TopBar prop, see §5).

### 3. Theme section (restyle of existing radio group)

- Divider: `1px` `bg-line2`, margin `4px 8px` (design uses explicit divs, not the Radix
  separator's default inset).
- Label "Tema": Space Mono (`label-mono` class already used here) — 10.5px, letter-spacing
  `.16em`, uppercase, `text-mono`, padding `10px 12px 6px`.
- Three rows (Lyst / Mørkt / Følg system), each:
  - Leading fixed 8px column holding a 7px accent dot **only on the active row**
    (this replaces Radix's default radio indicator).
  - 18px stroke icon in `text-ink2`: sun / moon / monitor — the current lucide
    `Sun`/`Moon`/`Monitor` icons match the design's paths closely enough.
  - Label: Spectral 15px `text-ink`.
  - Active row background: `rgba(181,80,47,.07)` light / `rgba(201,162,75,.12)` dark —
    same pattern as the sort menu's active row (`SpotListView.tsx:~190`):
    `bg-[rgba(181,80,47,.07)] dark:bg-[rgba(201,162,75,.12)]`.
  - Row: `gap 11px`, `padding 10px 12px`, `rounded-[12px]`.
- Behavior unchanged: `setPreference('light'|'dark'|'system')`.

### 4. Log ud row

- Divider as above.
- Row: logout icon (18px) + "Log ud", both `text-accent`, Spectral 15px `font-medium`,
  `gap 11px`, `padding 12px`, `rounded-[12px]`. Calls `onSignOut` (unchanged).
- Note: in the prototype "Log ud" just closes the menu — the real handler stays wired
  to the existing sign-out.

### 5. Plumbing for the profile sheet entry point

`TopBar` gets `onOpenProfile: () => void`. (Correction found during implementation:
TopBar is mounted only once, in `MainMapScreen.tsx` — it floats over both the map and
list views, which are a `viewMode` switch inside the same screen.) Plumb
`onOpenProfile` from `App.tsx` through `MainMapScreen` exactly like `onSignOut`; the
sheet itself is owned by `App.tsx` (see plan 004 §6) so it works from both views.

**Status: implemented.** Until plan 004 lands, `App.tsx`'s `handleOpenProfile` is a
no-op stub — the profile row closes the menu but opens nothing yet.

## Acceptance checks

- Tapping avatar opens the 250px panel right-aligned under the avatar; outside tap /
  Escape closes it.
- Profile row shows current avatar (photo or initial fallback), name, email, chevron;
  long names/emails truncate with ellipsis; tapping it closes the menu and opens the
  profile sheet — from both map and list view.
- Active theme row shows the accent dot + tinted background; switching themes works as
  before and the tint/dot follow.
- "Log ud" renders in accent color and signs out.
- Panel is correct in dark mode (tokens only, no hardcoded light values except the
  intentional active-row rgba pair).
