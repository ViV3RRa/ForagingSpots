# Deploying the redesign: frontend + PocketBase 0.22.27 → 0.37.5 + Cloudflare (nginx retired) — DSM flow

A start-to-finish runbook, driven through **DSM Container Manager** where possible.
Current production setup (confirmed 2026-07-13):

- One compose project on the NAS with two services: **nginx** (host port 8082,
  serves `./web/build`, proxies `/api/` and `/admin/`→`/_/` to PocketBase) and
  **pocketbase** (built from `./pocketbase/Dockerfile`, `ARG PB_VERSION=0.22.27`,
  data/migrations/hooks host-mounted from `./pocketbase/`).
- A Cloudflare Tunnel points `foraging.viverra.dk` at nginx (NAS port 8082), with
  Cloudflare Access in front (default-deny; a "Foraging Spots" Access app
  Bypass-opens the PWA asset paths).

Target setup after this deploy: **a single pocketbase service** on 0.37.5 that
also serves the frontend from `pb_public` (verified locally 2026-07-13: correct
MIME for the service worker, SPA fallback, Chrome parses the manifest with zero
errors, iOS meta/icons intact). nginx is removed — PocketBase ≥ 0.23 covers
everything it did, and nginx's 1 MB upload limit goes with it (PocketBase's own
cap is the `images` field's 10 MB per file).

