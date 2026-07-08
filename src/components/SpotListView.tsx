import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MonoLabel } from './ui/MonoLabel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Search, MoreVertical, Edit, Trash2, Share, MapPin } from 'lucide-react';
import type { ForagingSpot, ForagingType, ForagingSpotWithPending } from '../lib/types';
import { getForagingSpotConfig } from './icons';
import { useAuth } from '../hooks/useAuth';
import { useUserLocation } from '../hooks/useUserLocation';
import { distanceToSpot } from '../utils/distance';
import { formatRelativeDate } from '../utils/relativeDate';
import ConfirmationDialog from './ConfirmationDialog';
import { PendingSyncBadge } from './PendingSyncBadge';
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
        // Sort by coordinates (just for demo - could be more sophisticated)
        sorted.sort((a, b) => a.coordinates.lat - b.coordinates.lat);
        break;
    }

    return sorted;
  }, [foragingSpots, sortBy]);

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
      {/* Spacer clears the floating top bar (design leaves ~150px incl. status bar) */}
      <div className="h-[calc(max(14px,env(safe-area-inset-top))+68px)]" />

      <div className="pb-[calc(env(safe-area-inset-bottom,0px)+130px)] pl-[max(22px,env(safe-area-inset-left))] pr-[max(22px,env(safe-area-inset-right))]">
        {/* Count + sort — no equivalent in the design mock, so styled as a quiet mono/serif row */}
        <div className="flex items-center justify-between">
          <MonoLabel>
            {sortedSpots.length} fund
          </MonoLabel>
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-auto gap-[7px] rounded-[10px] border-line bg-surface px-[13px] font-serif text-[13.5px] text-ink2 shadow-none data-[size=default]:h-[38px] dark:bg-surface dark:hover:bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Nyeste først</SelectItem>
              <SelectItem value="oldest">Ældste først</SelectItem>
              <SelectItem value="type">Efter type</SelectItem>
              <SelectItem value="location">Efter lokation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sortedSpots.length > 0 ? (
          sortedSpots.map((spot) => {
            const config = getForagingSpotConfig(spot.type);
            const sharedWith = spot.sharedWith ?? [];
            const spotWithPending = spot as ForagingSpotWithPending;
            const isPending = spotWithPending._pending;
            const hasError = !!spotWithPending._syncError;
            const distance = distanceToSpot(position, spot.coordinates);

            return (
              <div
                key={spot.id}
                onClick={() => onSpotClick(spot)}
                className={`flex cursor-pointer gap-[15px] border-b border-line2 px-[4px] py-[18px] ${isPending ? 'opacity-90' : ''}`}
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

                  {spot.notes && (
                    <p className="mt-[3px] truncate text-[13.5px] leading-[1.5] text-ink2">{spot.notes}</p>
                  )}

                  <div className="mt-[9px] flex items-center justify-between gap-[10px]">
                    <span className="truncate font-mono text-[11px] text-mono">
                      {formatCoordinates(spot.coordinates.lat, spot.coordinates.lng)}
                      {distance && ` · ${distance}`}
                    </span>
                    <span className="flex shrink-0 items-center gap-[7px]">
                      {isPending && <PendingSyncBadge hasError={hasError} />}
                      {sharedWith.length > 0 && (
                        <span className="font-mono text-[11px] text-faint">Delt · {sharedWith.length}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Not in the design mock, but "Vis på kort" is only reachable from here */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label="Flere handlinger"
                      className="flex size-[32px] shrink-0 items-center justify-center self-center rounded-full text-faint transition-colors hover:bg-surface hover:text-ink2"
                    >
                      <MoreVertical className="size-[17px]" strokeWidth={1.8} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewOnMap(spot); }}>
                      <MapPin className="mr-2 h-4 w-4" />
                      Vis på kort
                    </DropdownMenuItem>
                    {user?.id === spot.user && (
                      <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(spot); }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Rediger
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(spot); }}>
                          <Share className="mr-2 h-4 w-4" />
                          Del
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(spot); }}
                          className="text-accent focus:text-accent"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Slet
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={spotToDelete !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Slet dette fund?"
        subjectName={spotToDelete ? getForagingSpotConfig(spotToDelete.type).label : undefined}
        description="fjernes permanent fra din skovbog. Dette kan ikke fortrydes."
        confirmText="Slet fund"
        cancelText="Annullér"
      />
    </div>
  );
}
