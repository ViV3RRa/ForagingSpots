import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { MapPin, Target } from 'lucide-react';
import type { ForagingSpot, ForagingType, Coordinates } from '../lib/types';
import LocationPickerModal from './LocationPickerModal';
import { FORAGING_TYPES } from './types';
import { getForagingSpotConfig } from './icons';

interface AddEditModalProps {
  spot?: ForagingSpot;
  coordinates: Coordinates;
  onSave: (type: ForagingType, notes: string, coordinates: Coordinates) => void;
  onClose: () => void;
}

export default function AddEditModal({ spot, coordinates, onSave, onClose }: AddEditModalProps) {
  const [selectedType, setSelectedType] = useState<ForagingType>(spot?.type || 'chanterelle');
  const [notes, setNotes] = useState(spot?.notes || '');
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates>(coordinates);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedType, notes, currentCoordinates);
  };

  const handleLocationUpdate = (newCoordinates: Coordinates) => {
    setCurrentCoordinates(newCoordinates);
    setShowLocationPicker(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`h-12 w-12 ${getForagingSpotConfig(selectedType).background} rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
              {getForagingSpotConfig(selectedType, 20).icon}
            </div>
            {spot === undefined ? 'Tilføj skat' : 'Rediger skat'}
          </DialogTitle>
        </DialogHeader>

        {/* GPS Coordinates */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">GPS lokation</span>
            </div>
            {spot !== undefined && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLocationPicker(true)}
                className="text-xs px-2 py-1 h-auto"
              >
                <Target className="h-3 w-3 mr-1" />
                Rediger
              </Button>
            )}
          </div>
          <div className="text-sm text-gray-600 font-mono">
            {currentCoordinates.lat.toFixed(6)}, {currentCoordinates.lng.toFixed(6)}
          </div>
          {spot !== undefined && (currentCoordinates.lat !== coordinates.lat || currentCoordinates.lng !== coordinates.lng) && (
            <div className="mt-2 text-xs text-green-600 font-medium">
              Lokation redigeret
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* What did you find? */}
          <div className="space-y-2">
            <Label htmlFor="type">Hvad har du fundet?</Label>
            <Select value={selectedType} onValueChange={(e) => setSelectedType(e as ForagingType)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {FORAGING_TYPES.map(type => {
                  const config = getForagingSpotConfig(type, 10);
                  return (
                    <SelectItem key={type} value={type} className="flex items-center">
                      <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 ${getForagingSpotConfig(type).background} rounded-full flex items-center justify-center !text-white flex-shrink-0 shadow-sm`}>
                            {config.icon}
                          </div>
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note (valgfri)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tilføj detaljer om placeringen, mængden, størrelsen osv."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Fortryd
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {spot === undefined ? 'Gem skat' : 'Opdater skat'}
            </Button>
          </div>
        </form>

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <LocationPickerModal
            initialCoordinates={currentCoordinates}
            onSave={handleLocationUpdate}
            onClose={() => setShowLocationPicker(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
