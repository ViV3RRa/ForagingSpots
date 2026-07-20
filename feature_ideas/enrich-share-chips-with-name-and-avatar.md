# Enrich share-suggestion chips with full name and avatar

**Idea:** resolve the usernames behind the "Delt med før" chips (and possibly
the committed share rows / detail-drawer list) to real user records, so chips
can show the person's actual avatar and full name instead of just a
first-initial disc + handle.

## Blocker today

The `users` collection only allows self-access
(`listRule` / `viewRule` = `id = @request.auth.id` in
`pb_migrations/1783683771_collections_snapshot.js`), so the client cannot
look up another user by username at all. Lookup is by username, which
requires a **list** query with a filter — so `listRule` is the rule that
must open up.

## Options

**A — open to all authenticated users:** `listRule: "@request.auth.id != ''"`.
Simple, but makes every user's name/avatar enumerable by anyone logged in
(emails stay hidden via `emailVisibility=false`).

**B — scoped to existing share contacts (preferred):**

```
id = @request.auth.id ||
(@collection.foraging_spots.user ?= @request.auth.id &&
 @collection.foraging_spots.sharedWith ?~ username)
```

A user record is listable only if the requester owns a spot whose
`sharedWith` contains that user's username — i.e. you can only look up
people you have already shared with. Exactly the population the suggestion
chips draw from (plan 006), no directory browsing. Both conditions sit on
the same `@collection.foraging_spots` reference, so one spot record must
satisfy both.

## Frontend sketch

- On add/edit sheet open, one batched query for the whole suggestion list
  (1–12 names): `getFullList({ filter: 'username="a" || username="b" || …' })`,
  wrapped in a TanStack Query hook keyed on the username list.
- Resolved names → real avatar via existing `getAvatarUrl()` + thumbs
  registered in plan 005 (28px chip avatar ≈ 96×96 thumb at 3× DPR), and
  optionally the full name.
- Unresolved names (typos in `sharedWith` — raw strings, never validated)
  degrade to today's initial-only chip.

## Caveats

- The rule change is a production schema change → new migration in
  `pb_migrations`, test against local PB first (serve.sh workflow).
- With option B, a person only becomes resolvable *after* the first share to
  them — no pre-save validation/preview of a brand-new handle. Consistent
  with the design brief's "no promise of identity" stance.
- Take the enriched vs. unresolved chip states through the Claude Design
  project first so the two variants look intentional (photo vs. initial disc).
