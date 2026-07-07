import { useEffect, useState, useMemo, useRef } from 'react';
import Map, { Marker, type MapRef } from 'react-map-gl';
import Supercluster from 'supercluster';
import type { ForagingSpot, Coordinates, ForagingSpotWithPending } from '../lib/types';
import { TreePine, Compass } from 'lucide-react';
import { MAPBOX_ACCESS_TOKEN, getMapStyle, validateMapboxToken } from '../utils/mapbox';
import { useTheme } from '../hooks/useTheme';
import TypeBadge from './TypeBadge';
import { PendingSyncIcon } from './PendingSyncBadge';

/* Crosshair icon from the design's LOCATE button (same glyph in both states, colors invert) */
function LocateIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2v3.2M12 18.8V22M2 12h3.2M18.8 12H22" />
    </svg>
  );
}

interface MapViewProps {
  foragingSpots: ForagingSpot[];
  currentPosition: Coordinates | null;
  onPinClick: (spot: ForagingSpot) => void;
  centerOnSpot?: ForagingSpot | null;
  initialViewState?: { longitude: number; latitude: number; zoom: number };
  onViewStateChange?: (viewState: { longitude: number; latitude: number; zoom: number }) => void;
}

export default function MapView({
  foragingSpots,
  currentPosition,
  onPinClick,
  centerOnSpot,
  initialViewState,
  onViewStateChange
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const { theme } = useTheme();
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [bearing, setBearing] = useState(0);
  
  // Denmark center coordinates for when no location is available
  const denmarkCenter = { lat: 56.0, lng: 10.0 };
  const denmarkZoom = 6;
  
  // Use provided initial view state or fallback to defaults
  const [viewState, setViewState] = useState(
    initialViewState || {
      longitude: denmarkCenter.lng,
      latitude: denmarkCenter.lat,
      zoom: denmarkZoom
    }
  );


  // Hide Mapbox attribution control
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '.mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right { display: none !important; }';
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Auto-enable following when location is available and user hasn't interacted
  useEffect(() => {
    if (currentPosition && !hasUserInteracted && mapLoaded) {
      setIsFollowingUser(true);
    }
  }, [currentPosition, hasUserInteracted, mapLoaded]);

  useEffect(() => {
    if (!validateMapboxToken()) {
      setMapError('Mapbox access token is not configured. Please check your .env file.');
    }
  }, []);

  // Sync view state from the parent only before the map has loaded (e.g. the
  // first GPS fix arriving between mount and load). After load, all camera
  // changes are animated by this component (auto-follow, locate, centerOnSpot);
  // reacting to the prop here would just restart those animations, since the
  // parent echoes every move back through onViewStateChange.
  useEffect(() => {
    if (initialViewState && !mapLoaded) {
      setViewState(initialViewState);
    }
  }, [initialViewState, mapLoaded]);

  // Follow user location when enabled and location changes
  useEffect(() => {
    if (isFollowingUser && currentPosition && mapRef.current && mapLoaded) {
      // Only follow if the position has changed significantly (more than ~10 meters)
      const currentCenter = mapRef.current.getCenter();
      const distance = Math.sqrt(
        Math.pow((currentPosition.lng - currentCenter.lng) * Math.cos(currentPosition.lat * Math.PI / 180), 2) +
        Math.pow(currentPosition.lat - currentCenter.lat, 2)
      ) * 111000; // Convert to meters approximately

      if (distance > 10) { // 10 meter threshold
        mapRef.current.easeTo({
          center: [currentPosition.lng, currentPosition.lat],
          zoom: 18,
          duration: 1000 // Smooth 1 second transition
        });
      }
    }
  }, [currentPosition, isFollowingUser, mapLoaded]);

  // Center on specific spot when requested - only after map is loaded
  useEffect(() => {
    if (centerOnSpot && mapRef.current && mapLoaded) {
      // Mark that user has interacted with the map (programmatic navigation counts as interaction)
      setHasUserInteracted(true);
      
      // Stop following user location when navigating to a specific spot
      if (isFollowingUser) {
        setIsFollowingUser(false);
      }
      
      // Add a small delay to ensure map is fully ready
      const timer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [centerOnSpot.coordinates.lng, centerOnSpot.coordinates.lat],
            zoom: 18, // Zoom in closer to see the specific spot
            duration: 1500 // Slightly longer animation for better UX
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [centerOnSpot, mapLoaded, isFollowingUser]);

  // Create supercluster instance and process spots
  const { clusters, supercluster } = useMemo(() => {
    const supercluster = new Supercluster({
      radius: 75,
      maxZoom: 20,
      minZoom: 0,
      minPoints: 2,
    });

    const points = foragingSpots.map(spot => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        spotId: spot.id,
        spot: spot
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [spot.coordinates.lng, spot.coordinates.lat]
      }
    }));

    supercluster.load(points);

    // Calculate bounds based on zoom level
    const zoomLevel = Math.floor(viewState.zoom);
    let bounds: [number, number, number, number];
    
    if (zoomLevel <= 3) {
      // For very low zoom levels, use global bounds to ensure all markers are visible
      bounds = [-180, -85, 180, 85];
    } else {
      // For higher zoom levels, use a more generous padding that works for all zoom levels
      const padding = Math.max(0.5, 15 - zoomLevel);
      bounds = [
        viewState.longitude - padding,
        viewState.latitude - padding,
        viewState.longitude + padding,
        viewState.latitude + padding
      ];
    }

    const clusters = supercluster.getClusters(bounds, zoomLevel);

    return { clusters, supercluster };
  }, [foragingSpots, viewState]);

  // Show error state if Mapbox token is not configured
  if (mapError) {
    return (
      <div className="h-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mb-4 text-red-500">
            <TreePine className="h-16 w-16 mx-auto opacity-60" />
          </div>
          <h3 className="text-xl font-semibold text-red-700 mb-2">
            Map Configuration Error
          </h3>
          <p className="text-red-600 mb-4 text-sm">
            {mapError}
          </p>
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-xs text-red-700">
            <p className="font-medium mb-1">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1 text-left">
              <li>Sign up at https://account.mapbox.com/</li>
              <li>Copy your access token</li>
              <li>Add it to your .env file</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const handleClusterClick = (clusterId: number, clusterLongitude: number, clusterLatitude: number) => {
    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 20);
    
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [clusterLongitude, clusterLatitude],
        zoom: expansionZoom,
        duration: 1000 // 1 second smooth animation
      });
    }
  };

  return (
    <div className="h-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => {
          setViewState(evt.viewState);
          setBearing(evt.viewState.bearing || 0);

          // Any user gesture (drag, pinch, keyboard) breaks GPS-follow.
          // Programmatic moves (follow easing, fly-to) carry no originalEvent.
          // Scroll-wheel zoom is the exception — its move events lack
          // originalEvent, so it's caught by onWheel below.
          if (evt.originalEvent) {
            setHasUserInteracted(true);
            if (isFollowingUser) {
              setIsFollowingUser(false);
            }
          }

          // Notify parent of view state changes
          if (onViewStateChange) {
            onViewStateChange({
              longitude: evt.viewState.longitude,
              latitude: evt.viewState.latitude,
              zoom: evt.viewState.zoom
            });
          }
        }}
        onWheel={() => {
          setHasUserInteracted(true);
          if (isFollowingUser) {
            setIsFollowingUser(false);
          }
        }}
        onLoad={() => setMapLoaded(true)}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle={getMapStyle(theme)}
      >
        
        {/* Locate button — 52px circle above the FAB; active GPS-follow inverts to brand colors */}
        <button
          onClick={() => {
            if (mapRef.current && currentPosition) {
              mapRef.current.flyTo({
                center: [currentPosition.lng, currentPosition.lat],
                zoom: 18,
                duration: 1500
              });
            }

            // Enable following
            setIsFollowingUser(true);
          }}
          className={`absolute bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] right-[24px] z-10 flex size-[52px] items-center justify-center rounded-full border border-line shadow-[0_6px_16px_var(--shadow)] transition-colors duration-200 active:scale-95 ${
            currentPosition && isFollowingUser
              ? 'bg-brand text-brand-ink'
              : 'bg-surface text-brand'
          }`}
          title={currentPosition && isFollowingUser ? "Følger din position" : "Centrer på min position"}
        >
          <LocateIcon />
        </button>

        {/* Compass button — appears when the map is rotated, resets bearing to north */}
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.flyTo({
                bearing: 0, // Reset to north
                pitch: 0,   // Reset pitch to flat
                duration: 500
              });
            }
          }}
          className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+156px)] right-[24px] z-10 flex size-[52px] items-center justify-center rounded-full border border-line bg-surface text-brand shadow-[0_6px_16px_var(--shadow)]"
          title="Reset to north"
          style={{
            opacity: bearing === 0 ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: bearing === 0 ? 'none' : 'auto'
          }}
        >
          <Compass
            className="h-[23px] w-[23px]"
            strokeWidth={1.8}
            style={{
              transform: `rotate(${bearing - 45}deg)`,
              transition: 'transform 0.3s ease-out'
            }}
          />
        </button>

        {/* Current position dot — brand color with pin ring and pulse */}
        {currentPosition && (
          <Marker
            longitude={currentPosition.lng}
            latitude={currentPosition.lat}
            anchor="center"
          >
            <div className="size-4 animate-ss-pulse rounded-full border-[3px] border-pin-ring bg-brand" />
          </Marker>
        )}

        {/* Clustered Foraging Spot Markers */}
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            // The design defines no cluster treatment — derived from its pin language:
            // brand circle, --pin-ring border, Spectral 600 count
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
                anchor="center"
              >
                <button
                  onClick={() => handleClusterClick(cluster.id as number, longitude, latitude)}
                  className="flex size-[52px] items-center justify-center rounded-full border-[3px] border-pin-ring bg-brand font-serif text-[17px] font-semibold text-brand-ink shadow-[inset_0_0_0_2px_rgba(255,255,255,0.2),0_4px_10px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-110"
                >
                  {pointCount}
                </button>
              </Marker>
            );
          }

          const spot = cluster.properties.spot as ForagingSpotWithPending;
          const isPending = spot._pending;
          const hasError = !!spot._syncError;

          return (
            <Marker
              key={spot.id}
              longitude={longitude}
              latitude={latitude}
              anchor="bottom"
            >
              <button
                onClick={() => onPinClick(spot)}
                className="relative transition-transform duration-300 hover:scale-110"
              >
                <TypeBadge type={spot.type} size={52} stem className={isPending ? 'opacity-80' : undefined} />
                {isPending && <PendingSyncIcon hasError={hasError} />}
              </button>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
