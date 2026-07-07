import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Search, MoreVertical, Edit, Trash2, Share, MapPin, Calendar, StickyNote, SlidersHorizontal } from 'lucide-react';
import type { ForagingSpot, ForagingType, ForagingSpotWithPending } from '../lib/types';
import { getForagingSpotConfig } from './icons';
import { useAuth } from '../hooks/useAuth';
import ConfirmationDialog from './ConfirmationDialog';
import { PendingSyncBadge } from './PendingSyncBadge';

interface SpotListViewProps {
  foragingSpots: ForagingSpot[];
  activeFilters: Set<ForagingType>;
  /** Search lives in the floating TopBar; spots arrive already search-filtered. */
  searchQuery: string;
  onSpotClick: (spot: ForagingSpot) => void;
  onEdit: (spot: ForagingSpot) => void;
  onDelete: (spotId: string) => void;
  onShare: (spot: ForagingSpot) => void;
  onViewOnMap: (spot: ForagingSpot) => void;
  onFilterClick: () => void;
  totalTypes: number;
}

type SortOption = 'newest' | 'oldest' | 'type' | 'location';

export default function SpotListView({
  foragingSpots,
  activeFilters,
  searchQuery,
  onSpotClick,
  onEdit,
  onDelete,
  onShare,
  onViewOnMap,
  onFilterClick,
  totalTypes
}: SpotListViewProps) {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [spotToDelete, setSpotToDelete] = useState<ForagingSpot | null>(null);

  const { user } = useAuth();

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

  // Filter spots based on active filters (search is applied upstream in MainMapScreen)
  const filteredAndSortedSpots = useMemo(() => {
    const filtered = foragingSpots.filter(spot => activeFilters.has(spot.type));

    // Sort spots
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
        break;
      case 'type':
        filtered.sort((a, b) => getForagingSpotConfig(a.type).label.localeCompare(getForagingSpotConfig(b.type).label));
        break;
      case 'location':
        // Sort by coordinates (just for demo - could be more sophisticated)
        filtered.sort((a, b) => a.coordinates.lat - b.coordinates.lat);
        break;
    }

    return filtered;
  }, [foragingSpots, activeFilters, sortBy]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('da-DK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  return (
    // Top padding clears the floating TopBar; search itself lives up there now
    <div className="h-full overflow-y-auto bg-bg pt-[calc(max(14px,env(safe-area-inset-top))+62px)]">
      {/* Sort and Filter Bar (fully restyled in subtask 2.5) */}
      <div className="border-b border-line p-4">
        {/* Sort, Filter and Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Nyeste først</SelectItem>
                <SelectItem value="oldest">Ældste først</SelectItem>
                <SelectItem value="type">Efter type</SelectItem>
                <SelectItem value="location">Efter lokation</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={onFilterClick}
              variant="outline"
              size="sm"
              className={`transition-all duration-300 ${
                activeFilters.size < totalTypes
                  ? 'bg-forest-green text-white hover:bg-forest-dark border-forest-green'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filter
              {activeFilters.size < totalTypes && (
                <div className="ml-2 bg-white/20 px-1.5 py-0.5 rounded-full text-xs font-medium">
                  {activeFilters.size}
                </div>
              )}
            </Button>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredAndSortedSpots.length} spot{filteredAndSortedSpots.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Spots List — bottom padding clears the view toggle and FAB */}
      <div className="p-4 space-y-3 pb-[calc(env(safe-area-inset-bottom,0px)+130px)]">
        {filteredAndSortedSpots.length > 0 ? (
          <>
            {filteredAndSortedSpots.map((spot) => {
              const config = getForagingSpotConfig(spot.type);
              const sharedWith = spot.sharedWith ?? []
              const isShared = sharedWith.length > 0;
              const spotWithPending = spot as ForagingSpotWithPending;
              const isPending = spotWithPending._pending;
              const hasError = !!spotWithPending._syncError;

              return (
                <Card
                  key={spot.id}
                  className={`cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200 ${isPending ? 'opacity-90 border-amber-200' : ''}`}
                  onClick={() => onSpotClick(spot)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm ${isPending ? 'opacity-80' : ''}`} style={config.background}>
                        {typeof config.icon === 'string' ? (
                          <span className="text-xl">{config.icon}</span>
                        ) : (
                          <div className="text-white">{config.icon}</div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-900">{config.label}</h3>
                            {isPending && <PendingSyncBadge hasError={hasError} />}
                            {isShared && (
                              <Badge variant="secondary" className="text-xs">
                                Delt med {sharedWith.length} person{sharedWith.length !== 1 ? 'er' : ''}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
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
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Slet
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Notes */}
                        {spot.notes && (
                          <div className="flex items-start gap-2 mb-3">
                            <StickyNote className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600 line-clamp-2">{spot.notes}</p>
                          </div>
                        )}

                        {/* Location and Date */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>{formatCoordinates(spot.coordinates.lat, spot.coordinates.lng)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(new Date(spot.created))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        ) : (
          <div className="h-full bg-earth-background flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <Search className="h-16 w-16 text-gray-400 opacity-60" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    {getForagingSpotConfig('chanterelle', 20 /* size */).icon}
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Ingen skatte fundet
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Prøv at justere din søgning eller filtre' : 'Tjek dine filtre eller tilføj din første skat!'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={spotToDelete !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Er du sikker?"
        description={`Er du sikker på, at du vil slette denne skat?`}
        confirmText="Slet permanent"
        cancelText="Annuller"
        variant="destructive"
      />
    </div>
  );
}
