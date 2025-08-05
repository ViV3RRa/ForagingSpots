import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Camera, MapPin, Target } from 'lucide-react';
import type { ForagingSpot, ForagingType, Coordinates } from '../lib/types';
import LocationPickerModal from './LocationPickerModal';
import { FORAGING_TYPES } from './types';
import { getForagingSpotConfig } from './icons';
import ImageCapture, { type SpotImage } from './ImageCapture';

import { getSpotImageThumbnailUrls } from '../lib/pocketbase';

interface AddEditModalProps {
  spot?: ForagingSpot;
  coordinates: Coordinates;
  onSave: (type: ForagingType, notes: string, coordinates: Coordinates, newImages: File[], existingImageFilenames?: string[]) => void;
  onClose: () => void;
}

export default function AddEditModal({ spot, coordinates, onSave, onClose }: AddEditModalProps) {
  const [selectedType, setSelectedType] = useState<ForagingType>(spot?.type || 'chanterelle');
  const [notes, setNotes] = useState(spot?.notes || '');
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates>(coordinates);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [images, setImages] = useState<SpotImage[]>(() => {
    // Initialize images from existing spot
    if (spot?.images && spot.images.length > 0) {
      const existingImageUrls = getSpotImageThumbnailUrls(spot, { width: 200, height: 200 });
      return spot.images.map((filename, index) => ({
        id: `existing-${index}`,
        url: existingImageUrls[index] || '',
        filename: filename, // Store the original filename
        isExisting: true, // Mark as existing server image
        timestamp: new Date(spot.updated), // Use spot's updated date as fallback
      }));
    }
    return [];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract files from images (only new images that have files)
    const newImageFiles = images
      .filter(img => img.file && !img.isExisting)
      .map(img => img.file!)
      .filter(file => file instanceof File);
    
    // Extract existing image filenames that should be kept
    const existingImageFilenames = images
      .filter(img => img.isExisting && img.filename)
      .map(img => img.filename!);
    
    console.log('Submitting with:', {
      newFiles: newImageFiles.length,
      existingFilenames: existingImageFilenames
    });
    
    onSave(selectedType, notes, currentCoordinates, newImageFiles, existingImageFilenames);
  };

  const handleLocationUpdate = (newCoordinates: Coordinates) => {
    setCurrentCoordinates(newCoordinates);
    setShowLocationPicker(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm`} style={getForagingSpotConfig(selectedType).background}>
              {getForagingSpotConfig(selectedType, 20).icon}
            </div>
            {spot === undefined ? 'Tilføj skat' : 'Rediger skat'}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 min-h-0">
          <div className="space-y-6 pb-6">
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
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center !text-white flex-shrink-0 shadow-sm`} style={getForagingSpotConfig(type).background}>
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

              {/* Images */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-forest-green" />
                  Billeder
                </Label>
                <ImageCapture
                  images={images}
                  onImagesChange={setImages}
                  maxImages={5}
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
          </div>
        </div>

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
