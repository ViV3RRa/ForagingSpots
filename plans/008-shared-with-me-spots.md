# Plan 008 — Spots shared *with me* (guest finds)

**Status: implemented** (2026-07-20; lint + build pass, manual two-user
verification against local PocketBase still pending)

Implement the "shared with me" treatment prototyped in the Claude Design project
(`Skovens Skatte.dc.html`). The design distinguishes two things that today look
identical in the app:

- **Shared *by* me** — a spot I created and shared with others. Keeps the neutral
  grey **"Delt · N"** chip and the owner-side "Delt med" management section.
- **Shared *with* me** ("guest find") — a spot **another user** created and shared
  with me. Gets a distinct amber **"Delt af {ejer}"** chip in the list and a
  **"Delt med mig af"** attribution card in the detail sheet, with no edit/delete
  affordances.

Changes land in exactly two surfaces: the **list view** (`SpotListView.tsx`) and
the **detail sheet** (`PinDetailsDrawer.tsx`).

## Background — what already exists

- The backend already returns shared-with-me spots. The `foraging_spots` list/view
  rule (migration `1783683771_collections_snapshot.js`) is
  `user = @request.auth.id || sharedWith ~ @request.auth.username`, so a spot whose
  `sharedWith` contains my username arrives in the normal `getAll()` payload.
- Ownership is already derivable everywhere: a guest spot is one where
  `spot.user !== currentUser.id`.
- `PinDetailsDrawer` already **hides the edit/delete footer for non-owners**
  (`isOwner` gate, `PinDetailsDrawer.tsx:468`) and already renders a placeholder
  non-owner card ("Denne lokation er delt med dig", lines 456–460). This plan
  *upgrades* that card — the footer work is done.
- `SpotActionSheet` already gates Redigér/Del/Slet behind `isOwner`, so a guest
  spot's row menu correctly shows only "Vis på kort". **No change needed there.**
- The owner's identity is available via the expanded relation `spot.expand.user`
  (every fetch uses `expand: 'user'`). `UserSchema` exposes `name` and optional
  `username`.

This is *mostly* a presentation change, with **one backend rule change**: the
owner's username only reaches the client if the `users` view rule permits
expanding another user's record (see "Owner username" below).

### Owner username — `users` view rule (migration)

`expand: 'user'` honours the **target** collection's `viewRule`. The `users`
rule was `id = @request.auth.id` (own record only), so PocketBase silently
dropped `expand.user` on a spot owned by someone else and the UI fell back to
"en ven". Migration `1784505600_relax_users_view_for_shares.js` widens it by
exactly one correlated case:

```
id = @request.auth.id || foraging_spots_via_user.sharedWith ?~ @request.auth.username
```

The `foraging_spots_via_user` back-relation keeps both halves bound to the same
rows (spots this user owns), so it can't be satisfied by an unrelated share. It
exposes only id/username/name/avatar/created/updated of owners who shared with
you; `email` stays hidden and `listRule` stays own-record-only (no user-table
enumeration). Applies on the next prod PocketBase restart. Verified accepted by
PB 0.37.5 (`migrate up` against a pb_data copy) — two-user functional check
still pending.

### Owner-name helper (shared by both surfaces)

The design labels the guest chip / card with the owner's **username**, falling back
to their name, then to a generic "en ven":

```ts
const ownerName =
  spot.expand?.user?.username || spot.expand?.user?.name || 'en ven';
```

Consider a tiny shared helper (e.g. `src/utils/spotOwner.ts`) exporting
`getOwnerName(spot)` so the list and detail stay in sync, but inlining in each file
is acceptable given it's two call sites.

## Step 1 — List view: guest chip (`SpotListView.tsx`)

Today the row meta strip (lines 250–265) shows the "Delt · N" chip whenever
`sharedWith.length > 0` — which is **wrong for guest spots**, because a guest
spot's `sharedWith` contains my own username (plus possibly others), so it
currently mislabels a received share as "Delt · N".

Fix by branching on ownership. `user` from `useAuth()` is already in scope
(used for `SpotActionSheet` at line 307).

```tsx
// alongside the existing per-row derivations (~line 211)
const isOwner = isPending || user?.id === spot.user;
const ownerName =
  spot.expand?.user?.username || spot.expand?.user?.name || 'en ven';
```

Replace the meta block (lines 250–265) so that:

- **Owner spot** → existing pending badge and, if `sharedWith.length > 0`, the grey
  "Delt · N" chip (unchanged).
- **Guest spot** (`!isOwner`) → an amber **"Delt af {ownerName}"** chip with the
  person icon, and **never** the "Delt · N" chip.

```tsx
{(isPending || (isOwner && sharedWith.length > 0) || !isOwner) && (
  <div className="mt-[9px] flex flex-wrap items-center gap-[6px]">
    {isPending && <PendingSyncBadge hasError={hasError} />}

    {isOwner && sharedWith.length > 0 && (
      /* existing grey "Delt · N" chip — unchanged */
      <span className="inline-flex items-center gap-[5px] rounded-[8px] bg-line2 px-[9px] py-[3px] text-[11px] font-semibold text-ink2">
        {/* share-network icon */}
        Delt · {sharedWith.length}
      </span>
    )}

    {!isOwner && (
      <span className="inline-flex items-center gap-[5px] rounded-[8px] bg-offline-bg px-[9px] py-[3px] text-[11px] font-semibold text-offline-ink">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Delt af {ownerName}
      </span>
    )}
  </div>
)}
```

**Palette:** the design's amber (`pendBg`/`pendInk`) already exists as the
`--offline-bg` / `--offline-ink` tokens (light `#f6ecd4`/`#7a5a1e`, dark
`#33301f`/`#e8dcae`) — reuse `bg-offline-bg text-offline-ink`. Do **not** hardcode
hex; those tokens are theme-aware.

## Step 2 — Detail sheet: attribution card (`PinDetailsDrawer.tsx`)

`isOwner` is already computed (line 66). Add the owner name near it:

```ts
const ownerName =
  spot?.expand?.user?.username || spot?.expand?.user?.name || 'en ven';
```

Replace the placeholder non-owner card (lines 456–460) with the design's
**"Delt med mig af"** attribution block — a `MonoLabel` heading plus a card with the
owner's initial-avatar, username, and the subtitle "Delte denne lokation med dig":

```tsx
{!isOwner && (
  <div className="mt-[24px]">
    <MonoLabel className="mb-[12px] block">Delt med mig af</MonoLabel>
    <div className="flex items-center gap-[12px] rounded-[13px] border border-line bg-surface px-[14px] py-[11px]">
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-brand font-serif text-[15px] font-semibold text-brand-ink">
        {ownerName.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[15.5px] text-ink">{ownerName}</div>
        <div className="mt-[1px] text-[12.5px] text-muted">Delte denne lokation med dig</div>
      </div>
    </div>
  </div>
)}
```

The owner-side "Delt med" section (lines 407–443), the offline-lock notice
(446–453), and the pinned footer (468–492) are all already `isOwner`-gated — leave
them as-is. A guest spot therefore shows: gallery + meta + notes + this attribution
card, and **no footer** (matching the prototype's `detFooterDisplay: 'none'`).

## Verification

1. `npm run lint` and `npm run build`.
2. Run against a **local** PocketBase (per CLAUDE.md, a plain build hits prod):
   `VITE_POCKETBASE_URL=http://127.0.0.1:8090 npm run dev`.
3. Seed two users; from user A share a spot with user B (add A's spot with B's
   username in "Delt med"). Sign in as **B** and check:
   - **List:** B's own shared spots still show grey "Delt · N"; A→B spot shows amber
     "Delt af {A's username}" and **no** "Delt · N".
   - **Detail:** opening A→B spot shows the "Delt med mig af" card with A's
     username and no Redigér/Slet footer; the row's ⋮ menu shows only "Vis på kort".
   - **Owner side unchanged:** signed in as A, the same spot still shows "Delt med"
     with B listed and the full edit/delete footer.
4. Check both light and dark themes (amber token flips correctly).
5. Edge cases: owner with no `expand.user` (offline cache) falls back to "en ven";
   pending offline spots are always treated as owned (never render as guest).

## Notes / follow-ups

- `src/lib/collection-schemas.ts` (lines 106–110) documents an **owner-only** rule
  that disagrees with the applied migration (which includes sharing). It isn't
  imported anywhere, so it's dead reference text — but worth reconciling to avoid a
  future migration accidentally dropping the sharing rule.
- Related idea doc: `feature_ideas/hide-shared-spots-i-dont-want.md` (letting users
  hide unwanted received shares) — out of scope here, but this plan's `!isOwner`
  branch is the natural hook point for it later.
