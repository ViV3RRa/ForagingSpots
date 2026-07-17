import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { MonoLabel } from './ui/MonoLabel';
import { Search } from 'lucide-react';
import type { ForagingSpot, ForagingType, ForagingSpotWithPending } from '../lib/types';
import { getForagingSpotConfig } from './icons';
import { useAuth } from '../hooks/useAuth';
import { useUserLocation } from '../hooks/useUserLocation';
import { distanceToSpot, haversineDistance } from '../utils/distance';
import { formatRelativeDate } from '../utils/relativeDate';
import { getLatinLabel } from '../utils/latinLabels';
import ConfirmationDialog from './ConfirmationDialog';
import { PendingSyncBadge } from './PendingSyncBadge';
import SpotActionSheet from './SpotActionSheet';
import TypeBadge from './TypeBadge';

interface SpotListViewProps {
  foragingSpots: ForagingSpot[];
  activeFilters: Set<ForagingType>;
  /** Search lives in the floating TopBar; spots arrive already search-filtered. */
  searchQuery: string;
  /** Unfiltered spot count — distinguishes a fresh account from filters hiding everything. */
  totalSpots: number;
  onSpotClick: (spot: ForagingSpot) => void;
  onEdit: (spot: ForagingSpot) => void;
  onDelete: (spotId: string) => void;
  onShare: (spot: ForagingSpot) => void;
  onViewOnMap: (spot: ForagingSpot) => void;
  onFilterClick: () => void;
  onAddClick: () => void;
  totalTypes: number;
}

type SortOption = 'newest' | 'oldest' | 'type' | 'location';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Nyeste først' },
  { value: 'oldest', label: 'Ældste først' },
  { value: 'type', label: 'Efter type' },
  { value: 'location', label: 'Efter lokation' },
];

