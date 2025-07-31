import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { MapPin, Move, Target } from 'lucide-react';
import type { Coordinates } from '../lib/types';
import Map, { NavigationControl, GeolocateControl } from 'react-map-gl';
import { DEFAULT_MAP_CONFIG, MAPBOX_ACCESS_TOKEN } from '../utils/mapbox';

interface LocationPickerModalProps {
  initialCoordinates: Coordinates;
  onSave: (coordinates: Coordinates) => void;
  onClose: () => void;
}

export default function LocationPickerModal({ initialCoordinates, onSave, onClose }: LocationPickerModalProps) {
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates>(initialCoordinates);
  // const [isDragging, setIsDragging] = useState(false);
  const [mapViewState, setMapViewState] = useState({
    longitude: initialCoordinates.lng,
    latitude: initialCoordinates.lat,
    zoom: 14
  });

  const handleSave = () => {
    onSave(currentCoordinates);
  };

  const handleReset = () => {
    setCurrentCoordinates(initialCoordinates);
    setMapViewState({
      longitude: initialCoordinates.lng,
      latitude: initialCoordinates.lat,
      zoom: 14
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-forest-green" />
            Rediger lokationen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Move className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Træk kortet for at placere sigtekornet</p>
                <p className="text-blue-600">Klik og træk hvor som helst på kortet for at flytte sigtekornet til din ønskede placering.</p>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative">
            <div
              className={'h-64 bg-gradient-to-br from-green-50 to-green-100 relative overflow-hidden rounded-lg border-2 border-gray-200'}
              style={{ userSelect: 'none' }}
            >
              {/* Map background pattern */}
              <Map
                {...mapViewState}
                onMove={evt => {
                  setMapViewState(evt.viewState);
                  setCurrentCoordinates({
                    lat: evt.viewState.latitude,
                    lng: evt.viewState.longitude,
                  })
                }}
                mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                style={{ width: '100%', height: '100%' }}
                mapStyle={DEFAULT_MAP_CONFIG.style}
              >
                {/* Navigation Controls */}
                <NavigationControl position="top-right" />
                <GeolocateControl position="top-right" />
              </Map>

              {/* Crosshair in center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                {/* Crosshair lines */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Horizontal line */}
                  <div className="absolute w-8 h-0.5 bg-red-500"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Vertical line */}
                  <div className="absolute w-0.5 h-8 bg-red-500"></div>
                </div>
                
                {/* Center dot */}
                <div className="h-3 w-3 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                
                {/* Outer circle */}
                <div className="absolute -inset-4 border-2 border-red-400 rounded-full opacity-50"></div>
              </div>
            </div>
          </div>

          {/* Current coordinates display */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Ny GPS-lokation</span>
            </div>
            <div className="text-sm text-gray-600 font-mono">
              {currentCoordinates.lat.toFixed(6)}, {currentCoordinates.lng.toFixed(6)}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Ændring: {(currentCoordinates.lat - initialCoordinates.lat >= 0 ? '+' : '')}{(currentCoordinates.lat - initialCoordinates.lat).toFixed(6)}, {(currentCoordinates.lng - initialCoordinates.lng >= 0 ? '+' : '')}{(currentCoordinates.lng - initialCoordinates.lng).toFixed(6)}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annuller
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="px-6"
            >
              Nulstil
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-forest-green hover:bg-forest-dark"
              disabled={currentCoordinates.lat === initialCoordinates.lat && currentCoordinates.lng === initialCoordinates.lng}
            >
              Gem ændring
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}