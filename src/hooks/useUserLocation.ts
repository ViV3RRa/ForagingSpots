import { useSyncExternalStore } from 'react';
import type { Coordinates } from '../lib/types';

/*
 * Shared user-location source. The browser only needs one geolocation watcher
 * no matter how many surfaces show the position (map dot, list distances,
 * detail drawer "Afstand"), so the watch lives in module scope and starts when
 * the first hook consumer subscribes / stops when the last one unmounts.
 */

interface UserLocationState {
  position: Coordinates | null;
  /** True once the initial position request has settled (fix or error). */
  initialized: boolean;
}

let state: UserLocationState = { position: null, initialized: false };
const listeners = new Set<() => void>();
let watchId: number | null = null;

function setState(next: Partial<UserLocationState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function startWatching() {
  if (!('geolocation' in navigator)) {
    console.warn('Geolocation is not supported by this browser');
    setState({ position: null, initialized: true });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setState({
        position: { lat: position.coords.latitude, lng: position.coords.longitude },
        initialized: true,
      });
    },
    (error) => {
      console.warn('Initial geolocation error:', error.message);
      setState({ position: null, initialized: true });
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    }
  );

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      setState({
        position: { lat: position.coords.latitude, lng: position.coords.longitude },
        initialized: true,
      });
    },
    (error) => {
      // Keep the last known position on watch errors
      console.warn('Location tracking error:', error.message);
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

function subscribe(listener: () => void) {
  if (listeners.size === 0) startWatching();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopWatching();
  };
}

function getSnapshot(): UserLocationState {
  return state;
}

const serverSnapshot: UserLocationState = { position: null, initialized: false };

export function useUserLocation(): UserLocationState {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