const formatCoordinates = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'Ø' : 'V'}`;

export default function SpotListView({
  foragingSpots,
  activeFilters,
  searchQuery,
  totalSpots,
  onSpotClick,
  onEdit,
  onDelete,
  onShare,
  onViewOnMap,
  onFilterClick,
  onAddClick,
  totalTypes
}: SpotListViewProps) {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [menuSpot, setMenuSpot] = useState<ForagingSpot | null>(null);
  const [spotToDelete, setSpotToDelete] = useState<ForagingSpot | null>(null);

  const { user } = useAuth();
  const { position } = useUserLocation();

  // Delete confirmation handlers
  const handleDeleteClick = (spot: ForagingSpot) => {
    setSpotToDelete(spot);
  };

  const handleDeleteConfirm = () => {
    if (!spotToDelete) return;

    onDelete(spotToDelete.id);
    setSpotToDelete(null);
  };

  const handleDeleteCancel = () => {
    setSpotToDelete(null);
  };

  // Spots arrive already search- and filter-narrowed from MainMapScreen; only sort here
  const sortedSpots = useMemo(() => {
    const sorted = [...foragingSpots];

    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
        break;
      case 'type':
        sorted.sort((a, b) => getForagingSpotConfig(a.type).label.localeCompare(getForagingSpotConfig(b.type).label));
        break;
      case 'location':
        // Nearest first — matches the distance shown on each row. Without a
        // position fix distance is meaningless, so fall back to newest first.
        if (position) {
          sorted.sort(
            (a, b) =>
              haversineDistance(position, a.coordinates) - haversineDistance(position, b.coordinates)
          );
        } else {
          sorted.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        }
        break;
    }

    return sorted;
  }, [foragingSpots, sortBy, position]);

  const filtersNarrowed = activeFilters.size < totalTypes;

  // Fresh account — the design's dedicated empty state with the add-spot CTA
  if (totalSpots === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-bg px-[44px] py-[40px] text-center">
        <div className="relative mb-[10px] size-[150px]">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-line" />
          <div className="absolute left-1/2 top-1/2 flex size-[88px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface opacity-90">
            <img
              src="/spot_types/generic_mushroom.png"
              width={52}
              height={52}
              alt=""
              decoding="async"
              className="opacity-50 [filter:grayscale(0.3)]"
            />
          </div>
        </div>
        <h2 className="mb-[8px] mt-[14px] font-serif text-[25px] font-semibold text-ink">Ingen fund endnu</h2>
        <p className="mb-[26px] max-w-[250px] text-[15px] leading-[1.6] text-ink2">
          Din skovbog er tom. Marker dit første svampe- eller bærsted, så det venter på dig næste sæson.
        </p>
        <Button size="lg" onClick={onAddClick} className="h-[52px] rounded-[16px] px-[26px] text-[16px]">
          <span aria-hidden>＋</span>
          Markér dit første fund
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-bg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Spacer clears the floating top bar (design: 120px incl. its 56px status bar) */}
      <div className="h-[calc(max(14px,env(safe-area-inset-top))+64px)]" />

      <div className="pb-[calc(env(safe-area-inset-bottom,0px)+130px)] pl-[max(22px,env(safe-area-inset-left))] pr-[max(22px,env(safe-area-inset-right))]">
        {/* Toolbar: mono count + custom sort popover (design: isList toolbar / sortOpen) */}
        <div className="flex items-center justify-between px-[2px] pb-[12px] pt-[8px]">
          <MonoLabel className="text-[12px] tracking-[.12em]">
            {sortedSpots.length} fund
          </MonoLabel>
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen((open) => !open)}
              className="flex h-[38px] items-center gap-[8px] rounded-[11px] border border-line bg-surface px-[12px] shadow-[0_2px_6px_var(--shadow)]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-mono" aria-hidden>
                <path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l-3 3M17 20l3-3" />
              </svg>
              <span className="font-serif text-[14px] text-ink">
                {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {sortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 w-[220px] animate-[ss-fade_.16s_ease] rounded-[16px] border border-line bg-surface p-[6px] shadow-[0_14px_34px_-8px_rgba(0,0,0,.32)]"
                >
                  {SORT_OPTIONS.map(({ value, label }) => {
                    const active = sortBy === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => { setSortBy(value); setSortOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-[11px] px-[12px] py-[11px] text-left ${
                          active ? 'bg-[rgba(181,80,47,.08)] dark:bg-[rgba(201,162,75,.14)]' : ''
                        }`}
                      >
                        <span className={`font-serif text-[15px] ${active ? 'text-accent' : 'text-ink2'}`}>{label}</span>
                        {active && <span className="text-[14px] text-accent">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {sortedSpots.length > 0 ? (
          sortedSpots.map((spot) => {
            const config = getForagingSpotConfig(spot.type);
            const latinName = getLatinLabel(spot.type);
            const sharedWith = spot.sharedWith ?? [];
            const spotWithPending = spot as ForagingSpotWithPending;
            const isPending = spotWithPending._pending;
            const hasError = !!spotWithPending._syncError;
            const distance = distanceToSpot(position, spot.coordinates);

            return (
              <div
                key={spot.id}
                onClick={() => onSpotClick(spot)}
                className={`flex cursor-pointer gap-[14px] border-b border-line2 px-[4px] py-[18px] ${isPending ? 'opacity-90' : ''}`}
              >
                <TypeBadge type={spot.type} size={60} ring={false} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-[10px]">
                    <h3 className="truncate font-serif text-[19px] font-semibold leading-[1.3] text-ink">
                      {config.label}
                    </h3>
                    <span className="shrink-0 font-mono text-[11px] text-faint">
                      {formatRelativeDate(new Date(spot.created))}
                    </span>
                  </div>

                  {latinName && (
                    <p className="mb-[8px] mt-[2px] truncate font-serif text-[13.5px] italic text-muted">
                      {latinName}
                    </p>
                  )}

                  {spot.notes && (
                    <p className="mt-[3px] truncate text-[13.5px] leading-[1.5] text-ink2">{spot.notes}</p>
                  )}

                  <div className="mt-[9px] truncate font-mono text-[11px] text-mono">
                    {formatCoordinates(spot.coordinates.lat, spot.coordinates.lng)}
                    {distance && ` · ${distance}`}
                  </div>

                  {(isPending || sharedWith.length > 0) && (
                    <div className="mt-[9px] flex flex-wrap items-center gap-[6px]">
                      {isPending && <PendingSyncBadge hasError={hasError} />}
                      {sharedWith.length > 0 && (
                        <span className="inline-flex items-center gap-[5px] rounded-[8px] bg-line2 px-[9px] py-[3px] text-[11px] font-semibold text-ink2">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <circle cx="18" cy="6" r="2.5" />
                            <circle cx="6" cy="12" r="2.5" />
                            <circle cx="18" cy="18" r="2.5" />
                            <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
                          </svg>
                          Delt · {sharedWith.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  aria-label="Flere handlinger"
                  onClick={(e) => { e.stopPropagation(); setMenuSpot(spot); }}
                  className="flex size-[32px] shrink-0 items-center justify-center self-start rounded-[9px] text-faint transition-colors hover:bg-surface hover:text-ink2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="12" cy="5" r="1.7" />
                    <circle cx="12" cy="12" r="1.7" />
                    <circle cx="12" cy="19" r="1.7" />
                  </svg>
                </button>
              </div>
            );
          })
        ) : (
          /* Spots exist, but search/filters hide them all */
          <div className="flex flex-col items-center px-[24px] pt-[64px] text-center">
            <div className="relative flex size-[110px] items-center justify-center rounded-full border-2 border-dashed border-line">
              <Search className="size-[34px] text-muted opacity-70" strokeWidth={1.6} />
            </div>
            <h3 className="mb-[6px] mt-[18px] font-serif text-[21px] font-semibold text-ink">Ingen resultater</h3>
            <p className="max-w-[250px] text-[14px] leading-[1.6] text-ink2">
              {searchQuery
                ? 'Prøv at justere din søgning eller dine filtre.'
                : 'Ingen fund matcher dine filtre.'}
            </p>
            {filtersNarrowed && (
              <Button variant="outline" size="sm" onClick={onFilterClick} className="mt-[20px]">
                Justér filtre
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Row overflow menu — design's bottom action sheet */}
      <SpotActionSheet
        spot={menuSpot}
        isOwner={menuSpot !== null && user?.id === menuSpot.user}
        onClose={() => setMenuSpot(null)}
        onViewOnMap={onViewOnMap}
        onEdit={onEdit}
        onShare={onShare}
        onDelete={handleDeleteClick}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={spotToDelete !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Slet dette fund?"
        subjectName={spotToDelete ? getForagingSpotConfig(spotToDelete.type).label : undefined}
        description="fjernes permanent. Dette kan ikke fortrydes."
        confirmText="Slet fund"
        cancelText="Annullér"
      />
    </div>
  );
}
