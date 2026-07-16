// Inlined as a data URI: a separate request loses the race against the splash's
// short lifetime on slow networks, leaving the tile blank
import appIcon from '../assets/app-icon-256.png?inline';

/*
 * In-app boot splash (design ref: isSplash block). Shown while AuthContext
 * restores the session (and while the first spots fetch runs), bridging the
 * native manifest splash and the app itself: brand surface with faint contour
 * lines, the monogram app icon, Spectral wordmark and loading dots.
 */
export default function BootSplash() {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-brand">
      {/* Faint contour lines, echoing the native splash art */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.14]"
        viewBox="0 0 390 838"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g style={{ stroke: 'var(--brand-ink)' }} strokeWidth="1.4" fill="none">
          <path d="M-20 300 Q160 240 420 340" />
          <path d="M-20 360 Q160 300 420 400" />
          <path d="M-20 420 Q160 360 420 460" />
          <path d="M-20 520 Q160 460 420 560" />
          <path d="M-20 580 Q160 520 420 620" />
        </g>
      </svg>

      <div className="relative flex flex-col items-center">
        <img
          src={appIcon}
          alt=""
          width={104}
          height={104}
          decoding="async"
          className="h-[104px] w-[104px] rounded-[26px] shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
        />
        <h1 className="mt-[22px] font-serif text-[26px] font-semibold tracking-[0.01em] text-brand-ink">
          Skovens Skatte
        </h1>
        <div className="mt-[20px] flex gap-[6px]" role="status" aria-label="Indlæser">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-[7px] rounded-full bg-brand-ink"
              style={{ animation: `ss-fade 1s ease ${dot * 0.25}s infinite alternate` }}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-[38px] font-mono text-[11px] uppercase tracking-[0.14em] text-brand-ink opacity-70">
        offline klar
      </div>
    </div>
  );
}
