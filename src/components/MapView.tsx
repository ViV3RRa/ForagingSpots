import { useEffect, useState, useMemo, useRef } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl, type MapRef } from 'react-map-gl';
import Supercluster from 'supercluster';
import type{ ForagingSpot, Coordinates } from './types';
import { TreePine } from 'lucide-react';
import ChanterelleIcon from './ChanterelleIcon';
import { MAPBOX_ACCESS_TOKEN, DEFAULT_MAP_CONFIG, validateMapboxToken } from '../utils/mapbox';

interface MapViewProps {
  foragingSpots: ForagingSpot[];
  currentPosition: Coordinates | null;
  onPinClick: (spot: ForagingSpot) => void;
}

const getForagingIcon = (type: string) => {
  switch (type) {
    case 'chanterelle':
      return <ChanterelleIcon size={18} />;
    case 'blueberry':
    case 'lingonberry':
    case 'cloudberry':
      return '🫐';
    default:
      return '🌿';
  }
};

const getForagingColor = (type: string) => {
  switch (type) {
    case 'chanterelle':
      return 'bg-yellow-500';
    case 'blueberry':
      return 'bg-blue-500';
    case 'lingonberry':
      return 'bg-red-500';
    case 'cloudberry':
      return 'bg-orange-500';
    default:
      return 'bg-green-500';
  }
};

export default function MapView({ foragingSpots, currentPosition, onPinClick }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Denmark center coordinates for when no location is available
  const denmarkCenter = { lat: 56.0, lng: 10.0 };
  const denmarkZoom = 6;
  
  const [viewState, setViewState] = useState({
    longitude: currentPosition?.lng || denmarkCenter.lng,
    latitude: currentPosition?.lat || denmarkCenter.lat,
    zoom: currentPosition ? DEFAULT_MAP_CONFIG.zoom : denmarkZoom
  });

  // Track previous position to only fly when changing from null to a value
  const prevPositionRef = useRef<Coordinates | null>(null);

  // Hide Mapbox attribution control
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '.mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right { display: none !important; }';
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Update view state when current position changes from null to a value
  useEffect(() => {
    const wasNull = prevPositionRef.current === null;
    const hasValue = currentPosition !== null;
    
    if (wasNull && hasValue && currentPosition) {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [currentPosition.lng, currentPosition.lat],
          zoom: DEFAULT_MAP_CONFIG.zoom,
          duration: 1000
        });
      } else {
        setViewState(prev => ({
          ...prev,
          longitude: currentPosition.lng,
          latitude: currentPosition.lat
        }));
      }
    }
    
    prevPositionRef.current = currentPosition;
  }, [currentPosition]);

  useEffect(() => {
    if (!validateMapboxToken()) {
      setMapError('Mapbox access token is not configured. Please check your .env file.');
    }
  }, []);

  // Update view state when current position changes
  useEffect(() => {
    if (currentPosition) {
      setViewState(prev => ({
        ...prev,
        longitude: currentPosition.lng,
        latitude: currentPosition.lat
      }));
    }
  }, [currentPosition]);

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
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle={DEFAULT_MAP_CONFIG.style}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" showZoom={false} />
        <GeolocateControl position="top-right" />

        {/* Current Position Marker - only show if we have a valid location */}
        {currentPosition && (
          <Marker
            longitude={currentPosition.lng}
            latitude={currentPosition.lat}
            anchor="center"
          >
            <div className="relative">
              <div className="h-4 w-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
              <div className="absolute -inset-2 border-2 border-blue-400 rounded-full animate-ping opacity-75" />
            </div>
          </Marker>
        )}

        {/* Clustered Foraging Spot Markers */}
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
                anchor="center"
              >
                <button
                  onClick={() => handleClusterClick(cluster.id as number, longitude, latitude)}
                  className="transition-all duration-300 hover:scale-110 z-10 flex flex-col items-center"
                >
                  <div className="h-12 w-12 bg-green-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold hover:shadow-xl transition-shadow">
                    <span className="text-sm">{pointCount}</span>
                  </div>
                  <div className="mt-1 px-2 py-1 bg-white/90 backdrop-blur rounded text-xs font-medium text-gray-700 shadow-sm">
                    {pointCount} spots
                  </div>
                </button>
              </Marker>
            );
          }

          const spot = cluster.properties.spot as ForagingSpot;
          return (
            <Marker
              key={spot.id}
              longitude={longitude}
              latitude={latitude}
              anchor="center"
            >
              <button
                onClick={() => onPinClick(spot)}
                className="transition-all duration-300 hover:scale-110 z-10 flex flex-col items-center"
              >
                <div className={`h-10 w-10 ${getForagingColor(spot.type)} rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold hover:shadow-xl transition-shadow`}>
                  {typeof getForagingIcon(spot.type) === 'string' ? (
                    <span className="text-lg">{getForagingIcon(spot.type)}</span>
                  ) : (
                    getForagingIcon(spot.type)
                  )}
                </div>
                <div className="mt-1 px-2 py-1 bg-white/90 backdrop-blur rounded text-xs font-medium text-gray-700 shadow-sm max-w-20 truncate">
                  {spot.type}
                </div>
              </button>
            </Marker>
          );
        })}
      </Map>

      {/* Map Legend */}
      {/* <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg z-10">
        <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="h-3 w-3 bg-blue-500 rounded-full mr-2" />
            <span className="text-gray-600">Your location</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 bg-green-600 rounded-full mr-2 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">3</span>
            </div>
            <span className="text-gray-600">Clustered spots</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2">
              <ChanterelleIcon size={16} />
            </div>
            <span className="text-gray-600">Chanterelles</span>
          </div>
          <div className="flex items-center">
            <span className="text-base mr-2">🫐</span>
            <span className="text-gray-600">Berries</span>
          </div>
        </div>
      </div> */}
    </div>
  );
}