Two permanent changes to know about:
- The admin dashboard moves from `/admin/` to **`/_/`** (nginx's rewrite is gone).
- The host port mapping `8082 → 8095` keeps the Cloudflare Tunnel config
  **unchanged** — the tunnel still targets NAS port 8082.

**Why the DSM flow is ordered this way:** Container Manager's project **Build**
action is not build-only — it builds the image *and immediately recreates and
starts the containers*. So the build cannot happen ahead of the window; backups
and the migration move-aside (Phase 2) MUST be complete before you click Build.
The image build (~1–2 min of downloading the PocketBase zip) therefore happens
inside the downtime window. Total window: ~5–10 min.

`<project>` below = the directory on the NAS containing `compose.yaml`.

---

## Phase 0 — Preparation (safe while everything runs)

### 0a. Make sure the stack is a Container Manager Project

Open **Container Manager → Project**. If the stack is listed there, you're set.
If it isn't (it was created from the command line), import it:
**Project → Create →** set the path to `<project>` (the folder containing
`compose.yaml`) → Container Manager detects the existing file → create *without*
starting/rebuilding (the containers are already running).

### 0b. Back up and edit the compose file and Dockerfile

Neither edit affects the running containers — only Build (Phase 3) does.
Use File Station (right-click → Copy) or DSM Text Editor, or SSH:

```bash
cd <project>
cp compose.yaml compose.yaml.backup-nginx
cp pocketbase/Dockerfile pocketbase/Dockerfile.backup-0.22.27
```

Replace the contents of `compose.yaml` with the single-service version:

```yaml
services:
  pocketbase:
    build:
      context: ./pocketbase
      dockerfile: Dockerfile
    ports:
      - "8082:8095"          # tunnel still points at NAS:8082 — unchanged
    volumes:
      - ./pocketbase/pb_data:/pb/pb_data
      - ./pocketbase/pb_migrations:/pb/pb_migrations
      - ./pocketbase/pb_hooks:/pb/pb_hooks
      - ./web/build:/pb/pb_public   # the frontend, served by PocketBase itself
    restart: unless-stopped
```

(Why `/pb/pb_public`: the binary lives at `/pb/pocketbase` and PocketBase
resolves its default directories relative to the executable. The other three
mounts already follow that pattern.)

In `pocketbase/Dockerfile`, change one line:

```dockerfile
ARG PB_VERSION=0.37.5
```

### 0c. Note the current data counts

So you know what "everything survived" looks like in Phase 4: open
`https://foraging.viverra.dk/admin/` (still the old URL until Phase 3) → log in →
note the record counts of `users` and `foraging_spots`. (2026-07-10: 6 and 19.)

---

## Phase 1 — Build the frontend (on your Mac, any time before the window)

The `new-design` branch is ready (QA'd in subtask 4.4). Build it:

```bash
cd ~/Projects/privat/ForagingSpots
git checkout new-design
npm ci              # clean install of the exact locked dependencies
npm run build       # production build → dist/
```

`npm run build` runs in production mode, which loads `.env.production` and bakes
`https://foraging.viverra.dk` in as the backend URL. **For this deploy that is
exactly right** (it's wrong only for local testing — see CLAUDE.md).

Sanity checks:

```bash
grep -rl "foraging.viverra.dk" dist/assets/ | head -1   # prod URL is in the bundle
ls dist/manifest.webmanifest dist/sw.js dist/app-icon/  # PWA pieces exist
```

Keep `dist/` — it gets uploaded in Phase 5.

One more file to stage: `pocketbase/pb_migrations/1783683771_collections_snapshot.js`
from this repo — a fresh v0.23-style snapshot of the collections schema, generated
during the local dry-run. Prod doesn't strictly need it (its DB already has the
schema), but installing it keeps prod's migration history identical to dev's and
gives you a from-scratch rebuild path. Safe to apply: it describes the exact
schema prod already has.

---

## Phase 2 — Stop, back up, clear the migration landmine (window starts)

Users lose access from here until Phase 3 finishes.

1. **Stop the stack:** Container Manager → Project → select the project →
   **Action → Stop**. Both containers stop; the SQLite files are now quiescent.

2. **Back up `pb_data` — THIS IS THE ROLLBACK POINT.** The 0.37.5 binary
   converts `pb_data` one-way on first start; 0.22.27 can never read it again.
   Do this one over SSH, not File Station: the container writes these files as
   root, and File Station copies can silently change ownership/permissions,
   which would break a later restore. `cp -a` preserves everything:

   ```bash
   cd <project>
   sudo cp -a pocketbase/pb_data pocketbase/pb_data.backup-0.22.27
   cp -a web/build web/build.backup-old-design   # frontend backup, same occasion
   ```

3. **Clear the migration landmine.** The files in `./pocketbase/pb_migrations/`
   are written against the 0.22 JavaScript API (`Dao`, removed in v0.23). If the
   new binary sees them as *unapplied*, it executes them and crashes with
   `ReferenceError: Dao is not defined` — this exact crash happened on the local
   dry-run with a copy of this very data. Move them out of the mounted directory
   (File Station: create folder `pb_migrations_old-0.22` next to
   `pb_migrations`, then move the `.js` files into it — plain moves are safe
   here; or over SSH):

   ```bash
   mkdir -p pocketbase/pb_migrations_old-0.22
   mv pocketbase/pb_migrations/*.js pocketbase/pb_migrations_old-0.22/
   ```

4. **Install the new snapshot migration** (recommended, see Phase 1) — upload
   `1783683771_collections_snapshot.js` into `<project>/pocketbase/pb_migrations/`
   via File Station drag-and-drop, or from the Mac:

   ```bash
   scp pocketbase/pb_migrations/1783683771_collections_snapshot.js \
       <nas>:<project>/pocketbase/pb_migrations/
   ```

---

## Phase 3 — Build & switch via Container Manager

Everything before this click must be done — Build goes straight from building
the image to booting the new container, and that first boot converts `pb_data`.

1. Container Manager → Project → select the project → **Action → Build**.
   It downloads `pocketbase_0.37.5_linux_amd64.zip`, builds the image, and
   starts the new single-service stack (~1–2 min).

2. **Watch the first boot:** Container Manager → **Container** tab → the
   pocketbase container → **Details → Log**. Expected: a series of applied
   system migrations (the `v0.23_migrate*` ones do the big conversion — admins
   become `_superusers` records, settings move into the DB), then the snapshot
   migration, then `Server started at http://0.0.0.0:8095`.

   If it instead **crashes with `Dao is not defined`** → an old migration file
   is still in `pb_migrations/`; redo the move-aside in Phase 2 step 3 and start
   the project again (the data conversion that already ran completed first and
   is fine).

3. **Remove the orphaned nginx container.** The compose file no longer defines
   nginx, but Container Manager may leave the old stopped container behind:
   **Container** tab → if an nginx container from this project is still listed
   (stopped), select it → **Action → Delete**. (The nginx *image* can stay or go
   via Image tab — harmless either way.)

4. **Confirm it serves.** In a browser: `https://foraging.viverra.dk` → pass
   Access → the **old** frontend loads (it's still what's in `web/build`, now
   served by PocketBase itself — the redesign arrives in Phase 5). Optional
   SSH check from the NAS:

   ```bash
   curl -s http://127.0.0.1:8082/api/health   # {"message":"API is healthy",...}
   ```

---

## Phase 4 — Verify the migrated backend

1. Go to `https://foraging.viverra.dk/_/` — **note: new URL**, `/admin/` died
   with nginx (pass Cloudflare Access first). Log in with your **old admin email
   + password** — the account was converted into the new `_superusers`
   collection; same credentials. (Your old admin *session* is invalidated —
   having to log in again is expected. Regular users are NOT logged out; the
   users token secret is unchanged.)
2. Check the data against the 0c counts: `users` and `foraging_spots` all there;
   open a spot and click an image — the file must load (files live in
   `pb_data/storage/`, untouched by the migration).
3. Check the long session survived: Collections → `users` → gear icon → Options →
   auth token duration should read `63072000` (2 years). It carried over in the
   local dry-run; this confirms prod matched.

If anything is wrong here, roll back now (Phase 8) — the frontend and Cloudflare
haven't changed yet, so rollback is total and free.

---

## Phase 5 — Deploy the new frontend

```bash
# From your Mac. --delete removes old-design files (old hashed assets, old
# icons) so web/build exactly mirrors dist/ — stale leftovers are what makes
# PWA updates flaky. web/build was backed up in Phase 2.
rsync -av --delete dist/ <nas>:<project>/web/build/
```

(File Station alternative if you'd rather stay in DSM: delete the *contents* of
`web/build`, then drag the *contents* of `dist/` in. The `--delete` mirroring is
exactly why rsync is preferred — don't merge new files over old ones.)

Nothing to restart — PocketBase reads `pb_public` per request, so the new app is
live the moment the sync finishes.

What existing users will see:

- **The update is service-worker mediated.** On next launch they get the *old*
  cached app, the new `sw.js` downloads in the background, and the in-app
  "Ny version tilgængelig" toast appears — tapping it reloads into the redesign.
  Seeing the old design for one launch is normal, not a failed deploy.
- **They stay signed in** — the PocketBase token is untouched and the redesign
  reads the same stored auth.

---

## Phase 6 — Update Cloudflare

### 6a. Access bypass paths (required — PWA install breaks on iOS without it)

The redesign moved all icons into `/app-icon/` and dropped the root-level
`apple-touch-icon*.png` / `favicon.png` / `pwa-*.png` files, so the five current
bypass destinations no longer match anything. In the Zero Trust dashboard:

1. **Zero Trust → Access → Applications → "Foraging Spots" → edit → Destinations.**
2. Delete all five path entries.
3. Add these two (subdomain `foraging`, domain `viverra.dk`, path in the same
   format as the old entries, no leading slash):
   - `app-icon/*`
   - `manifest.webmanifest`
4. Keep the existing **PWA / Bypass** policy attached. Save.

Why these two: iOS Safari fetches the manifest and the apple-touch-icon **without
the Access cookie** when deciding whether the site is installable; if Access
blocks those anonymous requests, Add-to-Home-Screen breaks. Everything else —
the app, `/api/*`, `/_/` — stays behind Access: that's the NAS protection,
unchanged.

### 6b. Purge the edge cache (recommended)

If the zone proxies (orange-cloud) this hostname, Cloudflare may still hold old
assets: **dashboard → viverra.dk zone → Caching → Configuration → Purge
Everything** (or purge by hostname). Cheap insurance against serving a mix of
old and new files.

### 6c. Access session duration (optional quality-of-life)

Access → Applications → the app covering `foraging.viverra.dk` → Settings →
Session Duration → `1 month` (the maximum). The app's own session is 2 years, so
the Access cookie is what actually decides how often users see a login screen.

---

## Phase 7 — End-to-end verification

**Desktop, fresh private window** (no old state):
1. `https://foraging.viverra.dk` → Access login → new-design welcome screen.
2. Sign in with a real account → map renders, spots + images load.
3. Add a test spot **with 2–3 photos** and delete it again — exercises uploads
   without nginx's old 1 MB proxy limit in the way.

**Security spot-check** (that Bypass didn't open more than intended, and that the
dashboard is still walled off):

```bash
# Anonymous, no cookies. Icons/manifest must be reachable; nothing else may be:
curl -s -o /dev/null -w '%{http_code}\n' https://foraging.viverra.dk/app-icon/icon-192.png     # expect 200
curl -s -o /dev/null -w '%{http_code}\n' https://foraging.viverra.dk/manifest.webmanifest      # expect 200
curl -s -o /dev/null -w '%{http_code}\n' https://foraging.viverra.dk/api/health                # expect 302 (Access), NOT 200
curl -s -o /dev/null -w '%{http_code}\n' https://foraging.viverra.dk/_/                        # expect 302 (Access), NOT 200
```

**iPhone (the reason 6a exists):**
1. Safari → site → pass Access → sign in.
2. Share → **Add to Home Screen** → the forest-green app icon appears (a generic
   screenshot-thumbnail instead means icon/manifest fetches are still blocked —
   re-check 6a).
3. Launch from the home screen → standalone (no Safari chrome) → data loads.

**Existing user's device (update path):**
1. Open the previously installed app → old design loads → "Ny version
   tilgængelig" toast appears → tap → redesign, still signed in.

**Backup cleanup:** after a few good days, remove
`pocketbase/pb_data.backup-0.22.27`, `web/build.backup-old-design`,
`compose.yaml.backup-nginx`, `pocketbase/Dockerfile.backup-0.22.27`, and the
now-unused nginx configs (`web/nginx/`, `pocketbase/nginx/`).

---

## Phase 8 — Rollback (if something is broken)

Full rollback to the exact pre-deploy state (old compose, old binary, old data,
old frontend, nginx back):

1. Container Manager → Project → **Action → Stop**.
2. Restore the files over SSH (ownership matters for `pb_data`, so not File
   Station):

   ```bash
   cd <project>
   cp compose.yaml.backup-nginx compose.yaml
   cp pocketbase/Dockerfile.backup-0.22.27 pocketbase/Dockerfile
   sudo rm -rf pocketbase/pb_data
   sudo mv pocketbase/pb_data.backup-0.22.27 pocketbase/pb_data
   mv pocketbase/pb_migrations_old-0.22/*.js pocketbase/pb_migrations/
   rsync -av --delete web/build.backup-old-design/ web/build/
   ```

3. Container Manager → Project → **Action → Build** — rebuilds on the restored
   Dockerfile (0.22.27) and starts the restored two-service stack.
4. Cloudflare: re-add the five old bypass paths if 6a was already done.

Caveats:
- Anything users wrote **after** the upgrade exists only in the new-format
  pb_data and is lost by restoring the backup. Rollback inside the window is
  free; rollback days later costs those writes.
- Partial rollbacks work too: the old frontend runs fine against the new backend
  (API-compatible), so a frontend-only problem needs only the `web/build` rsync;
  a "PocketBase-as-webserver" problem alone could be solved by restoring the old
  compose (nginx back) while keeping `PB_VERSION=0.37.5` — but then add
  `client_max_body_size 25m;` to the nginx config, since its 1 MB default blocks
  photo uploads.

---

## Phase 9 — Afterwards (repo housekeeping, no NAS involved)

1. Merge the release: `git checkout main && git merge new-design`, tag it
   (`git tag v2.0.0`), push.
2. Delete the obsolete local 0.22.27 binary: `rm pocketbase/pocketbase`
   (`pocketbase/` is gitignored; `serve.sh` provides the pinned 0.37.5 for dev).
3. Mark QA finding #1 in `plans/subtasks/4.4-final-verification.md` resolved —
   this deploy fixes its root cause.
