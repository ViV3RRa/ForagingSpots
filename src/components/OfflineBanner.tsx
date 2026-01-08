import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePendingSpots } from '../hooks/usePendingSpots';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { pendingSpots } = usePendingSpots();

  if (isOnline) return null;

  const pendingCount = pendingSpots.length;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-sm">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>
        Du er offline
        {pendingCount > 0 && (
          <span className="ml-1">
            — {pendingCount} {pendingCount === 1 ? 'Skat' : 'skatte'} afventer synkronisering
          </span>
        )}
      </span>
    </div>
  );
}
