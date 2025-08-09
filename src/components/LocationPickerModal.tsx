import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { MapPin, Move, Target } from 'lucide-react';
import type { Coordinates } from '../lib/types';
import Map, { NavigationControl } from 'react-map-gl';
import { DEFAULT_MAP_CONFIG, MAPBOX_ACCESS_TOKEN } from '../utils/mapbox';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface LocationPickerModalProps {
  initialCoordinates: Coordinates;
  onSave: (coordinates: Coordinates) => void;
  onClose: () => void;
}

export default function LocationPickerModal({ initialCoordinates, onSave, onClose }: LocationPickerModalProps) {
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates>(initialCoordinates);
  const [validationErrors, setValidationErrors] = useState({ lat: false, lng: false });

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

  const validateCoordinate = (value: string, type: 'lat' | 'lng'): boolean => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    
    if (type === 'lat') {
      return num >= -90 && num <= 90;
    } else {
      return num >= -180 && num <= 180;
    }
  };

  const handleManualCoordinateChange = (value: string, type: 'lat' | 'lng') => {
    // Real-time validation
    const isValid = validateCoordinate(value, type);
    setValidationErrors(prev => ({ ...prev, [type]: !isValid && value !== '' }));

    // Update coordinates if both values are valid
    const currentLat = type === 'lat' ? value : currentCoordinates.lat.toString();
    const currentLng = type === 'lng' ? value : currentCoordinates.lng.toString();
    
    const latValid = validateCoordinate(currentLat, 'lat');
    const lngValid = validateCoordinate(currentLng, 'lng');
    
    if (latValid && lngValid && currentLat !== '' && currentLng !== '') {
      const newCoords = {
        lat: parseFloat(currentLat),
        lng: parseFloat(currentLng)
      };
      setCurrentCoordinates(newCoords);
      setMapViewState(prev => ({ ...prev, latitude: newCoords.lat, longitude: newCoords.lng }));
    }
  };

  const isValidForSaving = !validationErrors.lat && !validationErrors.lng &&
    validateCoordinate(currentCoordinates.lat.toString(), 'lat') &&
    validateCoordinate(currentCoordinates.lng.toString(), 'lng');

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

          <div className="space-y-4 bg-muted/20 rounded-lg p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Ny GPS-lokation</span>
            </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-sm font-medium">
                    Breddegrad
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    value={currentCoordinates.lat}
                    onChange={(e) => handleManualCoordinateChange(e.target.value, 'lat')}
                    placeholder="60.1695"
                    className={`font-mono ${validationErrors.lat ? 'border-destructive focus:border-destructive' : 'border-forest-green/20 focus:border-forest-green'}`}
                  />
                  {validationErrors.lat && (
                    <p className="text-xs text-destructive">
                      Venligst indtast en gyldig breddegrad mellem -90 og 90
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-sm font-medium">
                    Længdegrad
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    value={currentCoordinates.lng}
                    onChange={(e) => handleManualCoordinateChange(e.target.value, 'lng')}
                    placeholder="24.9354"
                    className={`font-mono ${validationErrors.lng ? 'border-destructive focus:border-destructive' : 'border-forest-green/20 focus:border-forest-green'}`}
                  />
                  {validationErrors.lng && (
                    <p className="text-xs text-destructive">
                      Venligst indtast en gyldig længdegrad mellem -180 og 180
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Ændring: {(currentCoordinates.lat - initialCoordinates.lat >= 0 ? '+' : '')}{(currentCoordinates.lat - initialCoordinates.lat).toFixed(6)}, {(currentCoordinates.lng - initialCoordinates.lng >= 0 ? '+' : '')}{(currentCoordinates.lng - initialCoordinates.lng).toFixed(6)}
              </div>
              
              {isValidForSaving && (
                <div className="text-xs text-forest-green bg-forest-green/10 p-2 rounded border border-forest-green/20">
                  ✓ Koordinaterne er gyldige og klar til at gemme
                </div>
              )}
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