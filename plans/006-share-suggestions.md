# Plan 006 — Share suggestions ("Delt med før" chips)

**Status: implemented** (2026-07-20; lint + build pass, manual verification
against local PocketBase still pending)

Implement the share-suggestions design from the Claude Design project
(`Skovens Skatte.dc.html`, add-sheet sharing editor): below the
"Del med brugernavn…" input in the add/edit sheet, show a **"Delt med før"**
label and a wrapping row of pill chips — one per username the user has shared
with before, ranked by how often. Tapping a chip adds that username as a
committed share row.

**Hard requirement:** suggestions must be derived **only from spots the
current user created** — never from spots other users have shared with them.
The server's list rule (`user = @request.auth.id || sharedWith ~
@request.auth.username`) returns both, so the client must filter by
`spot.user === currentUser.id`.

## Data derivation

Pure client-side, no backend changes, no new queries:

1. Take the spots already in the TanStack Query cache (the same
   `foragingSpots` array `MainMapScreen` receives).
2. Keep only own spots: `spot.user === user.id`. Also keep **pending offline
   spots** — they are by definition self-created, but carry the placeholder
   `user: 'current-user'` (`src/hooks/usePendingSpots.ts:144`), so the filter
   is `spot.user === user.id || spot.pending`.
3. Count each username's occurrences across those spots' `sharedWith` arrays.
4. Sort by count descending, tiebreak `localeCompare` — matching the design
   prototype's ranking exactly.

Usernames are raw strings (typos included) — no validation, no lookup, per
the feature brief. Dedupe is exact-string only.

## Steps

### 1. `useShareContacts` hook (new file `src/hooks/useShareContacts.ts`)

```ts
export function useShareContacts(
  spots: ForagingSpotWithPending[],
  currentUserId: string,
): string[]
```

`useMemo` over `[spots, currentUserId]` implementing the derivation above.
Returns the full ranked list — filtering out already-added names is
presentation logic and stays in the modal (state lives there).

### 2. Wire through `MainMapScreen`

`MainMapScreen` already has both inputs as props (`user`, `foragingSpots`).
Call the hook once and pass the result to **both** `AddEditModal` instances
(add: `MainMapScreen.tsx:274`, edit: `MainMapScreen.tsx:283`) as a new
`shareSuggestions` prop.

### 3. Render the chip block in `AddEditModal`

New optional prop `shareSuggestions?: string[]` (default `[]`). In the
"Delt med" section, directly below the input+plus row
(`AddEditModal.tsx:492-520`), render:

- **Visible chips** = `shareSuggestions`
  - minus anything already in `sharedWith` state (no duplicates offered;
    removing a share row automatically re-suggests it), and
  - when `shareUsername` (the typed input value) is non-empty, narrowed to
    case-insensitive substring matches — the typing-filter interaction the
    static prototype couldn't do.
- If the visible list is empty (no history, everything added, or no matches),
  render **nothing** — the section collapses to today's layout.
- Block markup (design → Tailwind tokens):
  - wrapper `mt-[14px]`
  - label: `<MonoLabel className="text-[10.5px] text-faint">Delt med før</MonoLabel>`
    with `mb-[9px]` (design uses the faint color + 10.5px, slightly quieter
    than the default `.label-mono`)
  - chip container: `flex flex-wrap gap-[8px]`
  - chip: `<button type="button">` with
    `flex h-[38px] items-center gap-[8px] rounded-full border border-line
    bg-surface pl-[5px] pr-[12px]` and `aria-label={`Del med ${username}`}`
    - avatar: `flex size-[28px] shrink-0 items-center justify-center
      rounded-full bg-brand font-serif text-[12.5px] font-semibold
      text-brand-ink` — first letter uppercased
    - name: `font-serif text-[14.5px] text-ink` — **no `@` sigil** (the
      design keeps chips quieter than the committed rows, which do show `@`)
    - trailing `<Plus className="size-[15px] text-brand" strokeWidth={2} />`
- Tap handler: append to `sharedWith` and clear `shareUsername` (if the user
  typed to filter, the tap consumes the query). Guard against duplicates the
  same way `handleAddShare` does.

### 4. No dirty-tracking changes needed

`isDirty` already compares `sharedWith.join('\n')` against the initial
snapshot (`AddEditModal.tsx:127,193`), so adding via chip enables
"Gem ændringer" exactly like typing a name.

## Not in scope (per brief + design)

- No backend user search/validation; names stay free text.
- No changes to the read-only "Delt med" list in the detail drawer.
- No avatars beyond the first-initial treatment.

## Verification

- `npm run lint` and `npm run build` pass.
- Manual against local PocketBase (`serve.sh`, port 8090):
  1. User with share history opens the add sheet → chips appear ranked by
     frequency; both themes look right.
  2. Tap a chip → committed row appears, chip disappears, save button enables
     (edit mode); remove the row → chip returns.
  3. Type in the share input → chips narrow (substring, case-insensitive);
     typing an unknown name + plus still works as today.
  4. Edit a spot that already has shares → those names are rows, not chips.
  5. **The key constraint:** with a second account, share a spot *to* the
     test user from account B with a username the test user has never typed
     (e.g. `b_only_friend`). That name must NOT appear as a suggestion for
     the test user.
  6. Fresh user with no spots/history → section identical to today.
