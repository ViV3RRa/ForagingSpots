import { useEffect, useRef } from 'react';
import { registerLayer, deregisterLayer } from '../lib/historyLayers';

/**
 * Give an open UI layer (sheet/overlay/dialog) one history entry so native
 * back navigation closes it instead of leaving the app (see lib/historyLayers).
 *
 * requestClose runs on a back press: close through the layer's normal path
 * (exit animation included), or return false to veto — e.g. a dirty form
 * routing into its discard dialog instead of closing.
 */
export function useHistoryLayer(isOpen: boolean, requestClose: () => boolean | void) {
  // Ref keeps the registration stable across re-renders while the handler
  // always sees fresh state (isDirty etc.)
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    if (!isOpen) return;
    const id = registerLayer(() => requestCloseRef.current());
    return () => deregisterLayer(id);
  }, [isOpen]);
}
