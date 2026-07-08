import { Button } from './ui/button';

interface LocationPermissionScreenProps {
  /** "Tillad placering" — the caller starts the location watcher (native prompt fires there). */
  onAllow: () => void;
  /** "Ikke nu" — continue to the map without location features. */
  onSkip: () => void;
}

/*
 * Location permission priming screen (design ref: isPermission block).
 * Shown once over the map, before the browser's native geolocation prompt,
 * to explain why the app wants the user's position.
 */
export default function LocationPermissionScreen({ onAllow, onSkip }: LocationPermissionScreenProps) {
  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-hidden bg-background">
      {/* Faint contour lines across the upper half */}
      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        viewBox="0 0 390 838"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g style={{ stroke: 'var(--map-line)' }} strokeWidth="1.4" fill="none">
          <path d="M-20 240 Q160 180 420 280" />
          <path d="M-20 300 Q160 240 420 340" />
          <path d="M-20 360 Q160 300 420 400" />
        </g>
      </svg>

      <div className="relative flex flex-1 flex-col items-center justify-center px-[40px] text-center">
        {/* Pulsing crosshair illustration */}
        <div className="relative mb-[26px] size-[130px]">
          <div className="absolute inset-0 animate-ss-pulse rounded-full bg-brand opacity-[0.12]" />
          <div className="absolute left-1/2 top-1/2 flex size-[78px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-brand-ink shadow-[0_10px_26px_-6px_var(--brand)]">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
              <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
            </svg>
          </div>
        </div>

        <h1 className="mb-[12px] font-serif text-[29px] font-semibold leading-[1.15] text-ink">
          Find dine steder
          <br />
          igen og igen
        </h1>
        <p className="max-w-[270px] text-[15px] leading-[1.6] text-ink2">
          Skovens Skatte bruger din placering til at markere fund præcist og guide dig tilbage.
          Vi deler den aldrig.
        </p>
      </div>

      <div className="relative flex flex-col gap-[12px] px-[30px] pb-[calc(env(safe-area-inset-bottom,0px)+40px)]">
        <Button size="lg" onClick={onAllow}>
          Tillad placering
        </Button>
        <Button variant="ghost" onClick={onSkip} className="h-[52px] text-[14.5px]">
          Ikke nu
        </Button>
      </div>
    </div>
  );
}
