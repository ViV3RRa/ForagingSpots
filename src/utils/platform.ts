/**
 * Engine detection for choosing an animation strategy.
 *
 * WebKit (every iOS browser — they all wrap WebKit — plus Safari on macOS)
 * re-rasterizes composited layers when a transform-scale or font-size
 * animation ends, which visibly "pops" the settled pixels (detail-sheet
 * header collapse). Blink and Gecko render such animations consistently
 * through to their final frame, so they can run continuous geometric morphs.
 *
 * Chromium-based browsers always carry a `Chrome/`-family token; Safari and
 * the iOS wrappers (CriOS/FxiOS) do not.
 */
export const isWebKitEngine =
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Chrome\/|Chromium|Edg\/|OPR\//.test(navigator.userAgent)
