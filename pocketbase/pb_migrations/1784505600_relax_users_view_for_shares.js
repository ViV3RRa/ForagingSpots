/// <reference path="../pb_data/types.d.ts" />

// Let the app display the owner's username on a find that was shared *with*
// the current user ("Delt af {ejer}" / "Delt med mig af", plan 008).
//
// The client fetches spots with `expand: 'user'`, but expand honours the
// TARGET collection's viewRule. The `users` viewRule was `id = @request.auth.id`
// (own record only), so PocketBase silently dropped `expand.user` for a
// spot owned by someone else — leaving only the generic "en ven" fallback.
//
// This widens the viewRule by exactly one narrow case: you may view another
// user's record iff at least one spot THEY own is shared with you. The
// back-relation `foraging_spots_via_user` (spots whose `user` relation points
// at this user record) keeps both halves correlated to the same rows, so it
// can't be tricked by having an unrelated share elsewhere.
//
// Scope of exposure: only id/username/name/avatar/created/updated of owners
// who actually shared with you. `email` stays hidden (PocketBase never returns
// it to non-owners unless emailVisibility is set), and listRule stays
// own-record-only so the user table still can't be enumerated.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.viewRule =
    "id = @request.auth.id || foraging_spots_via_user.sharedWith ?~ @request.auth.username";
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.viewRule = "id = @request.auth.id";
  app.save(users);
});
