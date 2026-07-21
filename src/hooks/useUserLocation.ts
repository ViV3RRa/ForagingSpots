import { useSyncExternalStore } from 'react';
import type { Coordinates } from '../lib/types';

/*
 * Shared user-location source. The browser only needs one geolocation watcher
 * no matter how many surfaces show the position (map dot, list distances,
 * detail drawer "Afstand"), so the watch lives in module scope and starts when
 * the first hook consumer subscribes / stops when the last one unmounts.
 *
 * Permission gate: while the geolocation permission state is 'prompt', merely
 * subscribing must NOT start the watcher — that would fire the browser's
 * native permission prompt on app load, bypassing the priming screen
 * (LocationPermissionScreen). The gate opens automatically when permission is
 * already settled (granted/denied), or explicitly via startUserLocation()
 * when the user opts in ("Tillad placering" / the map's Locate button).
 */

export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt';

interface PermissionQueryResult {
  state: GeolocationPermissionState;
  /**
   * True only when `state` came from a successful Permissions API query.
   * False when the API is missing OR present-but-unable-to-answer for
   * geolocation — notably iOS Safari, which exposes navigator.permissions
   * but has no 'geolocation' permission name, so query() rejects. In that
   * case a 'prompt' result is really "unknown", not "genuinely un-prompted".
   */
  authoritative: boolean;
}

async function queryGeolocationPermissionDetailed(): Promise<PermissionQueryResult> {
  if (!('geolocation' in navigator)) return { state: 'denied', authoritative: true };
  if (!('permissions' in navigator) || typeof navigator.permissions?.query !== 'function') {
    return { state: 'prompt', authoritative: false };
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return { state: status.state, authoritative: true };
  } catch {
    return { state: 'prompt', authoritative: false };
  }
}

/**
 * Best-effort geolocation permission state. Browsers without the Permissions
 * API (or that can't answer for geolocation, e.g. iOS Safari) report 'prompt'
 * (callers must tolerate a native prompt appearing); browsers without
 * geolocation at all report 'denied'.
 */
export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  return (await queryGeolocationPermissionDetailed()).state;
}

/*
 * Persistent "the user opted into location before" flag. Set the moment the
 * user opts in — the priming screen's "Tillad placering" or the map's Locate
 * button (both via startUserLocation) — and also on any successful fix. On a
 * later visit it lets the watcher auto-start without waiting for another tap.
 *
 * Why an opt-in flag and not the live permission query: iOS Safari can't
 * report geolocation permission (query is missing OR resolves 'prompt'
 * regardless of the real OS grant), so the query alone can never tell a
 * returning, already-granted user apart from a first-timer. The recorded
 * opt-in is the only reliable "this user already agreed" signal; the actual
 * grant lives in the OS and starting the watcher for a granted user produces
 * no prompt. (Storage key kept as-is for users upgrading from the old
 * grant-only flag.)
 */
const OPTED_IN_KEY = 'ss-location-granted';

function rememberOptIn() {
  try {
    localStorage.setItem(OPTED_IN_KEY, '1');
  } catch {
    // Storage unavailable (private mode); the gate just stays manual.
  }
}

function hasOptedInBefore(): boolean {
  try {
    return localStorage.getItem(OPTED_IN_KEY) !== null;
  } catch {
    return false;
  }
}

/*
 * 'locating'    — no fix yet, but none has been refused either: the initial
 *                 request is still pending, or the permission gate never
 *                 opened (state 'prompt', priming screen skipped). The gated
 *                 case deliberately does NOT report 'unavailable': no fix was
 *                 ever attempted, so the "tjek din GPS" badge would mislead —
 *                 and hiding the Locate button (gated on 'unavailable') would
 *                 remove the only re-entry point for opting in to location.
 * 'available'   — we have a fix (possibly stale, kept across watch errors).
 * 'unavailable' — no position and none coming: geolocation unsupported, or
 *                 the fix attempt failed (denied / position-unavailable /
 *                 timeout). Cleared if a watch fix arrives later.
 */
export type UserLocationStatus = 'locating' | 'available' | 'unavailable';

interface UserLocationState {
  position: Coordinates | null;
  status: UserLocationStatus;
  /** True once the initial position request has settled (fix or error). */
  initialized: boolean;
}

let state: UserLocationState = { position: null, status: 'locating', initialized: false };
const listeners = new Set<() => void>();
let watchId: number | null = null;
let gateOpen = false;

function setState(next: Partial<UserLocationState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function startWatching() {
  if (watchId !== null) return;

  if (!('geolocation' in navigator)) {
    console.warn('Geolocation is not supported by this browser');
    setState({ position: null, status: 'unavailable', initialized: true });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      rememberOptIn();
      setState({
        position: { lat: position.coords.latitude, lng: position.coords.longitude },
        status: 'available',
        initialized: true,
      });
    },
    (error) => {
      console.warn('Initial geolocation error:', error.message);
      // The watcher may still deliver a fix later (e.g. timeout on a slow
      // fix); its success handler flips the status back to 'available'.
      setState({ position: null, status: 'unavailable', initialized: true });
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    }
  );

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      rememberOptIn();
      setState({
        position: { lat: position.coords.latitude, lng: position.coords.longitude },
        status: 'available',
        initialized: true,
      });
    },
    (error) => {
      // Keep the last known position (and 'available' status) on watch errors
      console.warn('Location tracking error:', error.message);
      if (state.position === null && state.status !== 'unavailable') {
        setState({ status: 'unavailable', initialized: true });
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000, // 30 seconds
    }
  );
}

function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/** Open the gate if permission is already settled, then start if still needed. */
async function openGateIfPermitted() {
  const { state: permission, authoritative } = await queryGeolocationPermissionDetailed();
  if (gateOpen) return; // startUserLocation() won the race

  // Auto-start the watcher only when it won't hit a first-timer with a bare
  // native prompt (bypassing the priming screen):
  //   - the browser authoritatively knows the outcome (granted OR denied), so
  //     starting either just works or fails silently — no surprise prompt; or
  //   - the user opted into location on an earlier visit (recorded flag). The
  //     OS holds the actual grant, so starting produces no prompt.
  // This must NOT hinge on the query being authoritative: on iOS the query is
  // never authoritative, yet a returning opted-in user must still auto-start —
  // that was the "map only zooms after I tap Locate" bug.
  const settled = authoritative && permission !== 'prompt';
  if (settled || hasOptedInBefore()) {
    gateOpen = true;
    if (listeners.size > 0) startWatching();
    return;
  }

  // Genuinely un-prompted and never opted in: leave the gate closed so the
  // native prompt doesn't fire on load. The priming screen or the Locate
  // button opens it via startUserLocation() instead.
  setState({ initialized: true });
}

/**
 * Explicit user opt-in to location: records the opt-in (so later visits
 * auto-start), opens the gate, and starts the watcher. When permission is
 * still 'prompt', this is what triggers the browser's native permission
 * dialog. Idempotent and safe to call at any time.
 */
export function startUserLocation() {
  gateOpen = true;
  rememberOptIn();
  if (listeners.size > 0) startWatching();
}

function subscribe(listener: () => void) {
  const first = listeners.size === 0;
  listeners.add(listener);
  if (first) {
    if (gateOpen) {
      startWatching();
    } else {
      void openGateIfPermitted();
    }
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopWatching();
  };
}

function getSnapshot(): UserLocationState {
  return state;
}

const serverSnapshot: UserLocationState = { position: null, status: 'locating', initialized: false };

export function useUserLocation(): UserLocationState {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
