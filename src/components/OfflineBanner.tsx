import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePendingSpots } from '../hooks/usePendingSpots';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { pendingSpots } = usePendingSpots();

  if (isOnline) return null;

  const pendingCount = pendingSpots.length;

  return (
    // Purely informational — click-through so the map stays interactive underneath
    <div className="pointer-events-none animate-ss-fade px-[16px]">
      <div className="flex items-center gap-[11px] rounded-[14px] border border-offline-border bg-offline-bg px-[14px] py-[11px] shadow-[0_6px_18px_var(--shadow)]">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-offline-ink"
          aria-hidden
        >
          <path d="M7 18h9a4 4 0 0 0 1-7.9 6 6 0 0 0-9.3-2.6M3 3l18 18" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[14px] font-semibold leading-[1.3] text-offline-ink">
            Offline · viser gemte fund
          </div>
          <div className="mt-[1px] text-[11.5px] leading-[1.4] text-offline-ink2">
            Nye fund synkroniseres, når du er online igen.
            {pendingCount > 0 && ` · ${pendingCount} fund venter`}
          </div>
        </div>
      </div>
    </div>
  );
}
