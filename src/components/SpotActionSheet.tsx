import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import type { ForagingSpot } from '../lib/types';
import { getForagingSpotConfig } from './icons';

interface SpotActionSheetProps {
  /** Spot the menu was opened for; null keeps the sheet closed. */
  spot: ForagingSpot | null;
  /** Owners get edit/share/delete; everyone gets "Vis på kort". */
  isOwner: boolean;
  onClose: () => void;
  onViewOnMap: (spot: ForagingSpot) => void;
  onEdit: (spot: ForagingSpot) => void;
  onShare: (spot: ForagingSpot) => void;
  onDelete: (spot: ForagingSpot) => void;
}

interface ActionRowProps {
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
  onClick: () => void;
}

function ActionRow({ label, icon, accent = false, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-[14px] rounded-[14px] px-[12px] py-[14px] text-left transition-colors hover:bg-surface ${
        accent ? 'text-accent' : 'text-ink'
      }`}
    >
      {icon}
      <span className={`font-serif text-[16.5px] ${accent ? 'font-semibold' : ''}`}>{label}</span>
    </button>
  );
}

const iconProps = {
  width: 21,
  height: 21,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** Per-row overflow menu as the design's bottom action sheet (`isRowMenu` block). */
export default function SpotActionSheet({
  spot,
  isOwner,
  onClose,
  onViewOnMap,
  onEdit,
  onShare,
  onDelete,
}: SpotActionSheetProps) {
  const runAction = (action: (spot: ForagingSpot) => void) => () => {
    if (!spot) return;
    onClose();
    action(spot);
  };

  return (
    <Sheet open={spot !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="bg-bg px-[18px] sm:mx-auto sm:max-w-[520px]">
        {/* Design padding 30px goes on an inner wrapper: a `pb-` on SheetContent
            itself is overridden by the primitive's `safe-area-bottom` rule
            (declared after the Tailwind utilities), collapsing to 0 off-device. */}
        <div className="pb-[30px]">
          <SheetTitle className="px-[10px] pb-[12px] pt-[2px] text-[18px] text-ink">
            {spot ? getForagingSpotConfig(spot.type).label : ''}
          </SheetTitle>

          <ActionRow
            label="Vis på kort"
            onClick={runAction(onViewOnMap)}
            icon={
              <svg {...iconProps}>
                <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
                <path d="M9 4v14M15 6v14" />
              </svg>
            }
          />

          {isOwner && (
            <>
              <ActionRow
                label="Rediger"
                onClick={runAction(onEdit)}
                icon={
                  <svg {...iconProps}>
                    <path d="M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17z" />
                    <path d="M13.5 6.5l3 3" />
                  </svg>
                }
              />
              <ActionRow
                label="Del"
                onClick={runAction(onShare)}
                icon={
                  <svg {...iconProps}>
                    <circle cx="18" cy="6" r="2.6" />
                    <circle cx="6" cy="12" r="2.6" />
                    <circle cx="18" cy="18" r="2.6" />
                    <path d="M8.3 10.7l7.4-3.4M8.3 13.3l7.4 3.4" />
                  </svg>
                }
              />
              <div className="mx-[12px] my-[6px] h-px bg-line2" />
              <ActionRow
                label="Slet"
                accent
                onClick={runAction(onDelete)}
                icon={
                  <svg {...iconProps}>
                    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                  </svg>
                }
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
