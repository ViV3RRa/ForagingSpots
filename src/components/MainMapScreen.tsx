import { useState, useEffect, useMemo, type ReactNode } from 'react';
import TopBar from './TopBar';
import AddEditModal from './AddEditModal';
import PinDetailsDrawer from './PinDetailsDrawer';
import MapView from './MapView';
import type { User as NewUser, ForagingSpot, ForagingSpotWithPending, ForagingType, Coordinates } from '../lib/types';
import FilterDialog from './FilterDialog';
import SpotListView from './SpotListView';
import { OfflineBanner } from './OfflineBanner';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { getAllForagingTypesSet, getTotalForagingTypes } from '../utils/foragingTypes';
import { getForagingSpotConfig } from './icons';
import { useUserLocation } from '../hooks/useUserLocation';
import type { MapMode } from '../utils/mapbox';
import { useUpdateSpot } from '../hooks/useForagingSpots';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

interface MainMapScreenProps {
  user: NewUser;
  foragingSpots: ForagingSpot[];
  onSignOut: () => void;
  onOpenProfile: () => void;
  onAddSpot: (spot: Omit<ForagingSpot, 'id' | 'user' | 'created' | 'updated' | 'images'> & { images: File[] }) => void;
  onUpdateSpot: (spotId: string, updates: Partial<Omit<ForagingSpot, 'images'>> & { images?: File[]; existingImageFilenames?: string[] }) => void;
  onDeleteSpot: (spotId: string) => void;
}

