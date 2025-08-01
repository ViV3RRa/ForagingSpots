import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Search, MoreVertical, Edit, Trash2, Share, MapPin, Calendar, StickyNote, SlidersHorizontal } from 'lucide-react';
import type { ForagingSpot, ForagingType } from '../lib/types';
import { getForagingIcon, getForagingColor } from './icons';
import { getDanishLabel } from '../utils/danishLabels';
import { ALL_FORAGING_TYPES } from '../utils/foragingTypes';

interface SpotListViewProps {
  foragingSpots: ForagingSpot[];
  activeFilters: Set<ForagingType>;
  onSpotClick: (spot: ForagingSpot) => void;
  onEdit: (spot: ForagingSpot) => void;
  onDelete: (spotId: string) => void;
  onShare: (spot: ForagingSpot) => void;
  onViewOnMap: (spot: ForagingSpot) => void;
  onFilterClick: () => void;
  totalTypes: number;
}

type SortOption = 'newest' | 'oldest' | 'type' | 'location';

// Generate type config from the centralized icon configuration
const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = ALL_FORAGING_TYPES.reduce((acc, type) => {
  acc[type] = {
    label: getDanishLabel(type),
    icon: getForagingIcon(type, { size: 24 }),
    color: getForagingColor(type)
  };
  return acc;
}, {} as Record<string, { label: string; icon: React.ReactNode; color: string }>);

export default function SpotListView({
  foragingSpots,
  activeFilters,
  onSpotClick,
  onEdit,
  onDelete,
  onShare,
  onViewOnMap,
  onFilterClick,
  totalTypes
}: SpotListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter spots based on active filters and search
  const filteredAndSortedSpots = useMemo(() => {
    const filtered = foragingSpots.filter(spot => {
      const matchesFilter = activeFilters.has(spot.type);
      const matchesSearch = searchQuery === '' || 
        spot.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        typeConfig[spot.type].label.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });

    // Sort spots
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
        break;
      case 'type':
        filtered.sort((a, b) => typeConfig[a.type].label.localeCompare(typeConfig[b.type].label));
        break;
      case 'location':
        // Sort by coordinates (just for demo - could be more sophisticated)
        filtered.sort((a, b) => a.coordinates.lat - b.coordinates.lat);
        break;
    }

    return filtered;
  }, [foragingSpots, activeFilters, searchQuery, sortBy]);

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
    <div className="h-full bg-earth-background">
      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Søg blandt skatte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

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

      {/* Spots List */}
      <div className="p-4 space-y-3 pb-20">
        {filteredAndSortedSpots.length > 0 ? (
          <>
            {filteredAndSortedSpots.map((spot) => {
              const config = typeConfig[spot.type];
              const isShared = spot.sharedWith.length > 0;
              
              return (
                <Card 
                  key={spot.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200"
                  onClick={() => onSpotClick(spot)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className={`h-12 w-12 ${config.color} rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                        {typeof config.icon === 'string' ? (
                          <span className="text-xl">{config.icon}</span>
                        ) : (
                          <div className="text-white">{config.icon}</div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{config.label}</h3>
                            {isShared && (
                              <Badge variant="secondary" className="text-xs">
                                Delt med {spot.sharedWith.length} person{spot.sharedWith.length !== 1 ? 'er' : ''}
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
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(spot); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Rediger
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(spot); }}>
                                <Share className="mr-2 h-4 w-4" />
                                Del
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); onDelete(spot.id); }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Slet
                              </DropdownMenuItem>
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
                    {getForagingIcon('chanterelle', { size: 20 })}
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
    </div>
  );
}
