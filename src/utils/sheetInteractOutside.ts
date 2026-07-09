/*
 * The bottom sheets (AddEditModal, PinDetailsDrawer) open fullscreen overlays
 * that render OUTSIDE the sheet's Radix portal: the location editor, the photo
 * lightbox, the delete confirmation. To Radix, taps in those overlays are
 * "outside" interactions and would dismiss the sheet underneath.
 *
 * Guarding on the overlay's open-state alone is not enough: on touch input,
 * Radix defers outside-dismissal from pointerdown to the later click event. A
 * tap on the overlay's back/confirm button closes the overlay and re-renders
 * first, so by dispatch time the open-flag is already false and the sheet gets
 * dismissed anyway (found on-device, 2026-07-09). Deciding by where the
 * original pointerdown landed is timing-independent.
 */

interface OutsideInteractionEvent {
  detail: { originalEvent: Event };
}

/**
 * True when a Radix "outside" interaction started inside a fullscreen overlay
 * (any `role="dialog"` element — events inside the sheet's own content never
 * reach onInteractOutside, so it cannot match itself). A disconnected target
 * means the node unmounted with the overlay before the deferred dispatch —
 * also treated as inside.
 */
export function outsideInteractionStartedInOverlay(event: OutsideInteractionEvent): boolean {
  const target = event.detail.originalEvent.target;
  if (!(target instanceof Node)) return false;
  if (!target.isConnected) return true;
  return target instanceof Element && target.closest('[role="dialog"]') !== null;
}
