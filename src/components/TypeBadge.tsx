import type { CSSProperties } from 'react';
import type { ForagingType } from './types';
import { getForagingSpotConfig } from './icons';
import { cn } from './ui/utils';

interface TypeBadgeProps {
  type: ForagingType;
  /** Outer diameter in px. The design uses 44 (filter rows), 52 (map pins), 60 (list rows), 72 (detail header). */
  size?: number;
  /** Draw the --pin-ring border. The design omits it on list/filter rows. */
  ring?: boolean;
  className?: string;
  style?: CSSProperties;
}

/*
 * Circular gradient type badge from the "Skovens Skatte" design: per-type
 * gradient, --pin-ring border, inner white highlight, and drop shadow.
 * Used by map pins, list rows, detail header, type grid, and filter rows.
 */
export default function TypeBadge({ type, size = 52, ring = true, className, style }: TypeBadgeProps) {
  const config = getForagingSpotConfig(type, Math.round(size * 0.66));
  const ringWidth = size >= 60 ? 4 : 3;
  const highlightWidth = size >= 60 ? 3 : 2;

  return (
    <div
      role="img"
      aria-label={config.label}
      className={cn('flex shrink-0 items-center justify-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        ...config.background,
        border: ring ? `${ringWidth}px solid var(--pin-ring)` : undefined,
        boxShadow: `inset 0 0 0 ${highlightWidth}px rgba(255,255,255,0.3), 0 4px 10px rgba(0,0,0,0.25)`,
        ...style,
      }}
    >
      {config.icon}
    </div>
  );
}
