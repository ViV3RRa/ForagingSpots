# Bottom-sheet rework: three-zone skeleton, scroll-edge affordances, collapsing detail header

## Context

The design project (`dd75eb78-ea23-46b0-ba4b-7aeb33aff7e4`) gained a bottom-sheet rework,
specified in the design file `SHEET_CHANGES.md` and prototyped live in `Skovens Skatte.dc.html`
(collapsed-header variant "1a — floating pill" chosen, see `Collapsed Header Options.dc.html`).

Goal: a consistent **pinned header → scrolling body → pinned footer** skeleton on the three
scrollable sheets, scroll-edge hairlines/shadows + a soft top mask, and (detail sheet only) a
header that collapses into a floating pill. Primary actions become always-reachable regardless
of content length.

**Scope decisions (Søren, 2026-07-15):**
- Skip the Latin-name line shown in the design (no scientific-name data in the model).
- Skip the Add/Edit dismissal guard for now (keep today's free dismissal).
- Do NOT touch: location editor, row action menu, delete confirmation, install/update sheets,
  photo gallery.

## Design values (from the prototype — authoritative)

- **Edge detection:** `atTop = scrollTop <= 2`; `atBottom = scrollTop + clientHeight >= scrollHeight - 2`.
- **Header (scrolled):** `border-bottom: 1px solid var(--line2)` +
  `box-shadow: 0 8px 16px -10px rgba(20,15,8,.32)`; transparent border + no shadow at top.
  Transition `box-shadow .2s ease, border-color .2s ease`.
- **Footer (more content below):** `border-top: 1px solid var(--line2)` +
  `box-shadow: 0 -6px 16px -10px rgba(20,15,8,.22)`; transparent/none at bottom. Same transition.
- **Body top mask (add/filter):** scrolled →
  `mask-image: linear-gradient(to bottom, transparent 0, #000 22px)`; at top → `none`.
  (Set both `-webkit-mask-image` and `mask-image`.)
- **Detail sheet collapse:** `scrolled = scrollTop > 2`, `collapsed = scrollTop > 12`.
  Icon 72→46 px, title 26→19 px. Pill (collapsed): `background: var(--surface);
  border: 1px solid var(--line); border-radius: 999px; padding: 7px 16px 7px 7px;
  box-shadow: 0 3px 10px -4px rgba(20,15,8,.18)`; expanded: transparent bg/border, padding 0.
  Status chip slides in: `max-width 0→150px`, `opacity 0→1`. All at `.22s ease` (opacity `.18s`).
- **Detail body mask** (the header floats OVER the body): expanded →
  `linear-gradient(to bottom, transparent 0, transparent 100px, #000 118px)`; collapsed →
  `linear-gradient(to bottom, transparent 0, transparent 66px, #000 84px)`.
- **Detail footer buttons:** "Redigér" (brand, flex-1) + "Slet" (icon button, surface + line
  border, accent icon). The share icon button is REMOVED from the action row (the share section
  stays in the body). Footer padding `14px 24px 24px`, gap 10 px.
- **Add/filter footers:** existing button styling unchanged; footer padding `14px 24px` + the
  sheet's existing bottom padding.

## Implementation

### 1. New hook: `src/hooks/useScrollEdges.ts`

Returns `{ ref, atTop, atBottom, scrolled, collapsed }` for a scrollable node:

- `scroll` listener on the ref'd node; internal state is the four derived booleans
  (thresholds 2/2/2/12 px) and only calls setState when a boolean actually flips —
  no re-render per scroll pixel.
- ResizeObserver on the node: content growing/shrinking changes `atBottom` without a scroll
  event (e.g. gallery images loading in the detail sheet).
- Initial state `atTop: true, atBottom: true` (no affordances until measured); measure once
  after mount.

Small style helpers in the same file map the booleans to the shared affordance styles
(header border/shadow, footer border/shadow, body mask as inline style — mask gradients are
not cleanly expressible as Tailwind classes).

`src/components/ui/sheet.tsx` needs NO structural change (handle + drag-to-dismiss stay;
sheets build their own zones inside SheetContent). Verify the handle's `-mb-[12px]` overlap
still hit-tests above the detail sheet's floating header (handle has `z-10`; keep the floating
header below that).

### 2. Detail sheet — `src/components/PinDetailsDrawer.tsx` (the big one)

Restructure the SheetContent children (currently ONE scroll div wrapping everything, ~line 232):

