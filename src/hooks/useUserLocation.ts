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

/**
 * Best-effort geolocation permission state. Browsers without the Permissions
 * API report 'prompt' (callers must tolerate a native prompt appearing);
 * browsers without geolocation at all report 'denied'.
 */
export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (!('geolocation' in navigator)) return 'denied';
  if (!('permissions' in navigator) || typeof navigator.permissions?.query !== 'function') {
    return 'prompt';
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'prompt';
  }
}

/*
 * Fallback for browsers without the Permissions API: once a position fix has
 * ever succeeded, permission was granted, so later sessions may auto-start
 * the watcher without an explicit user opt-in. Only consulted when
 * permissions.query is unavailable — where it exists, it is authoritative
 * (the user may have revoked access since the flag was written).
 */
const GRANTED_BEFORE_KEY = 'ss-location-granted';

function rememberGranted() {
  try {
    localStorage.setItem(GRANTED_BEFORE_KEY, '1');
  } catch {
    // Storage unavailable (private mode); the gate just stays manual.
  }
}

function hasGrantedBefore(): boolean {
  try {
    return localStorage.getItem(GRANTED_BEFORE_KEY) !== null;
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
      rememberGranted();
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
      rememberGranted();
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
  const permission = await queryGeolocationPermission();
  if (gateOpen) return; // startUserLocation() won the race

  // 'prompt' + Permissions API missing: trust a previously recorded grant.
  const supportsQuery =
    'permissions' in navigator && typeof navigator.permissions?.query === 'function';
  const trustedGrant = !supportsQuery && hasGrantedBefore();
  if (permission === 'prompt' && !trustedGrant) {
    // Passive consumers never fire the native prompt; the priming screen or
    // Locate button opens the gate via startUserLocation() instead.
    setState({ initialized: true });
    return;
  }

  gateOpen = true;
  if (listeners.size > 0) startWatching();
}

/**
 * Explicit user opt-in to location: opens the gate and starts the watcher.
 * When permission is still 'prompt', this is what triggers the browser's
 * native permission dialog. Idempotent and safe to call at any time.
 */
export function startUserLocation() {
  gateOpen = true;
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
