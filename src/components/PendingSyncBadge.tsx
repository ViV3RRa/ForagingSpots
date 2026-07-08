interface PendingSyncBadgeProps {
  hasError?: boolean;
  /** Detail-drawer copy: "Afventer synkronisering" / "Synkronisering fejlede" */
  long?: boolean;
  className?: string;
}

const clockIcon = (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const warningIcon = (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 8v5M12 16.5v.5" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export function PendingSyncBadge({ hasError, long, className = '' }: PendingSyncBadgeProps) {
  const label = hasError
    ? long
      ? 'Synkronisering fejlede'
      : 'Synk fejlede'
    : long
      ? 'Afventer synkronisering'
      : 'Afventer synk';

  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-[8px] px-[9px] py-[3px] font-sans text-[11px] font-semibold ${
        hasError ? 'bg-fail-bg text-accent' : 'bg-offline-bg text-offline-ink'
      } ${className}`}
    >
      {hasError ? warningIcon : clockIcon}
      {label}
    </span>
  );
}

// Map-pin corner indicator: 18px disc at the badge's top-right corner
export function PendingSyncIcon({ hasError, className = '' }: PendingSyncBadgeProps) {
  return (
    <span
      className={`absolute -right-[3px] -top-[3px] flex size-[18px] items-center justify-center rounded-full border-2 border-pin-ring text-pin-ring ${
        hasError ? 'bg-accent' : 'bg-offline-ink'
      } ${className}`}
      title={hasError ? 'Synkronisering fejlede' : 'Afventer synkronisering'}
    >
      {hasError ? (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 7v5l3 2" />
        </svg>
      )}
    </span>
  );
}
