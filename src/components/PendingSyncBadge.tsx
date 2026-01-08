import { Cloud, CloudOff } from 'lucide-react';

interface PendingSyncBadgeProps {
  hasError?: boolean;
  className?: string;
}

export function PendingSyncBadge({ hasError, className = '' }: PendingSyncBadgeProps) {
  if (hasError) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs ${className}`}
        title="Sync failed"
      >
        <CloudOff className="w-3 h-3" />
        <span>Fejl</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs ${className}`}
      title="Waiting to sync"
    >
      <Cloud className="w-3 h-3" />
      <span>Offline</span>
    </div>
  );
}

// Small icon-only badge for map pins
export function PendingSyncIcon({ hasError, className = '' }: PendingSyncBadgeProps) {
  if (hasError) {
    return (
      <div
        className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center ${className}`}
        title="Sync failed"
      >
        <CloudOff className="w-2.5 h-2.5 text-white" />
      </div>
    );
  }

  return (
    <div
      className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center ${className}`}
      title="Waiting to sync"
    >
      <Cloud className="w-2.5 h-2.5 text-white" />
    </div>
  );
}
