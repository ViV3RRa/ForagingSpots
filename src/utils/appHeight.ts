/**
 * Keeps `--app-height` on <html> equal to the app's real usable height.
 *
 * The app shell (html/body/#root, tokens.css) is a fixed, non-scrollable
 * frame. Measured on-device (issues/002-ios-app-frame-short.md, ViewportDebug
 * chip): the installed iOS app reports a status-bar-shortened viewport
 * (innerHeight = screen − 59 pt) while the display surface is the full screen
 * (outerHeight = screen.height). Everywhere else — iOS/Android browser tabs,
 * Android installed — innerHeight is the honest visible height. So:
 *
 *   iOS standalone → max(innerHeight, outerHeight)   (the full screen)
 *   everything else → innerHeight                     (the visible viewport)
 *
 * Deliberately NOT bound to visualViewport: on iOS that tracks the keyboard,
 * and the shell must stay put while typing. innerHeight stays stable under the
 * iOS keyboard; on Android it shrinks, which the form screens absorb via their
 * own overflow-y-auto.
 */

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function setAppHeight() {
  const height =
    isIOS && isStandalone()
      ? Math.max(window.innerHeight, window.outerHeight)
      : window.innerHeight
  document.documentElement.style.setProperty('--app-height', `${height}px`)
}

export function initAppHeight() {
  setAppHeight()

  // Cold-start values can settle late (after first paint) — re-probe.
  for (const delay of [100, 500, 1000]) {
    setTimeout(setAppHeight, delay)
  }

  window.addEventListener('resize', setAppHeight)
  // After rotation, window dimensions can report stale values for a while.
  window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 500))
}
