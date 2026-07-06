import type { CSSProperties } from 'react';
import PWAInstallPrompt from './PWAInstallPrompt';
import TypeBadge from './TypeBadge';
import { Button } from './ui/button';
import { MonoLabel } from './ui/MonoLabel';
import type { ForagingType } from './types';

interface WelcomeScreenProps {
  onSignIn: () => void;
}

/* Badge positions/sizes from the design's 220×170 icon-cluster frame (isWelcome block). */
const BADGE_CLUSTER: Array<{ type: ForagingType; size: number; style: CSSProperties }> = [
  { type: 'chanterelle', size: 76, style: { left: 74, top: 6, zIndex: 3 } },
  { type: 'blueberry', size: 64, style: { left: 6, top: 70, zIndex: 2 } },
  { type: 'porcini', size: 70, style: { right: 8, top: 58, zIndex: 2 } },
  { type: 'raspberry', size: 58, style: { left: 52, top: 104, zIndex: 1 } },
];

export default function WelcomeScreen({ onSignIn }: WelcomeScreenProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Decorative topo curves along the bottom of the viewport */}
      <svg
        className="absolute inset-0 h-full w-full opacity-50"
        viewBox="0 0 390 838"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path d="M-20 560 Q120 500 200 560 T430 540 L430 838 L-20 838 Z" style={{ fill: 'var(--map-land)' }} />
        <path
          d="M-20 640 Q140 590 230 650 T430 630 L430 838 L-20 838 Z"
          style={{ fill: 'var(--map-water)', opacity: 0.7 }}
        />
      </svg>

      <div className="relative flex flex-1 flex-col items-center justify-center px-[34px]">
        {/* Overlapping icon-badge cluster */}
        <div className="relative mb-[34px] h-[170px] w-[220px]">
          {BADGE_CLUSTER.map(({ type, size, style }) => (
            <TypeBadge
              key={type}
              type={type}
              size={size}
              className="absolute"
              style={{
                ...style,
                border: '4px solid var(--pin-ring)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.22)',
              }}
            />
          ))}
        </div>

        <div className="text-center">
          <MonoLabel className="text-[12px] tracking-[0.24em]">Din personlige</MonoLabel>
          <h1 className="mb-[14px] mt-[10px] font-serif text-[44px] font-semibold leading-[1.05] tracking-[-0.01em] text-ink">
            Skovens
            <br />
            Skatte
          </h1>
          <p className="mx-auto max-w-[280px] text-[15.5px] leading-[1.6] text-ink2">
            Markér dine hemmelige svampe- og bærsteder. Find vej tilbage, sæson efter sæson.
          </p>
        </div>
      </div>

      {/* Extra bottom padding keeps the CTA where it sat above the removed text button (52px + 12px gap) */}
      <div className="relative flex w-full max-w-sm flex-col gap-[12px] self-center px-[30px] pb-[104px]">
        <Button size="lg" onClick={onSignIn}>
          Kom i gang
        </Button>
      </div>

      <PWAInstallPrompt />
    </div>
  );
}
