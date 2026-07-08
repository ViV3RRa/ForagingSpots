# PocketBase Upgrade & Rehosting — dev 0.37.5 / prod 0.22.27 → 0.39.6

## Current state (verified 2026-07-08)

| What | Where | Version / state |
|---|---|---|
| Dev server | `pocketbase/.bin/pocketbase` via `pocketbase/serve.sh` (`PB_VERSION="0.37.5"`) | **0.37.5**, data already on post-0.23 schema |
| Stale leftover binary | `pocketbase/pocketbase` (+ `CHANGELOG.md`, `LICENSE.md` beside it) | 0.22.27 — unused, delete |
| JS migrations (dev) | `pocketbase/pb_migrations/*.js` (6 files) | Old 0.22 format (`migrate((db) => …)`, `schema:` key). Tolerated because already applied; a fresh bootstrap would fail on them |
| Frontend SDK | `package.json` → `pocketbase` | `^0.26.2` (latest is 0.27.0) |
| **Production** | Synology, docker-compose: `nginx` (port 8082, behind Cloudflare) serving `./web/build` + `pocketbase` service built from a Dockerfile | **`ARG PB_VERSION=0.22.27`** — prod data is still on the pre-0.23 schema |
| Git | `.gitignore` has `/pocketbase` | Backend dir is local-only; only `CLAUDE.md`/`plans/` changes are committed |
| Latest stable | github.com/pocketbase/pocketbase | **v0.39.6** (2026-07-08) |

### Decision (2026-07-08): rehost prod on pb_public

The nginx + static-build split is the *old* hosting. Target architecture: **one PocketBase
container serving both the API and the built React app from `pb_public`** — nginx is removed.
PocketBase serves `pb_public` at `/` with `index.html` SPA fallback out of the box. Same-origin
also removes CORS from the picture, and `.env.production`'s
`VITE_POCKETBASE_URL=https://foraging.viverra.dk` stays correct (optionally simplify later to
`window.location.origin`).

### Risk assessment

- **Dev (0.37.5 → 0.39.6): trivial.** No breaking changes in 0.38.x / 0.39.x release notes.
- **Prod (0.22.27 → 0.39.6): crosses the v0.23 rewrite.** Per the v0.23.0 release notes:
  `pb_data` is **auto-upgraded on first start** of the new binary, a direct jump from 0.22 is
  supported (no need to step through 0.22.x latest), admins become `_superusers` auth records
  and `/api/admins/*` disappears, and old-format JS migrations/hooks need manual updating.
  Frontend impact already checked:
  - SDK `^0.26.2` targets the post-0.23 API — prod's *server* was the laggard, not the app.
  - v0.23 changed multi-file upload semantics (new files *replace* unless `+` prefixed) — our
    `api.ts` `update()` already sends the full kept-filename list + new files, which is the
    correct replace-style payload. No change needed.
  - Error shape `code` → `status`: `handleApiError` only reads `message`. No change needed.
  - **Existing user sessions may be invalidated** by the token changes in v0.23 — verify
    empirically in the Phase D rehearsal; expect users to sign in again after cutover.

---

## Phase A — Dev upgrade (0.37.5 → 0.39.6)

1. **Backup:** stop the dev server, then
   `zip -r pocketbase/pb_data-backup-$(date +%F)-v0375.zip pocketbase/pb_data`.
2. **Bump:** `pocketbase/serve.sh` → `PB_VERSION="0.39.6"`.
3. **Run:** `./pocketbase/serve.sh`; watch the log for the automatic system migrations.
4. **Verify:** Admin UI loads, collections intact; app smoke test (sign-in, map/list, create
   spot **with photo**, edit, share/unshare, delete, offline queue → sync).

## Phase B — Repo cleanup (with A)

1. Delete stale `pocketbase/pocketbase`, `pocketbase/CHANGELOG.md`, `pocketbase/LICENSE.md`.
2. **Re-snapshot migrations** (needed for prod deploy too, see D3): archive the six 0.22-format
   files, then `pocketbase/.bin/pocketbase migrate collections --dir=pocketbase/pb_data
   --migrationsDir=pocketbase/pb_migrations`. Prove the snapshot by booting once against a
   scratch empty `--dir` and confirming collections are created.
3. `CLAUDE.md`: backend command is `./pocketbase/serve.sh` (not `./pocketbase serve`); note the
   `PB_VERSION` pin. Commit.

