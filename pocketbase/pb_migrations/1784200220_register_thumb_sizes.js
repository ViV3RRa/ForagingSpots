/// <reference path="../pb_data/types.d.ts" />

// Register the thumb sizes used by the lazy blur-up pipeline (plans/005).
// PocketBase only serves sizes listed here and silently falls back to the
// original file otherwise. All sizes are aspect-preserving:
//   32x0     — tiny placeholder (width 32, height auto), blurred up client-side
//   600x600f — display thumb, fit inside 600×600 (long side 600)
//   96x96    — avatar (TopBar 48px / ProfileSheet 104px circles)
// Thumbs are generated lazily on first request, existing files included.
migrate((app) => {
  const spots = app.findCollectionByNameOrId("foraging_spots");
  spots.fields.getByName("images").thumbs = ["32x0", "600x600f"];
  app.save(spots);

  const users = app.findCollectionByNameOrId("users");
  users.fields.getByName("avatar").thumbs = ["96x96"];
  app.save(users);
}, (app) => {
  const spots = app.findCollectionByNameOrId("foraging_spots");
  spots.fields.getByName("images").thumbs = [];
  app.save(spots);

  const users = app.findCollectionByNameOrId("users");
  users.fields.getByName("avatar").thumbs = null;
  app.save(users);
});
