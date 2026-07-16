# Plan 004 — "Rediger profil" bottom sheet

**Status: implemented** (2026-07-16, uncommitted). Implementation notes:

- The discard dialog is a thin `DiscardChangesDialog` wrapper around
  `ConfirmationDialog` (fixed icon/title/buttons, per-surface body) — used by
  ProfileSheet, AddEditModal and LocationEditorScreen.
- `ui/dialog.tsx` `DialogContent` gained an `overlayClassName` passthrough and
  `ConfirmationDialog` `className`/`overlayClassName`: the guard dialog must
  stack **above the z-[60] location editor** (default dialog z-50 sits under
  it), so that surface passes `elevated` → `z-[80]` on panel + scrim.
- `useUpdateProfile` refreshes auth after a WrongPasswordError too (the profile
  half is already saved by then) — but only in that case; refreshAuth clears
  the session when the server is unreachable.
- AddEditModal image baseline keys on `img.id ?? img.url` (SpotImage.id is
  optional), and moves with the async pending-image load.
- The crop overlay's sliders are pointer-captured (`PointerSlider`), not native
  range drags: the profile sheet's Radix scroll-lock preventDefaults touchmove
  outside its content, which kills native slider drags in the overlay.
- Post-implementation bugfix (2026-07-16): closing the profile sheet left
  `body { pointer-events: none }` — npm had TWO nested copies of
  `@radix-ui/react-dismissable-layer` (under react-dialog and
  react-dropdown-menu), each with its own module-level body-lock bookkeeping;
  the sheet (opened from inside the modal avatar dropdown) captured `none` as
  the "original" body style and restored it on close. Fixed with `npm dedupe`
  (also deduped react-focus-scope and react-remove-scroll). Regression watch:
  a future install that re-nests these breaks it again — pin via `overrides`
  if it recurs.

### Design additions, 2026-07-16 (etag 1784187213019610) — implemented

