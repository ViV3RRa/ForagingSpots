# Hide shared spots I don't want to see

## The idea

When someone shares a spot with me that I'm not interested in (clutters the map/list,
not relevant, etc.), I want to hide it — filter it away from my own map and list —
without affecting the owner or the other people it's shared with.

Hiding is **recoverable**: a "show hidden shared spots" toggle brings them back so I can
un-hide. Hiding only ever applies to spots shared *with* me, never my own.

## Chosen model: a per-user "dismissed" collection (syncs across devices)

A hide is a per-user `(user, spot)` record in a new `hidden_spots` collection. It never
touches the owner's record, so their `sharedWith` and the OR-based `listRule` stay exactly
as they are — the server still sends me the shared spot; my client filters it out unless I
ask to see it. Because it's server-side and per-user, the hide follows me across devices.

Rejected alternatives:
- **Local-only hide** (localStorage/Dexie): simplest, but doesn't sync across my devices.
- **True unshare** (remove myself from the owner's `sharedWith`): would require relaxing
  `foraging_spots.updateRule` (currently owner-only) to let recipients write to someone
  else's record — a security/data-integrity headache, and it comes back if re-shared.

## Key backend constraint (why "unshare" is off the table)

`foraging_spots` today:
- **listRule / viewRule**: `@request.auth.id != "" && (user = @request.auth.id || sharedWith ~ @request.auth.username)`
  — I get spots I own OR spots shared with my username.
- **updateRule**: `@request.auth.id != "" && user = @request.auth.id` — **only the owner can write.**

So a recipient literally cannot remove themselves from `sharedWith`. A separate per-user
collection sidesteps this entirely.

## Sketch

### New collection: `hidden_spots`

| Field | Type | Notes |
|---|---|---|
| `user` | relation → users, required | who hid it |
| `spot` | relation → foraging_spots, required, **cascadeDelete: true** | deleting a spot cleans up its hide rows |
| `created` / `updated` | autodate | |

Rules — all scoped to `user = @request.auth.id` (you only ever see/create/delete your own hides):
- list / view: `@request.auth.id != "" && user = @request.auth.id`
- create: `@request.auth.id != "" && user = @request.auth.id`
- delete: `@request.auth.id != "" && user = @request.auth.id` (this is the "un-hide")
- Unique index on `(user, spot)` so a double-hide can't create duplicate rows.

⚠️ **Provisioning caveat:** `/pocketbase` is gitignored, so a migration file won't reach
prod via git — and prod (`foraging.viverra.dk`) still runs **0.22.27** (Dao migration API),
while local runs **0.37.5** (`app` API). Cleanest path: create the collection through the
**Admin UI on both servers**, identically. A local 0.37.5 migration file is optional.

### Client wiring

- **`schemas.ts` / `types.ts`** — add `HiddenSpotSchema`. This is a *separate* query, not a
  field on `ForagingSpotSchema`, so **`PERSIST_BUSTER` does not need bumping** — the persisted
  spot shape is untouched.
- **`api.ts`** — `hiddenSpotsApi`: `getAll()` → current user's hide records; `hide(spotId)`
  → create; `unhide(spotId)` → find + delete.
- **`queryClient.ts`** — add `queryKeys.hiddenSpots.all`.
- **`useHiddenSpots.ts`** (new) — `useHiddenSpots()` returns a `Set<string>` of hidden spot
  IDs; `useHideSpot()` / `useUnhideSpot()` mutations with optimistic Set updates + rollback
  + toast, mirroring existing mutation patterns in `useForagingSpots.ts`.
- **Offline** — to stay consistent with the persisted spot list (plan 007), add the
  `hiddenSpots` query to the persister's `shouldDehydrateQuery` allowlist in `main.tsx`;
  otherwise hidden spots reappear on a cold offline boot. The hide *action* itself can be
  online-first for v1 (optimistic, rolls back offline); offline hiding is a follow-up.

### Filtering — one hook point

`MainMapScreen.tsx` `filteredSpots` (~line 174) is the single fan-out to both map and list:

```ts
const isShared = (s) => s.user !== user.id && !(s as ForagingSpotWithPending)._pending;
// when !showHidden: drop spots where isShared(s) && hiddenIds.has(s.id)
```

Only shared spots are hideable — own spots are never touched. Keep the `totalSpots`
semantic (empty-account vs filters-hid-everything) in mind when counting.

### UI

- **Hide entry point** — non-owners currently get only "Vis på kort" in `SpotActionSheet`
  and a read-only "Denne lokation er delt med dig" banner in `PinDetailsDrawer`. Add a
  **"Skjul fra mine"** action for non-owners in both places, and a **"Vis igen"** (un-hide)
  action when a hidden spot is being shown.
- **Show-hidden toggle** — a **"Vis skjulte delte fund"** switch in `FilterDialog`, as its
  own boolean state (separate from `activeFilters: Set<ForagingType>`, threaded the same
  way). When on, hidden spots reappear, ideally with a subtle marker.

## Open questions

1. **Hide entry point** — action sheet only, or also on the drawer's "delt med dig" banner?
   Leaning: both.
2. **Provisioning** — Admin UI on both servers (leaning), or also a local 0.37.5 migration file?
3. **Marker for shown-hidden spots** — how to visually distinguish a hidden-but-shown spot
   from a normal one on map + list.
