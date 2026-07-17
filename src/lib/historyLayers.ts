/*
 * Native back-navigation integration.
 *
 * Every open UI layer (sheet, overlay, dialog) registers here via
 * useHistoryLayer and gets one history entry pushed for it, stamped with the
 * layer depth at that point. Native back (Android back button/gesture, iOS
 * edge-swipe, browser back) then pops entries and closes layers instead of
 * leaving the app.
 *
 * The manager is reconciling, not event-counting: a user pop reads the
 * landing entry's depth stamp and closes layers until the live stack matches
 * it. That self-corrects against everything that breaks naive one-pop-one-
 * close bookkeeping — multi-entry jumps (back-button long-press, browser
 * interventions skipping entries), a second back press arriving while the
 * previous close is still committing, and traversals lost to browser quirks.
 *
 * Layers keep closing through their own code paths exactly as before: when a
 * layer deregisters without a back press having consumed its entry, the stale
 * entry is removed with a programmatic history.go() whose popstate is
 * swallowed. Programmatic backs are coalesced per microtask, and a register
 * arriving in the same tick reuses a doomed entry in place instead of
 * interleaving back()+pushState (whose ordering browsers don't guarantee) —
 * this also makes React StrictMode's dev mount/unmount/mount dance a no-op.
 *
 * A layer's requestClose may return false to veto the back press (e.g. a
 * dirty form routing into its discard dialog); the entries above the landing
 * point are then re-pushed so the surviving layers keep their places.
 *
 * Exit guard (Android only — iOS has no back-exit): one sentinel entry sits
 * beneath the app's rest state. It MUST be pushed from a user interaction:
 * Chrome flags no-gesture entries as back-button-skippable (anti-trap
 * policy), so a boot-time push guards nothing and would only block the real
 * one. The first back press with nothing open consumes the sentinel and
 * shows the "press back again" toast; a second press exits natively. Not
 * re-pushing the sentinel IS the exit path — the web has no API to close the
 * app, so the guard steps aside instead. The next interaction re-arms it.
 *
 * The launch window (no interaction yet, so no sentinel) is covered by a
 * CloseWatcher where supported: the one interception it grants without user
 * activation turns the very first back gesture into the toast. It is
 * destroyed as soon as the first interaction arms the sentinel, so it never
 * shadows the history-based flow. A back press before any interaction on a
 * browser without CloseWatcher simply exits — that is Chrome policy, not a
 * gap the web can close.
 */

import { toast } from 'sonner';

type RequestClose = () => boolean | void;

interface LayerRecord {
  id: number;
  requestClose: RequestClose;
  /** A back press already consumed this layer's history entry and its close
      is committing — skip it when picking the next layer to close, and don't
      pop another entry when it deregisters. */
  consumed: boolean;
}

/** How long the exit stays armed — matches the toast so the UI never lies:
    while the message shows, a second back press exits. */
const EXIT_TOAST_MS = 2000;

const stack: LayerRecord[] = [];
let nextId = 1;
/** Traversals we initiated (one per history.go call) whose popstate must be
    swallowed rather than treated as a user back press. */
let pendingProgrammaticPops = 0;
/** Stale entries awaiting removal in the microtask flush. */
let scheduledBacks = 0;
let backFlushQueued = false;
let initialized = false;
let guardEnabled = false;
let sentinelPresent = false;
/** Covers back presses before the first interaction (see header). */
let bootWatcher: { destroy(): void } | null = null;

function showExitToast() {
  toast('Tryk tilbage igen for at lukke appen', {
    duration: EXIT_TOAST_MS,
    // Brand card like ui/sonner's success/info toasts, no icon or ✕
    className: 'justify-center bg-brand text-[#f4efe3] dark:text-brand-ink',
    closeButton: false,
  });
}

/** Layers that are actually open (consumed ones are mid-close). */
const liveDepth = () => stack.reduce((n, layer) => n + (layer.consumed ? 0 : 1), 0);

function pushEntry(depth: number) {
  history.pushState({ ssDepth: depth }, '');
}