**Rotation in the crop overlay** (§2a): `rotation` wired to `<Cropper>` (two-
finger gesture works via `onRotationChange`) plus a second footer row — rotate
icon (18px, `rgba(244,239,227,.7)`), slider −180…180 step 1 (accent
`#b5502f`), and a degree chip (min-width 52px, `rgba(244,239,227,.1)` bg,
Space Mono 12.5px) showing "N°"; tapping the chip snaps to the next 90° step.
Zoom row margin-bottom 22→16px, rotation row 20px. Export renders the rotated
image onto a bounding-box canvas first and cuts the crop rect from that (the
pixel rect from react-easy-crop is relative to the rotated bounding box); the
512px output + alpha branch sit on top unchanged. **Decided: the 90° step
normalizes to (-180, 180] — a full flip reads "180°", not "-180°"** (the
prototype's rounding gave −180; user preference 2026-07-16). The crop circle
is pinned: explicit `cropSize` (container min side − 48px, measured via
ResizeObserver) + `objectFit="cover"` — without it react-easy-crop recomputes
the crop area from the rotated image's bounding box and the circle resizes
while rotating. `minZoom` is dynamic: with cover-fit, zoom 1 = "covers the
container", but the real floor is "covers the circle" — for wide/tall images
that's well below 1, so the slider's left end is computed from the media size
(rotated bounding box) vs the circle diameter, and zoom is pulled up if
rotating back toward 0/90° raises the floor. At the floor, a wide image's
top/bottom edges meet the circle's; a tall image's left/right edges do.
Gotcha: the media size must come from the `setMediaSize` prop, NOT
`onMediaLoaded` — the latter fires with contain-fitted dimensions before the
lib resolves `objectFit="cover"` to vertical/horizontal-cover, which made the
computed floor collapse back to 1 for wide images. The cropper **opens fully
zoomed out** (decided 2026-07-16): an untouched zoom drops to the floor when
the media is measured, so the slider starts at its left end; after the user
zooms, the floor only clamps upward. Verified via the headless-Chrome harness
in `bugs/crop-test/` (mounts the real overlay + built app CSS, dumps the
slider's computed min/value).

**Photo source chooser** (§2): the camera badge and "Skift billede" now open a
small bottom sheet (`PhotoSourceSheet.tsx`, standard `SheetContent
side="bottom"` chrome + drag handle) with "Tag et billede / Brug kameraet"
(46px brand tile) and "Vælg fra galleri / Vælg et eksisterende billede" (46px
surface tile), plus an "Annuller" outline button. Picking triggers one of two
hidden inputs — camera `capture="environment"` vs plain gallery — the same
mechanism as ImageCapture in the spot flow. Free dismissal, no dirty-guard
involvement; the file-input `.click()` stays inside the tap handler's call
stack for iOS. **Platform split (2026-07-16): on iOS the drawer is skipped** —
iOS's plain file input already shows a native Take Photo / Photo Library
chooser, so "Skift billede"/badge go straight to the gallery input there
(`isIOS` from `utils/platform.ts`, incl. the iPadOS-as-MacIntel case); the
custom drawer is Android/desktop only. Gotcha found on Android: the drawer's
bottom padding must live on an inner wrapper, not on SheetContent — the
sheet's own `.safe-area-bottom` overrides a `pb-*` utility on the same
element, and `env(safe-area-inset-bottom)` is 0 on Android.

Design reference: `Skovens Skatte.dc.html`, jump-rail state `sheet:profile`
("Rediger profil"). Prototype markup lines ~493–578, logic ~1195–1234 and ~1476–1493.

Depends on plan 003 (the popover's profile row is the entry point).

## What it is

A new bottom sheet for editing the signed-in user's profile: avatar photo
(upload/replace/remove), display name, read-only email, and an optional password change —
following the established three-zone sheet skeleton (pinned header / scrolling body /
pinned footer with scroll-edge affordances), same treatment as `AddEditModal`.

Also in scope: the designed **discard-changes guard** on dirty dismissal (§7), built
here as a reusable pattern and retrofitted onto the Add/Edit sheet and the location
editor (§8).

## New files

- `src/components/ProfileSheet.tsx` — the sheet.
- `src/components/AvatarCropOverlay.tsx` — fullscreen crop step (§2a).
- API additions in `src/lib/api.ts` (new `usersApi`) + a mutation hook
  (`src/hooks/useUpdateProfile.ts`).
- New dependency: **`react-easy-crop`** (the design's `crop-loader.js` is
  prototype-only scaffolding for loading it into the DC runtime — in the app it's a
  plain npm dep; remember to import its stylesheet or inline the four
  `reactEasyCrop_*` rules).

## 1. Sheet shell

Use the existing `Sheet`/`SheetContent side="bottom"` from `ui/sheet.tsx` like
`AddEditModal` does:

- Max height 94% (`max-h-[94%]` — design: detail/add use similar; profile is `94%`),
  `rounded-t-[28px]`, `bg-bg`.
- **Header** (pinned, `flex-shrink:0`): "Rediger profil" — Spectral 23px semibold
  `text-ink` — plus a 36px circular close button (`bg-surface border-line`, X icon),
  padding `20px 24px 14px`. Apply `headerEdgeClass(atTop)` from `useScrollEdges.ts`.
- **Body**: `flex-1 min-h-0 overflow-y-auto`, padding `22px 24px 24px`, `ref` from
  `useScrollEdges()`, `style={topMaskStyle(atTop)}`.
- **Footer** (pinned): padding `14px 24px 30px` (+ safe-area inset like other sheets),
  `footerEdgeClass(atBottom)`, containing the save button (§5).
- Dismissal: guarded by the designed **discard-changes dialog** (§7) when the form
  is dirty; free dismissal when pristine. Keep the drag handle (`SheetContent`
  default for bottom sheets) plus the header close button — scrim, X, swipe and
  Escape all route through the same guarded close path.

## 2. Body content

### Avatar uploader

- Centered column, `gap 14px`: 104px circle — photo (`object-cover`) or initial
  fallback (Spectral 40px semibold `text-brand-ink` on `bg-brand`) — with border
  `3px solid var(--pin-ring)` + `0 0 0 1px var(--line)` ring +
  `0 8px 22px -8px rgba(20,15,8,.4)` shadow.
- 38px accent camera badge overlapping bottom-right (`border: 3px solid var(--bg)`,
  camera icon) — triggers the hidden file input.
- Button row: "Skift billede" (surface, line border, Spectral 14px medium) and "Fjern"
  (transparent, line border, `text-accent`; when there is no photo: `opacity-40` +
  `cursor-not-allowed`, no-op).
- Hidden `<input type="file" accept="image/*">`. On pick: read via `FileReader`
  into a data/object URL and open the **crop overlay** (§2a) — the picked file
  never goes straight to the preview. Reset `input.value = ''` after reading so
  re-picking the same file fires `change` again (prototype does this).
- Local state models three cases: unchanged / new cropped `File` accepted / removed
  (`avatar: File | null | undefined`); preview via `URL.createObjectURL` of the
  cropped file.

### 2a. Avatar crop step (designed, built on `react-easy-crop`)

Design: "IMAGE CROPPER" block + `crop`/`zoom`/`cropAccept` handlers in the
prototype JS. Fullscreen overlay **above the profile sheet** (prototype z-80 over
the sheet's z-band; in the app portal it to `<body>` like `ImageViewer`, z-[70]+),
fixed dark chrome `#141310` in **both themes** (immersive media surface, like the
photo gallery), `ss-fade` entrance. Three zones:

- **Header** (pinned): padding `56px 20px 14px` — top inset is safe-area in the
  app, like other fullscreen overlays — with a 40px circular close button
  (`bg-[rgba(244,239,227,.1)]`, 18px X, `#f4efe3`) on the left, centered title
  "Beskær billede" (Spectral 19px semibold `#f4efe3`), 40px spacer on the right.
- **Crop area** (`flex-1 min-h-0 relative`): `<Cropper>` from react-easy-crop with
  `image={pickedSrc}`, `aspect={1}`, `cropShape="round"`, `showGrid={false}`,
  controlled `crop`/`zoom` via `onCropChange`/`onZoomChange`, and
  `onCropComplete={(_, areaPixels) => …}` capturing the pixel rect (keep in a ref —
  no re-render needed). Design's crop-area chrome: mask `rgba(20,15,8,.62)`
  (react-easy-crop's box-shadow overlay color), `2px solid rgba(255,255,255,.75)`
  border on the round window.
- **Footer** (pinned, padding `22px 30px 34px` + safe-area bottom):
  - Zoom row (margin-bottom 22px): zoom-out magnifier icon (18px,
    `rgba(244,239,227,.55)`) — `<input type="range" min={1} max={3} step={0.01}>`
    bound to `zoom`, `accent-color: #b5502f` (accent stays terracotta here even in
    dark — fixed dark chrome) — zoom-in magnifier icon (18px,
    `rgba(244,239,227,.85)`).
  - Button row (`gap 12px`): "Annuller" (`flex:1`, 54px, `rounded-[15px]`,
    `border rgba(244,239,227,.25)`, Spectral 16px medium `#f4efe3`) and
    "Brug billede" (`flex:1.4`, 54px, `rounded-[15px]`, `bg-accent`... fixed
    `#b5502f`, 18px check icon + label, Spectral 16px semibold `#f4efe3`, shadow
    `0 8px 22px -6px rgba(181,80,47,.6)`).

Behavior:

- **Annuller / X**: close the overlay, discard the pick, sheet unchanged (a re-pick
  is one tap — no confirm needed; the dirty guard is not involved).
- **Brug billede**: draw the captured pixel rect onto a **512×512** canvas
  (`drawImage(img, px.x, px.y, px.width, px.height, 0, 0, 512, 512)`), export via
  `canvas.toBlob` → `File`, set as the avatar preview + pending `File`, close the
  overlay. **Format branches on source alpha** (decided 2026-07-16 — transparency
  is a wanted feature; a transparent avatar floats directly over the live map in
  the TopBar): after drawing, scan the canvas alpha channel (`getImageData`, any
  pixel alpha < 255) — transparent source → `image/png` (alpha preserved
  end-to-end); opaque source → `image/jpeg` q0.9 (photos, the common case, stay
  ~40–100KB instead of PNG's 300–600KB). Do **not** paint a background fill before
  `drawImage`, and do **not** add a backdrop behind the avatar image in TopBar /
  popover / sheet — transparent regions intentionally show what's behind (map,
  surface, bg). (The prototype exports 320px JPEG via `toDataURL`; 512 + the alpha
  branch are the decided deltas — the sheet's 104px preview is 312 device px on a
  3x display, so 320 has no headroom.)
- Cropping replaces the compression pipeline for avatars: the canvas export **is**
  the resize — `compressImageFile` is no longer involved (a 512px JPEG q0.9 is
  ~50–100KB, far under the field's 5MB cap). EXIF orientation is handled by
  react-easy-crop itself.

### Navn

- Mono field label (Space Mono 11px, `.12em` tracking, uppercase, `text-mono`,
  `mb-8px`) — matches existing form labels in `AddEditModal`.
- Text input: `h-[54px] rounded-[14px] bg-surface border-line`, Spectral 16px
  `text-ink`, padding `0 16px`.

### E-mail (read-only)

- Same label style; a non-editable `h-[54px] rounded-[14px]` row with the email in
  `text-muted` and a trailing 16px padlock icon. Read-only treatment (updated design):
  `bg-line2` with a `1px dashed` `--line` border — visibly recessed and distinct from
  the editable name input's solid-border `bg-surface`. Both tokens already exist in
  `tokens.css` with dark variants, so **no new token is needed**. (History: the design
  first referenced an undefined `--surface2`, was fixed to `--surface`, then updated
  to this dashed `line2` treatment for a clearer read-only affordance.)
  (Email change is out of scope — PocketBase requires a verification flow for it.)

### Skift adgangskode section

- Section divider: hairline — mono label "Skift adgangskode" — hairline
  (flex row, `gap 12px`, `bg-line2` 1px lines), margin `30px 0 14px`.
- Three password fields, `gap 16px`, each: mono label, `h-[54px]` input
  (padding-right 48px) + 42px eye toggle button inside (show/hide per field —
  `pwShow: {cur,new,conf}` state; eye / eye-off icons):
  1. "Nuværende adgangskode" — placeholder `••••••••`
  2. "Ny adgangskode" — placeholder "Mindst 8 tegn", with **strength meter** below
     (16px-high row, fades in only while non-empty): four 4px bars + trailing label.
     Score: +1 each for length ≥ 8, mixed case, digit, symbol.
     Fill color by score: 1 → `#b5502f` "Svag", 2 → `#c99a2e` "Middel",
     3 → `#7a8b3e` "God", 4 → `#2f6b3a` "Stærk". Unfilled bars: `--line2` light /
     `#4a4534` dark. Label: Space Mono 10.5px in the fill color.
  3. "Gentag ny adgangskode" — placeholder "Gentag adgangskode". When non-empty and
     ≠ new password: input border turns `--accent` and a 16px row below shows an
     alert icon + "Adgangskoderne er ikke ens" (Spectral 12.5px, `text-accent`).

## 3. Validation (mirrors prototype logic, lines ~1208–1211)

```
pwDirty  = cur || new || conf                  (any password field touched)
pwValid  = cur && new.length >= 8 && conf === new
canSave  = name.trim() !== '' && (!pwDirty || pwValid)
```

Save button: `opacity-45` + `cursor-not-allowed` + no-op when `!canSave` (same
disabled treatment as "Gem fund" in `AddEditModal`). Also disable while the mutation
is in flight.

## 4. API layer + hook

`src/lib/api.ts` — new `usersApi`:

- `updateProfile(userId, { name, avatar })` — `FormData`; `avatar` cases:
  `File` → append file; `null` (removed) → send `avatar: ''` to delete the stored
  file; `undefined` → omit.
- `changePassword(userId, { oldPassword, password, passwordConfirm })` — plain
  `pb.collection('users').update(...)`.
  **Gotcha:** PocketBase invalidates the auth token on password change — the SDK
  clears the auth store and the app would bounce to sign-in. After a successful
  password update, silently re-auth:
  `pb.collection('users').authWithPassword(user.email, newPassword)`.
- After any successful update call `refreshAuth()` from `AuthContext` so
  `user.name`/`user.avatar` propagate to the TopBar avatar and popover row.

`src/hooks/useUpdateProfile.ts` — TanStack `useMutation` wrapping the above
(profile first; if `pwDirty`, then password + re-auth). Toasts via `sonner`, matching
existing copy patterns:

- Success: `Profil opdateret` / `Profil og adgangskode opdateret` (prototype copy).
- Wrong current password (PB 400 on `oldPassword`) — designed state, both inline
  **and** toast: the "Nuværende adgangskode" input border turns `--accent`; a 16px row
  below it (same pattern as the mismatch message) shows a 14px alert-circle icon +
  "Forkert nuværende adgangskode" (Spectral 12.5px, `text-accent`); an error toast
  with the same text fires; the sheet stays open with all input kept. Typing in the
  current-password field clears the error state. (Prototype mocks the check against a
  hardcoded password; the real trigger is the PB 400 response.)
- Other failure: `toast.error('Kunne ikke gemme — prøv igen')`.

Offline: profile editing is online-only (no offline queue for user records). If the
app is offline, show the error toast on save failure; optionally disable save when
the existing online-status signal says offline.

## 5. Save flow

On save (footer button "Gem ændringer", 56px, `bg-accent text-accent-ink`,
`rounded-[16px]`, Spectral 17px semibold, accent glow shadow
`0 8px 22px -6px var(--accent)`):

1. `updateProfile` if name or avatar changed.
2. `changePassword` + re-auth if `pwDirty`.
3. On success: reset password fields + eye states, close sheet, success toast
   (prototype behavior, lines ~1489–1493).
4. On failure: stay open, show error, keep input.

## 6. Mounting & state

`App.tsx` owns `profileOpen` state and renders `<ProfileSheet open={...} onOpenChange={...}/>`
alongside its other top-level concerns; `onOpenProfile={() => setProfileOpen(true)}`
is plumbed to `TopBar` through `MainMapScreen` and `SpotListView` exactly like
`onSignOut` (`App.tsx:188`). Radix portals the sheet to `<body>` at z-50 like the
other sheets — no extra portal work needed.

## 7. Discard-changes guard (designed)

Design: "DISCARD-CHANGES GUARD" block (markup ~lines 818–828) + `isDirtySheet()` /
`attemptClose` / `discardCancel` / `discardConfirm` handlers in the prototype JS.

### Behavior

- **Dirty check** (prototype, profile case): name changed from the saved value, or
  an avatar picked/removed, or any of the three password fields non-empty — i.e.
  exactly `name !== user.name || avatar !== undefined || pwDirty` with this plan's
  state model (§2/§3).
- **Every dismissal path** — scrim tap, header X, drag-handle swipe, Escape — calls
  the same guarded close: dirty → open the discard dialog; pristine → close freely.
  With a controlled sheet the single interception point is `onOpenChange(false)`
  (swipe routes through the hidden Radix Close in `ui/sheet.tsx`, so it lands there
  too).
- **"Kassér ændringer"** (confirm): close dialog **and** sheet, reset all form state
  (name, avatar preview, password fields, eye toggles, error states).
- **"Bliv og rediger"** (cancel) and a tap on the dialog's own scrim: close only the
  dialog; the sheet stays with all input intact.
- Saving normally is unaffected; the guard only sits on dismissal.

### Dialog spec — reuse `ConfirmationDialog`

The designed dialog is structurally the existing delete `ConfirmationDialog`
(`src/components/ConfirmationDialog.tsx`): same centered panel (`bg-bg`,
`rounded-[24px]`, padding 28/26/22, shadow `0 24px 60px rgba(0,0,0,.4)`), same 60px
tinted icon circle, Spectral 22px title, 14.5px `ink2` body, stacked 52px buttons
(accent primary over outline secondary), `ss-fade` entrance. **No new component —
pass props:**

- `icon`: 28px alert-circle (`M12 8v5M12 16.5v.5` + `circle r=9`, strokeWidth 1.8) —
  same glyph as the inline field errors, passed via the existing `icon` prop.
- `title`: "Kassér ændringer?"
- `description`: "Dine profilændringer bliver ikke gemt."
- `confirmText`: "Kassér ændringer", `cancelText`: "Bliv og rediger".
- Circle tint: the design now uses `rgba(181,80,47,.12)` light /
  `rgba(201,162,75,.16)` dark — identical to the component's built-in tint, so the
  reuse is exact. (An earlier design revision had a terracotta dark tint; fixed
  upstream.)
- Layering: `Dialog` portals to `<body>` and already stacks above bottom sheets
  (proven by delete-over-detail).

### Sheet snap-back (small `ui/sheet.tsx` change)

The drag-to-dismiss in `ui/sheet.tsx` deliberately **keeps** the dragged-down
offset when the swipe threshold is met, expecting the exit animation to take over.
When the guard refuses the close (sheet stays `open`), the sheet would freeze
mid-drag — on a denied close, reset the inline `transform` (with a short transition)
so the sheet snaps back up.

## 8. Dirty-guard retrofit: Add/Edit sheet + location editor (option C)

The design wires the same guard on the app's other unsaved-input surfaces, per the
dismissal rules (SHEET_CHANGES.md: "Has unsaved input (Add/Edit, Move location):
guard swipe/scrim dismissal … don't silently drop a half-filled form"). Today
`AddEditModal.tsx:186` closes unconditionally — typed notes and picked photos are
lost on a stray scrim tap. Build the guard in ProfileSheet first (§7), then apply
the pattern here; this half can land as a separate commit.

### AddEditModal

- Guard every dismissal path (scrim, header X, drag-handle swipe, Escape) behind
  the discard dialog when dirty, exactly as in §7.
- **Dirty definition** — the prototype's add-sheet check (`pickIdx !== 0 || addLoc`)
  is simplified; the real check must compare against an initial-state snapshot
  taken on open:
  - add: type changed from the default preselection, notes non-empty, any image
    added, or location manually picked (`manuallyPicked`).
  - edit: type/notes/coordinates/image set differs from the loaded spot.
- Dialog copy (designed): title "Kassér ændringer?", buttons "Kassér ændringer" /
  "Bliv og rediger", alert-circle icon. Body branches on the flow (the design
  branches on its `detail` state; here that's `isEdit`):
  - add: **"Dit nye fund bliver ikke gemt."**
  - edit: **"Dine ændringer bliver ikke gemt."**
- Watch the existing `onInteractOutside` special case (taps on the fullscreen
  location-picker overlay must still not count as dismissal —
  `outsideInteractionStartedInOverlay`).
- On confirm: close + existing cleanup (revoke blob URLs etc. already in the
  unmount path).

### Location editor (LocationEditorScreen)

- Designed (prototype `backLoc`): the back button branches —
  - opened from the add/edit sheet → return **to that sheet**, no guard (the
    pending pin move isn't discarded on that path);
  - otherwise, pin moved and unconfirmed → discard dialog with body
    **"Den nye placering bliver ikke gemt."**;
  - pin unmoved → close freely.
- Also cover hardware/gesture back if it can dismiss this screen — same guard as
  the back button.
- Fullscreen map screen, not a bottom sheet — no swipe/scrim; the back path is the
  only guarded one.

## Open decisions

None — everything is either designed or decided:

- Wrong-current-password state: designed (inline accent border + message + error
  toast, §4).
- Dirty-guard dismissal: designed (discard-changes dialog, §7; Add/Edit +
  location-editor retrofit, §8).
- Avatar compression: superseded by the designed crop step — the crop canvas is the
  resize, `compressImageFile` is not used for avatars (§2a).
- Crop canvas output size: **512px** decided 2026-07-16 (prototype exports 320; the
  sheet's 104px preview needs 312 device px on 3x, so 320 has no headroom).
- Transparency: **preserved**, decided 2026-07-16 — export branches on source alpha
  (PNG when transparent, JPEG q0.9 when opaque); no background fill, no backdrop
  behind the rendered avatar. The user explicitly wants transparent avatars showing
  the map through the TopBar circle.

## Related finding (out of scope, noted 2026-07-15)

PocketBase serves the **original file** for any `?thumb=` size not declared on the
field, and `users.avatar` declares none (`thumbs: null`) — so TopBar's existing
`?thumb=96x96` is a silent no-op. With cropped ~512px uploads this stops mattering
(the "original" is already small). `?thumb=100x100` (PB's built-in default) is the
only size that works without a schema migration. Same issue affects
`foraging_spots.images` (`thumbs: []` + a 300x300 request in
`getSpotImageThumbnailUrls` → list rows download full 1920px originals) — separate
issue, would justify a thumbs migration.

## Acceptance checks

- Sheet opens from the popover's profile row on both map and list views; three-zone
  skeleton behaves like Add/Edit: header hairline+shadow only when scrolled, footer
  hairline+shadow only when more content below, body fades under the header.
- Avatar: pick → crop overlay opens (round window, pinch/drag + zoom slider 1–3);
  "Annuller"/X discards the pick and returns to the unchanged sheet; "Brug billede"
  returns with the cropped square as the preview; picking the same file twice in a
  row re-opens the cropper; "Fjern" removes (and is disabled/dimmed when there's
  nothing to remove); after save the TopBar avatar updates without reload.
- Crop overlay is fixed dark (`#141310`) in both themes, sits above the profile
  sheet, and respects safe-area insets top and bottom.
- A source image with transparency keeps it after crop + save: transparent regions
  show the live map through the TopBar circle (and surface/bg in popover/sheet);
  an opaque photo saves as JPEG (check the upload's content type: PNG only for
  transparent sources).
- Name edits persist and propagate to popover row + avatar initial fallback.
- Email is visibly read-only (dashed border, recessed `line2` background, lock icon,
  muted text) and not focusable/editable — clearly distinct from the name input.
- Password: strength meter and labels react per rules; mismatch state shows accent
  border + message; save disabled until name non-empty and password section either
  untouched or fully valid; wrong current password shows the accent border + inline
  "Forkert nuværende adgangskode" + error toast, keeps the sheet open with input
  intact, and clears when the field is edited; after successful change the user
  **stays signed in**.
- Dirty sheet: scrim tap, header X, swipe-down and Escape all open the discard
  dialog instead of closing; "Bliv og rediger" (or tapping the dialog scrim)
  returns to the intact form; "Kassér ændringer" closes both and resets the form;
  a swipe that triggered the guard snaps the sheet back up. Pristine sheet
  dismisses freely.
- Retrofit (§8): add sheet with typed notes / added photo / changed species /
  manually picked location guards the same way, with add/edit-flavored body copy;
  pristine add sheet dismisses freely; edit sheet dirty = any difference from the
  loaded spot. Location editor guards only the discarding back path (moved,
  unconfirmed pin); unmoved pin goes back freely; return-to-add-sheet path never
  guards. Delete confirmation dialog unchanged (locked scrim, per rules).
- Dark mode correct throughout (existing tokens only; check neutral strength bars).