1. **Floating collapsing header** — absolutely positioned below the drag handle
   (`absolute inset-x-0 z-[5] px-[22px] pointer-events-none`, inner pill
   `pointer-events-auto`). One flex row that morphs between states (as the prototype does):
   TypeBadge 72→46 px (animate the wrapper's width/height; TypeBadge accepts className/style),
   title `text-[26px]` → `text-[19px]` (font-size transition), PendingSyncBadge in a
   max-width/opacity wrapper — expanded shows the `long` badge under the title as today,
   collapsed shows the compact chip on the pill's trailing edge. No chip for spots without
   sync state.
2. **Scroll body** (`useScrollEdges` ref): gallery, meta rows (incl. the inline coordinates
   "Redigér ›" — unchanged), notes, sharing section, offline notice. Top padding ~118 px to
   clear the expanded header; two-state mask (100/118 ↔ 66/84).
   `shareSectionRef.scrollIntoView` keeps working (now scrolls the body zone).
3. **Pinned footer** (only when `isOwner`): "Redigér" (brand, flex-1, existing Edit icon) +
   "Slet" icon button. Share icon button removed. Keep `disabled={isEditDisabled}` handling.
   Scroll-reactive top hairline/shadow.

Keep: `onInteractOutside` guard, free dismissal via handle/scrim (no close button),
`max-h-[88%]`.

Danger point: the sheet is content-sized (`h-auto`) — with an absolutely-positioned header the
body must reserve height. Give the body a `min-h` (~200 px) so a short sheet never lets the
pill overlap the footer.

### 3. Add/Edit sheet — `src/components/AddEditModal.tsx`

- Header: unchanged content (title + close button) but the static `border-b border-line2`
  becomes the scroll-reactive border/shadow.
- Body: existing scroll div gets the `useScrollEdges` ref + the 22 px soft top mask.
- Footer: move the submit button from the end of the scroll div into a new `shrink-0` footer
  div **inside the `<form>`** (the form already wraps both as a flex column — the button stays
  `type="submit"`). Keep the disabled/opacity classes (`disabled:opacity-[.45]` etc.).
  Scroll-reactive top hairline/shadow.
- No collapsing header, no dismissal-guard changes, close button stays, `handle={false}` stays.

### 4. Filter sheet — `src/components/FilterDialog.tsx`

- Header: static `border-b border-line2` → scroll-reactive border/shadow.
- Body: `useScrollEdges` ref + 22 px top mask.
- Footer: already pinned — swap the static `border-t border-line2` for the scroll-reactive
  version.

## Files touched

- `src/hooks/useScrollEdges.ts` (new)
- `src/components/PinDetailsDrawer.tsx` (restructure)
- `src/components/AddEditModal.tsx` (footer move + affordances)
- `src/components/FilterDialog.tsx` (affordances)
- `src/components/PendingSyncBadge.tsx` (only if the compact chip needs a shorter label than
  the existing "Afventer synk"/"Synk-fejl"; design shows "Afventer"/"Sync-fejl")
- `src/components/ui/sheet.tsx` (no structural change expected)

## Verification

Playwright against a preview build + local PocketBase on port 8091 (QA user + seeded spots:
with notes/images/shared, a pending offline spot, and a minimal short-content spot). Reuse the
scratchpad harness pattern from `verify-004/005.mjs`.

1. **Detail sheet:** open from pin → expanded header (72 px badge, 26 px title, transparent
   pill); scroll down → pill collapses (46 px/19 px, surface bg + border), header shadow
   appears; footer hairline/shadow disappears at scroll end; back to top → expands. Assert
   computed styles + screenshots in light AND dark theme.
2. **Pending spot:** compact chip visible in the collapsed pill; normal spot → no chip.
3. **Footer:** "Redigér" opens the edit sheet, "Slet" opens the confirm dialog, no share button
   in the footer; share input still works in the body; short-content sheet → no overlap, no
   affordances.
4. **Add sheet:** "Gem fund" pinned while the species grid scrolls; disabled without location;
   submit still fires through the form; affordances flip.
5. **Filter sheet:** affordances flip; "Vis resultater" applies filters.
6. **Regressions:** drag-to-dismiss suite (verify-004) and editor-layering suite (verify-005)
   still pass; `npm run lint` + build clean.
7. Real-device check (Søren): collapse animation feel on iPhone (installed PWA) — thresholds
   2/12 px and .22 s timings come from the prototype and may want tuning.