## Phase C — Frontend SDK (optional, small)

1. `npm i pocketbase@^0.27.0` — no breaking changes vs 0.26.x; pairs with server 0.37+.
2. `npm run build` + `npm run lint`; re-run the Phase A smoke test once.

## Phase D — Production: upgrade + rehost on pb_public

### D1. Rehearse the data migration locally (answers the re-login question too)

1. Copy prod's `pb_data` from the NAS to the dev machine (stop or backup-snapshot first so the
   copy is consistent — SQLite WAL files must come along).
2. Run the 0.39.6 binary against the **copy**:
   `pocketbase/.bin/pocketbase serve --dir=/path/to/prod-copy` and watch the auto-migration.
3. Point the local app at it and verify: existing users can sign in, spots/photos load, an old
   session token (if you can grab one) is accepted or rejected — now we *know* whether users get
   logged out.
4. Any failure here = fix/retry locally with zero prod risk.

### D2. New hosting setup on the NAS

Replace the two-service compose with a single service. Sketch:

```yaml
services:
  pocketbase:
    build:
      context: ./pocketbase
      dockerfile: Dockerfile      # ARG PB_VERSION=0.39.6
    ports:
      - "8082:8095"               # keep the external port Cloudflare already points at
    volumes:
      - ./pocketbase/pb_data:/pb/pb_data
      - ./pocketbase/pb_migrations:/pb/pb_migrations
      - ./pocketbase/pb_hooks:/pb/pb_hooks
      - ./pocketbase/pb_public:/pb/pb_public
    restart: unless-stopped
```

Dockerfile: bump `ARG PB_VERSION=0.39.6`; keep `--http=0.0.0.0:8095`. nginx service, its config,
and `./web/build` are retired.

**Frontend deploy flow:** `npm run build` locally → rsync `dist/` → NAS
`./pocketbase/pb_public/` (worth a small `scripts/deploy.sh`). The PWA service worker and
precache are plain static files — served fine from pb_public; verify SW updates trigger after a
deploy (the existing PWAUpdatePrompt flow).

### D3. Cutover

1. **Backup on the NAS:** stop the old stack (`docker compose down`), then
   `cp -a ./pocketbase/pb_data ./pocketbase/pb_data-backup-$(date +%F)-v02227`. Keep a copy off
   the NAS. (Admin UI backup beforehand as well, belt-and-braces.)
2. Replace prod `pb_migrations` contents with the Phase B re-snapshot; check `pb_hooks` — if it
   contains any 0.22-era `.pb.js` hooks they must be rewritten per pocketbase.io/v023upgrade/jsvm
   (dev has none; expected empty).
3. Deploy the freshly built frontend into `pb_public` (D2 flow).
4. `docker compose build --no-cache pocketbase && docker compose up -d`; watch logs for the
   0.22 → 0.39 auto-migration on first boot.
5. First superuser login: admins are now `_superusers` — same credentials expected; if login
   fails, create/reset via `docker compose exec pocketbase /pb/pocketbase superuser upsert
   <email> <pass>`.

### D4. Verify prod

- `https://foraging.viverra.dk/` serves the app (from pb_public) and `/api/health` returns 200.
- Deep-link/refresh works (SPA index fallback).
- App smoke test against prod: sign-in (users re-auth if the rehearsal showed tokens die),
  spots + photos load (file URLs unchanged), create/edit/delete with photo, share.
- PWA: install prompt, offline start, update toast after a second deploy.

## Rollback

Never run an old binary over upgraded `pb_data`. Rollback = restore backup **and** binary
together:
- Dev: unzip the Phase A backup over `pb_data`, set `PB_VERSION` back to 0.37.5.
- Prod: `docker compose down`, restore `pb_data-backup-…-v02227`, revert the Dockerfile ARG
  (and compose file if already switched), rebuild, `up -d`. The old nginx setup stays intact on
  disk until D4 passes — don't delete `./web/build` or the nginx config until then.

## Acceptance criteria

- Dev + prod both on 0.39.6; smoke tests pass against both.
- Prod serves the React app from pb_public at https://foraging.viverra.dk with nginx removed.
- Fresh-bootstrap test passes with re-snapshotted migrations; stale 0.22 artifacts deleted.
- `CLAUDE.md` corrected; `npm run build` + `npm run lint` clean (SDK 0.27).
- Post-cutover: keep dev (`serve.sh`) and prod (Dockerfile ARG) pinned to the same version.
