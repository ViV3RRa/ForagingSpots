import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
}

export function useNetworkStatus(onOnline?: () => void): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    onOnline?.();
  }, [onOnline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline };
}
