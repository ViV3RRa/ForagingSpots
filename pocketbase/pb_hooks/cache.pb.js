/// <reference path="../pb_data/types.d.ts" />

// Cache-Control for the static frontend PocketBase serves out of pb_public.
//
// PocketBase's static file server emits no Cache-Control, so browsers fall back
// to heuristic freshness and can hold a stale app shell / service worker. This
// pins the policy explicitly (pairs with the zone-wide Cloudflare rule):
//   - /assets/*  -> content-hashed build files, immutable forever
//   - everything else (shell, sw.js, manifest, SPA deep-link fallbacks) ->
//     no-cache, i.e. store but always revalidate. Cheap 304s, since PocketBase
//     already sends Last-Modified.
// PocketBase's own routes (/api/, /_/) are left untouched — in particular the
// /api/files/ thumbs the service worker caches CacheFirst must keep their own
// caching.
routerUse((e) => {
    const path = e.request.url.path

    if (!path.startsWith("/api/") && !path.startsWith("/_/")) {
        if (path.startsWith("/assets/")) {
            e.response.header().set("Cache-Control", "public, max-age=31536000, immutable")
        } else {
            e.response.header().set("Cache-Control", "no-cache")
        }
    }

    return e.next()
})
