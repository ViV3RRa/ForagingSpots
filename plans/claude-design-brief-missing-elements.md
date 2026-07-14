# Extend "Skovens Skatte.dc.html" — design the missing real-world states

> Brief for Claude Design (project `dd75eb78-ea23-46b0-ba4b-7aeb33aff7e4`, file
> `Skovens Skatte.dc.html`). Written 2026-07-08 after the backward design-fidelity audit of
> subtasks 1.1–2.6; paste the section below into a Claude Design conversation. When the new
> designs land, reconcile the code via new/amended subtasks (the pending-sync badge is already
> scheduled in 3.2 — point it at the new `isOffline`-family designs).

---

The app implementation of this design is underway, and it surfaced a set of elements and
states the mock doesn't cover: features that already exist in the shipping app (sorting,
sharing, offline sync, clustering) and real states the mock idealizes away (errors, empty
galleries). Extend the existing design file with canonical designs for them.

## Ground rules

- Work inside the existing file: same 390×838 phone frame, same LIGHT/DARK token system,
  same type roles (Spectral for headings/buttons, Work Sans for body/UI, Space Mono for
  coordinates and uppercase micro-labels). Every new element must work in both themes.
- Add a jump-rail chip for each new previewable state, like the existing ones.
- All copy in Danish.
- Integrate into the existing blocks (`isList`, `isMap`, `isSignin`, `showDetail`) rather
  than inventing new screens, except where a menu/sheet naturally overlays.
- The app already has provisional token-styled implementations of all of these; I describe
  them below as reference. Treat them as functional requirements only — you define the
  canonical look, and the code will be adjusted to match.

## Elements to design

1. **List toolbar** (`isList`): above the rows sits a spot count ("12 fund") and a sort
   selector with four options: "Nyeste først", "Ældste først", "Efter type", "Efter
   lokation". Design the closed control and its open state. Reference: count as a mono
   micro-label left, 38px surface-bg select right.

2. **List row actions** (`isList`): each row needs an overflow affordance opening four
   actions: "Vis på kort", "Rediger", "Del", "Slet" (destructive, accent). Design the
   trigger's placement in the row and the menu itself — dropdown or bottom action sheet,
   your call. Reference: a quiet 32px ⋮ ghost button at the row's right edge.

3. **Map clusters** (`isMap`): overlapping pins merge into a cluster marker showing a
   count (2–99+); tapping zooms in. Show at least one cluster among the pins. Reference:
   52px brand-colored circle with pin-ring border and Spectral count, echoing the pin
   language.

4. **Compass button** (`isMap`): appears only while the map is rotated; tapping resets to
   north. Reference: 52px surface circle stacked above the locate button, compass glyph
   rotating with the bearing. Design its visible state.

5. **Filter active indicator** (floating top bar): the filter button needs an "active
   filters applied" state. Reference: 8px accent dot in the button's top-right corner.

6. **Avatar photo variant** (floating top bar): the 48px avatar when the user has an
   uploaded profile photo. The current initial-in-brand-circle becomes the fallback.

7. **Sign-in error state** (`isSignin`): feedback for a failed login below the fields, plus — optional — the CTA's loading state. Reference: rounded box tinted from the accent color.

8. **Offline / pending-sync indicators** (related to the existing `isOffline` banner —
   same visual family): the app saves spots locally when offline and syncs later. Design:
   a) a list-row badge for a spot awaiting sync, b) its failed-sync error variant,
   c) a small corner indicator on the spot's map pin, d) the badge's placement in the
   detail drawer header, and e) a detail-drawer notice when the device is offline and the
   spot is already synced — edit/delete are disabled then ("Du er offline. Redigér og
   slet er ikke tilgængelige for synkroniserede fund.").

9. **Sharing** (`showDetail` + `isList`): spots can be shared with other users by
   username. Design a drawer section with: section header, an add-user input + confirm
   action, the list of shared users with a remove affordance, and its empty state. Also a subtle list-row hint that a
   spot is shared ("Delt · 2"). Note: the action row's primary is now Edit ("Naviger" was
   descoped) with Share and Delete as the square icon buttons — define how the Share
   button and this section connect (reveal, scroll, sheet…).

10. **Detail gallery photo-count states** (`showDetail`): the mock shows exactly 3
    photos. Spots have 0–5. Design: 0 photos (the add-photo affordance on its own),
    1 photo, 2 photos, and 5 photos — including where the dashed "+" add tile lives in
    each case and when the "N fotos" count chip appears.
