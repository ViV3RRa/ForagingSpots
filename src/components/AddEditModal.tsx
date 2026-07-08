import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { MonoLabel } from './ui/MonoLabel';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { X } from 'lucide-react';
import type { ForagingSpot, ForagingType, Coordinates, ForagingSpotWithPending } from '../lib/types';
import LocationEditorScreen from './LocationEditorScreen';
import { FORAGING_TYPES } from './types';
import { getForagingSpotConfig } from './icons';
import { getDanishLabel } from '../utils/danishLabels';
import ImageCapture, { type SpotImage } from './ImageCapture';

import { getSpotImageThumbnailUrls } from '../lib/pocketbase';
import { getPendingImages } from '../hooks/usePendingSpots';

interface AddEditModalProps {
  spot?: ForagingSpot;
  coordinates: Coordinates;
  onSave: (type: ForagingType, notes: string, coordinates: Coordinates, newImages: File[], existingImageFilenames?: string[]) => void;
  onClose: () => void;
}

const formatCoordinates = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'Ø' : 'V'}`;

export default function AddEditModal({ spot, coordinates, onSave, onClose }: AddEditModalProps) {
  const isEdit = spot !== undefined;
  const [selectedType, setSelectedType] = useState<ForagingType>(spot?.type || 'chanterelle');
  const [notes, setNotes] = useState(spot?.notes || '');
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates>(coordinates);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [manuallyPicked, setManuallyPicked] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Check if this is a pending spot
  const isPendingSpot = spot?.id?.startsWith('pending-') || (spot as ForagingSpotWithPending)?._pending;

  const [images, setImages] = useState<SpotImage[]>(() => {
    // Initialize images from existing server spot (not pending)
    if (!isPendingSpot && spot?.images && spot.images.length > 0) {
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

  // Load images from IndexedDB for pending spots
  useEffect(() => {
    if (isPendingSpot && spot?.id) {
      getPendingImages(spot.id).then((files) => {
        const pendingImages: SpotImage[] = files.map((file, index) => ({
          id: `pending-${index}`,
          url: URL.createObjectURL(file),
          file: file, // Keep the file reference for re-submission
          isExisting: false, // These are "new" files that need to be uploaded when synced
          timestamp: new Date(),
        }));
        setImages(pendingImages);
      });
    }

    // Cleanup object URLs on unmount
    return () => {
      if (isPendingSpot) {
        images.forEach(img => {
          if (img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
          }
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.id, isPendingSpot]);

  const handleClose = () => {
    setIsOpen(false);
    // Wait for the sheet's exit animation before unmounting
    setTimeout(() => {
      onClose();
    }, 300);
  };

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
    setManuallyPicked(true);
    setShowLocationPicker(false);
  };

  // "Nuværende" while the add flow still holds the live GPS fix; otherwise
  // indicate where the coordinates came from
  const locationHint = manuallyPicked ? 'Valgt manuelt' : isEdit ? 'Gemt placering' : 'Nuværende';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <SheetContent
          side="bottom"
          handle={false}
          className="max-h-[92%] bg-bg sm:mx-auto sm:max-w-[520px]"
        >
          {/* Header: Spectral 23px title + 36px circular close button */}
          <div className="flex shrink-0 items-center justify-between border-b border-line2 px-[24px] pb-[14px] pt-[20px]">
            <SheetTitle className="text-[23px] font-semibold leading-none text-ink">
              {isEdit ? 'Redigér fund' : 'Nyt fund'}
            </SheetTitle>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Luk"
              className="flex size-[36px] shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:bg-line2"
            >
              <X className="size-[16px]" strokeWidth={1.9} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            {/* Scrollable content — the CTA lives inside so it stays reachable with the keyboard open */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-[24px] pb-[24px] pt-[20px]">
              {/* Type grid: 4 columns, square gradient tiles */}
              <MonoLabel className="mb-[12px] block">Vælg art</MonoLabel>
              <div className="grid grid-cols-4 gap-[12px]">
                {FORAGING_TYPES.map((type) => {
                  const config = getForagingSpotConfig(type, 34);
                  const selected = type === selectedType;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      aria-pressed={selected}
                      className="flex flex-col items-center gap-[6px]"
                    >
                      <div
                        className="flex aspect-square w-full items-center justify-center rounded-[16px]"
                        style={{
                          ...config.background,
                          border: `3px solid ${selected ? 'var(--accent)' : 'transparent'}`,
                          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.3)',
                        }}
                      >
                        {config.icon}
                      </div>
                      <span className="text-center text-[10.5px] leading-[1.15] text-ink2">
                        {getDanishLabel(type)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Placering: surface field with pulsing brand dot, opens the location picker */}
              <MonoLabel className="mb-[8px] mt-[24px] block">Placering</MonoLabel>
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="flex h-[52px] w-full items-center gap-[10px] rounded-[14px] border border-line bg-surface px-[15px] text-left transition-colors hover:border-mono"
              >
                <span className="size-[9px] shrink-0 animate-ss-pulse rounded-full bg-brand" />
                <span className="truncate font-mono text-[13px] text-ink">
                  {formatCoordinates(currentCoordinates.lat, currentCoordinates.lng)}
                </span>
                <span className="ml-auto shrink-0 font-serif text-[12px] text-mono">{locationHint}</span>
              </button>

              {/* Noter */}
              <label htmlFor="notes" className="mb-[8px] mt-[22px] block">
                <MonoLabel>Noter</MonoLabel>
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fx: under birketræerne, tre store eksemplarer…"
              />

              {/* Foto */}
              <div className="mt-[16px]">
                <ImageCapture
                  images={images}
                  onImagesChange={setImages}
                  maxImages={5}
                />
              </div>

              {/* Accent CTA */}
              <Button type="submit" size="lg" className="mt-[20px] w-full">
                {isEdit ? 'Gem ændringer' : 'Gem fund'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Fullscreen location editor */}
      {showLocationPicker && (
        <LocationEditorScreen
          initialCoordinates={currentCoordinates}
          type={selectedType}
          onSave={handleLocationUpdate}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </>
  );
}