export default function MainMapScreen({
  user,
  foragingSpots,
  onSignOut,
  onOpenProfile,
  onAddSpot, 
  onUpdateSpot, 
  onDeleteSpot 
}: MainMapScreenProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ForagingSpot | null>(null);
  const [editingSpot, setEditingSpot] = useState<ForagingSpot | null>(null);
  const { position: currentPosition, status: locationStatus } = useUserLocation();
  const { isOnline } = useNetworkStatus();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<ForagingType>>(getAllForagingTypesSet());
  const [centerOnSpot, setCenterOnSpot] = useState<ForagingSpot | null>(null);
  // Map load failure (reported by MapView) — hides the whole bottom bar (incl.
  // the add button) and the floating map buttons while the error card shows;
  // only the top bar stays
  const [mapError, setMapError] = useState(false);
  // Basemap mode — session-only by construction (plain state, no persistence):
  // it survives Kort/Liste switches and sheets because this component stays
  // mounted, and a reload boots back in base mode
  const [mapMode, setMapMode] = useState<MapMode>('base');
  
  // TanStack Query hooks for optimistic updates
  const queryClient = useQueryClient();
  const updateSpotMutation = useUpdateSpot();
  
  // Denmark center coordinates for when no location is available
  const denmarkCenter = { lat: 56.0, lng: 10.0 };
  const denmarkZoom = 6;
  
  // Persistent map view state
  const [mapViewState, setMapViewState] = useState({
    longitude: denmarkCenter.lng,
    latitude: denmarkCenter.lat,
    zoom: denmarkZoom
  });
  
  // Track if we've initialized the map position with user's location
  const [hasInitializedUserPosition, setHasInitializedUserPosition] = useState(false);

  // Center the map on the user the first time a GPS fix arrives (position
  // tracking itself lives in the shared useUserLocation hook)
  useEffect(() => {
    if (currentPosition && !hasInitializedUserPosition) {
      setMapViewState({
        longitude: currentPosition.lng,
        latitude: currentPosition.lat,
        zoom: 18 // Use a reasonable zoom level for user location
      });
      setHasInitializedUserPosition(true);
    }
  }, [currentPosition, hasInitializedUserPosition]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddSpot = (type: ForagingType, notes: string, coordinates: Coordinates, images: File[], sharedWith: string[], _existingImageFilenames?: string[]) => {
    // For new spots, existingImageFilenames should be undefined/empty (unused for new spots)
    onAddSpot({
      type,
      coordinates,
      notes,
      images,
      sharedWith
    });
    setShowAddModal(false);
  };

  const handleEditSpot = (spot: ForagingSpot, type: ForagingType, notes: string, coordinates: Coordinates, images: File[], sharedWith: string[], existingImageFilenames?: string[]) => {
    onUpdateSpot(spot.id, { type, notes, coordinates, images, sharedWith, existingImageFilenames });
    setEditingSpot(null);
  };

  // const handlePinClick = (spot: OldForagingSpot) => {
  //   setSelectedSpot(spot);
  // };

  const handleSpotClick = (spot: ForagingSpot) => {
    setSelectedSpot(spot);
  };

  // selectedSpot is a click-time snapshot; the open drawer must track live query
  // data (pending→synced flips, share/edit updates) instead of the stale object.
  const liveSelectedSpot = useMemo(() => {
    if (!selectedSpot) return null;
    const byId = foragingSpots.find(s => s.id === selectedSpot.id);
    if (byId) return byId;
    // A pending spot that synced while the drawer was open reappears under a new
    // server id — reconnect to it via its identifying fields
    if ((selectedSpot as ForagingSpotWithPending)._pending) {
      const twin = foragingSpots.find(s =>
        !(s as ForagingSpotWithPending)._pending &&
        s.type === selectedSpot.type &&
        s.coordinates.lat === selectedSpot.coordinates.lat &&
        s.coordinates.lng === selectedSpot.coordinates.lng
      );
      if (twin) return twin;
    }
    // Deleted, or mid-refetch between sync and reload — keep the snapshot
    return selectedSpot;
  }, [selectedSpot, foragingSpots]);

  // Coordinate-only update from the detail drawer's "Redigér ›" location editor
  const handleUpdateLocation = (spotId: string, coordinates: Coordinates) => {
    const spot = foragingSpots.find(s => s.id === spotId);
    if (!spot) return;

    const updatedSpot = { ...spot, coordinates };

    // Optimistically update the cache (pending spots live in their own store
    // and are handled by the mutation itself)
    queryClient.setQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all, (oldData) => {
      if (!oldData) return oldData;
      return oldData.map(s => (s.id === spotId ? updatedSpot : s));
    });

    // Update the selected spot state so the open drawer reflects the change
    if (selectedSpot?.id === spotId) {
      setSelectedSpot(updatedSpot);
    }

    updateSpotMutation.mutate(
      { id: spotId, data: { coordinates } },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
        }
      }
    );
  };

  const handleApplyFilters = (filters: Set<ForagingType>) => {
    setActiveFilters(filters);
  };

  const handleViewOnMap = (spot: ForagingSpot) => {
    setViewMode('map');
    // Add a small delay to ensure the map component has mounted before setting centerOnSpot
    setTimeout(() => {
      setCenterOnSpot(spot);
      // Clear the centerOnSpot after the map has had time to center
      setTimeout(() => setCenterOnSpot(null), 3000);
    }, 100);
  };

  const handleMapViewStateChange = (newViewState: { longitude: number; latitude: number; zoom: number }) => {
    setMapViewState(newViewState);
  };

  // Any bottom sheet (add, edit, detail drawer, filter) hides the map-style toggle
  const sheetOpen =
    showAddModal || editingSpot !== null || selectedSpot !== null || showFilterDialog;

  // Search (driven by the floating top bar) filters both map pins and list rows
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSpots = foragingSpots.filter(spot => {
    if (!activeFilters.has(spot.type)) return false;
    if (normalizedSearch === '') return true;
    return (
      (spot.notes ?? '').toLowerCase().includes(normalizedSearch) ||
      getForagingSpotConfig(spot.type).label.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="relative h-full overflow-hidden bg-bg">
      <div className="absolute inset-0">
        {viewMode === 'map' ? (
          <MapView
            foragingSpots={filteredSpots}
            onPinClick={setSelectedSpot}
            centerOnSpot={centerOnSpot ? foragingSpots.find(s => s.id === centerOnSpot.id) ?? null : null}
            initialViewState={mapViewState}
            onViewStateChange={handleMapViewStateChange}
            onShowList={() => setViewMode('list')}
            onMapErrorChange={setMapError}
            mapMode={mapMode}
          />
        ) : (
          <SpotListView
            foragingSpots={filteredSpots}
            activeFilters={activeFilters}
            searchQuery={searchQuery}
            totalSpots={foragingSpots.length}
            onSpotClick={handleSpotClick}
            onEdit={(spot) => setEditingSpot(spot)}
            onDelete={onDeleteSpot}
            // Sharing is managed in the edit sheet (the drawer only displays it)
            onShare={(spot) => setEditingSpot(spot)}
            onViewOnMap={handleViewOnMap}
            onFilterClick={() => setShowFilterDialog(true)}
            onAddClick={() => setShowAddModal(true)}
            totalTypes={getTotalForagingTypes()}
          />
        )}
      </div>

      <TopBar
        user={user}
        onSignOut={onSignOut}
        onOpenProfile={onOpenProfile}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterClick={() => setShowFilterDialog(true)}
        hasActiveFilters={activeFilters.size < getTotalForagingTypes()}
      />

      {/* Floating card 8px below the top bar (design: bar bottom 104px, banner top 112px) */}
      <div className="absolute inset-x-0 top-[calc(max(14px,env(safe-area-inset-top))+70px)] z-10">
        <OfflineBanner />
      </div>

      {/* No-location badge sits in the offline banner's slot under the search
          field (stacking below the banner when both show); hides on the
          map-error card, and disappears live when a fix arrives */}
      {viewMode === 'map' && !mapError && locationStatus === 'unavailable' && (
        <NoLocationBadge offline={!isOnline} />
      )}

      {/* Basemap toggle gates on the design's isMapReady (map view, no sheet,
          no map error) — deliberately not on location: it stays visible in the
          no-location state, unlike the locate button */}
      {viewMode === 'map' && !mapError && !sheetOpen && (
        <MapStyleToggle
          satellite={mapMode === 'satellite'}
          onToggle={() => setMapMode((mode) => (mode === 'satellite' ? 'base' : 'satellite'))}
        />
      )}

      {/* Floating bottom bar (replaces the Kort/Liste pill and corner FAB);
          the map-error card is the one state without it — its "Vis fund som
          liste" action leads to the list, where the bar (and add) returns */}
      {!(viewMode === 'map' && mapError) && (
        <BottomNavBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddClick={() => setShowAddModal(true)}
        />
      )}

      {/* The add sheet opens without a GPS fix too — the sheet's Placering
          section then shows the no-location warning and gates the save */}
      {showAddModal && (
        <AddEditModal
          coordinates={currentPosition}
          editorFallbackCenter={{ lat: mapViewState.latitude, lng: mapViewState.longitude }}
          onSave={(type, notes, coordinates, images, sharedWith, existingImageFilenames) => handleAddSpot(type, notes, coordinates, images, sharedWith, existingImageFilenames)}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingSpot && (
        <AddEditModal
          spot={editingSpot}
          coordinates={editingSpot.coordinates}
          onSave={(type, notes, coordinates, images, sharedWith, existingImageFilenames) => handleEditSpot(editingSpot, type, notes, coordinates, images, sharedWith, existingImageFilenames)}
          onClose={() => setEditingSpot(null)}
        />
      )}

      {/* {selectedSpot && ( */}
        <PinDetailsDrawer
          spot={liveSelectedSpot}
          currentUser={user}
          onClose={() => setSelectedSpot(null)}
          onEdit={() => {
            setEditingSpot(liveSelectedSpot);
            setSelectedSpot(null);
          }}
          onDelete={() => {
            if (!liveSelectedSpot) return;
            onDeleteSpot(liveSelectedSpot.id);
            setSelectedSpot(null);
          }}
          onUpdateLocation={handleUpdateLocation}
        />
      {/* )} */}

      <FilterDialog
        open={showFilterDialog}
        onOpenChange={setShowFilterDialog}
        spots={foragingSpots}
        activeFilters={activeFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}

interface BottomNavBarProps {
  viewMode: 'map' | 'list';
  onViewModeChange: (mode: 'map' | 'list') => void;
  onAddClick: () => void;
}

/* Folded-map and three-line glyphs from the design's bottom nav items */
function MapNavIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function ListNavIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

// Floating bottom nav bar: forest-green rounded bar with Kort/Liste items
// flanking the cradled accent add button. The bar is three segments — two
// plain rounded ends and a fixed-width center SVG carrying the design's exact
// notch path (eased shoulders included) — so the scoop keeps hugging the
// button at any viewport width, unlike the design's full-width stretched SVG.
// The center SVG squeezes the path ~7% horizontally, reproducing how the
// design frame renders it (notch snug against the halo, seated below); the
// drop-shadow lives on the wrapper so it follows the notch outline.
function BottomNavBar({ viewMode, onViewModeChange, onAddClick }: BottomNavBarProps) {
  const navItem = (mode: 'map' | 'list', label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => onViewModeChange(mode)}
      className={`flex flex-1 flex-col items-center gap-[3px] transition-colors ${
        viewMode === mode
          ? 'text-[#f4efe3]'
          : 'text-[rgba(244,239,227,.55)] dark:text-[rgba(240,233,214,.5)]'
      }`}
    >
      {icon}
      <span className="font-serif text-[11.5px] font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+22px)] left-[max(16px,env(safe-area-inset-left))] right-[max(16px,env(safe-area-inset-right))] z-10 h-[66px]">
      {/* barFill: brand forest in light, hardcoded deep forest in dark (design
          barFill — deliberately not --surface or the dark gold --brand) */}
      <div className="absolute inset-0 flex text-[#2f4a32] [filter:drop-shadow(0_8px_20px_rgba(20,15,8,.28))] dark:text-[#20301c]">
        <div className="flex-1 rounded-l-[26px] bg-current" />
        {/* Notch section of the design's bar path (x 136–222), 1px overlaps
            against the neighbours to avoid hairline seams at fractional widths */}
        <svg
          width="80"
          height="66"
          viewBox="136 0 86 66"
          preserveAspectRatio="none"
          className="-mx-px h-full shrink-0"
          aria-hidden
        >
          <path
            d="M136,0 C142,0 146,4 149,9 A38,38 0 0 0 209,9 C212,4 216,0 222,0 L222,66 L136,66 Z"
            fill="currentColor"
          />
        </svg>
        <div className="flex-1 rounded-r-[26px] bg-current" />
      </div>
      <div className="absolute inset-0 flex items-center">
        {navItem('map', 'Kort', <MapNavIcon />)}
        <div className="w-[88px] shrink-0" />
        {navItem('list', 'Liste', <ListNavIcon />)}
      </div>
      {/* Cradled add button — half above the bar in the notch, with a halo
          ring in the page-background color */}
      <button
        type="button"
        onClick={onAddClick}
        aria-label="Tilføj fund"
        className="absolute left-1/2 top-0 flex size-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-bg bg-accent text-accent-ink shadow-[0_8px_20px_-4px_var(--accent)] transition-transform active:scale-95"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

/* Stacked-diamonds "layers" icon from the design's map-style toggle */
function LayersIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}

// 52px circular basemap toggle, bottom-left above the nav bar (where the
// location chip used to sit); satellite mode inverts to brand colors, same
// pattern as the locate button's active state. Label names the mode you'd
// switch to. No mode-switch animation.
function MapStyleToggle({ satellite, onToggle }: { satellite: boolean; onToggle: () => void }) {
  const label = satellite ? 'Kort' : 'Satellit';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={`absolute bottom-[calc(env(safe-area-inset-bottom,0px)+112px)] left-[max(16px,env(safe-area-inset-left))] z-10 flex size-[52px] items-center justify-center rounded-full border border-line shadow-[0_6px_16px_var(--shadow)] active:scale-95 ${
        satellite ? 'bg-brand text-brand-ink' : 'bg-surface text-brand'
      }`}
    >
      <LayersIcon />
    </button>
  );
}

/* Slashed location pin with filled center dot, from the design's no-location badge */
function CrossedPinIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 10.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" fill="currentColor" stroke="none" />
      <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 12-4.9M3 3l18 18" />
    </svg>
  );
}

// Centered amber badge under the search field when there is no fix and none
// coming. Same slot as the offline banner (design noLocTop 112/182): it drops
// to the stacked position while the device is offline so the two never overlap.
function NoLocationBadge({ offline }: { offline: boolean }) {
  return (
    <div
      className={`absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-[9px] whitespace-nowrap rounded-[12px] border border-offline-border bg-offline-bg px-[15px] py-[9px] shadow-[0_3px_10px_var(--shadow)] ${
        offline
          ? 'top-[calc(max(14px,env(safe-area-inset-top))+140px)]'
          : 'top-[calc(max(14px,env(safe-area-inset-top))+70px)]'
      }`}
    >
      <span className="flex shrink-0 text-offline-ink">
        <CrossedPinIcon size={16} strokeWidth={1.8} />
      </span>
      <span className="font-mono text-[11px] leading-[1.35] text-offline-ink">
        Ingen lokation — tjek din GPS
      </span>
    </div>
  );
}