/** Remove stale entries with one coalesced traversal per microtask. */
function scheduleBack() {
  scheduledBacks++;
  if (backFlushQueued) return;
  backFlushQueued = true;
  queueMicrotask(() => {
    backFlushQueued = false;
    const count = scheduledBacks;
    scheduledBacks = 0;
    if (count > 0) {
      pendingProgrammaticPops++;
      history.go(-count);
    }
  });
}

/** Push the sentinel when the exit guard wants one and it isn't in place.
    Wired to pointerdown, so the entry carries a user gesture. */
function ensureSentinel() {
  if (guardEnabled && !sentinelPresent) {
    sentinelPresent = true;
    pushEntry(0);
    // The history-based guard is armed — the launch watcher must not
    // intercept back presses meant for it (or for layers) from here on
    bootWatcher?.destroy();
    bootWatcher = null;
  }
}

function handlePopState(event: PopStateEvent) {
  // A traversal we initiated to drop stale entries — not a user back press
  if (pendingProgrammaticPops > 0) {
    pendingProgrammaticPops--;
    return;
  }

  // How many layers the landing entry says should remain. The rest entry
  // predates the manager (state null → 0); the sentinel is stamped 0 too.
  const state = event.state as { ssDepth?: number } | null;
  const targetDepth = state?.ssDepth ?? 0;

  const hadLayers = liveDepth() > 0;
  let vetoed = false;
  while (!vetoed && liveDepth() > targetDepth) {
    const top = [...stack].reverse().find((layer) => !layer.consumed)!;
    top.consumed = true;
    if (top.requestClose() === false) {
      top.consumed = false;
      vetoed = true;
    }
  }
  if (vetoed) {
    // Rebuild entries for the layers that stayed open (the vetoing one and
    // anything beneath it that this jump would also have closed)
    const depth = liveDepth();
    for (let d = targetDepth + 1; d <= depth; d++) pushEntry(d);
    return;
  }

  // Landed on or below the sentinel's slot. A plain-rest landing (no stamp)
  // means the sentinel is gone or was jumped over — either way the next back
  // press must exit natively, so the guard steps aside.
  if (state?.ssDepth === undefined && guardEnabled && sentinelPresent) {
    sentinelPresent = false;
    if (!hadLayers) showExitToast();
  }
}

/** Call once at boot (main.tsx), before any layer can open. */
export function initHistoryLayers() {
  if (initialized) return;
  initialized = true;
  // Any Android context: installed PWA, browser tab and DevTools emulation
  // all have a back control that would otherwise leave the app. iOS stays
  // out — standalone there has no back-exit, so the toast would only mislead.
  guardEnabled = /android/i.test(navigator.userAgent);
  window.addEventListener('popstate', handlePopState);
  // Capture phase: runs before any layer-opening click handler in the same
  // interaction, so a layer opened while disarmed lands above the sentinel
  window.addEventListener('pointerdown', ensureSentinel, true);
  // Launch guard: intercept a back press arriving before any interaction —
  // CloseWatcher grants exactly one no-activation interception, which is all
  // the double-back pattern needs. Consumed → toast; the next press exits.
  const CloseWatcherCtor = (
    window as { CloseWatcher?: new () => { onclose: (() => void) | null; destroy(): void } }
  ).CloseWatcher;
  if (guardEnabled && CloseWatcherCtor) {
    try {
      const watcher = new CloseWatcherCtor();
      watcher.onclose = () => {
        bootWatcher = null;
        showExitToast();
      };
      bootWatcher = watcher;
    } catch {
      // No launch guard — the first back press before any interaction exits
    }
  }
}

export function registerLayer(requestClose: RequestClose): number {
  ensureSentinel();
  const record: LayerRecord = { id: nextId++, requestClose, consumed: false };
  stack.push(record);
  if (scheduledBacks > 0) {
    // A layer deregistered this same tick — take over its entry in place
    // (same depth) instead of pairing a traversal with a fresh push
    scheduledBacks--;
  } else {
    pushEntry(liveDepth());
  }
  return record.id;
}

export function deregisterLayer(id: number) {
  const index = stack.findIndex((layer) => layer.id === id);
  if (index === -1) return;
  const [record] = stack.splice(index, 1);
  if (!record.consumed) scheduleBack();
}
