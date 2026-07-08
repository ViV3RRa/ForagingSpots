import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MonoLabel } from './ui/MonoLabel';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Edit, Trash2, Share, Plus, X, WifiOff } from 'lucide-react';
import type { ForagingSpot, User, ForagingSpotWithPending, Coordinates } from '../lib/types';
import TypeBadge from './TypeBadge';
import { getDanishLabel } from '../utils/danishLabels';
import { getSpotImageUrls, getSpotImageThumbnailUrls } from '../lib/pocketbase';
import { useUserLocation } from '../hooks/useUserLocation';
import { distanceToSpot } from '../utils/distance';
import ImageViewer from './ImageViewer';
import ConfirmationDialog from './ConfirmationDialog';
import LocationEditorScreen from './LocationEditorScreen';
import { PendingSyncBadge } from './PendingSyncBadge';
import { getPendingImageUrls } from '../hooks/usePendingSpots';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface PinDetailsDrawerProps {
  spot: ForagingSpot | null;
  currentUser: User;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: (spotId: string, username: string) => void;
  onUnshare: (spotId: string, username: string) => void;
  onUpdateLocation: (spotId: string, coordinates: Coordinates) => void;
}

const MAX_IMAGES = 5;

const formatCoordinates = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'Ø' : 'V'}`;

// The design's "2. okt 2026" format (da-DK month abbreviation without the trailing dot)
const formatFoundDate = (iso: string) => {
  const date = new Date(iso);
  const month = date.toLocaleDateString('da-DK', { month: 'short' }).replace('.', '');
  return `${date.getDate()}. ${month} ${date.getFullYear()}`;
};

export default function PinDetailsDrawer({
  spot,
  currentUser,
  onClose,
  onEdit,
  onDelete,
  onShare,
  onUnshare,
  onUpdateLocation
}: PinDetailsDrawerProps) {
  const [shareUsername, setShareUsername] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const shareSectionRef = useRef<HTMLDivElement>(null);
  const { isOnline } = useNetworkStatus();
  const { position } = useUserLocation();

  // Check if spot is pending (offline)
  const spotWithPending = spot as ForagingSpotWithPending | null;
  const isPending = spotWithPending?._pending;

  // Disable edit/delete for server spots when offline
  const isEditDisabled = !isOnline && !isPending;
  const hasError = !!spotWithPending?._syncError;

  const isOwner = spot?.user === currentUser.id || isPending; // Pending spots are always "owned"
  const sharedWith = spot?.sharedWith || [];

  const thumbnailUrls = isPending ? pendingImageUrls : spot ? getSpotImageThumbnailUrls(spot) : [];
  const fullImageUrls = isPending ? pendingImageUrls : spot ? getSpotImageUrls(spot) : [];
  const imageCount = thumbnailUrls.length;
  const canAddImage = isOwner && !isEditDisabled && imageCount < MAX_IMAGES;

  const distance = spot ? distanceToSpot(position, spot.coordinates) : null;

  // Load pending images from IndexedDB
  useEffect(() => {
    if (isPending && spot?.id) {
      getPendingImageUrls(spot.id).then(urls => {
        setPendingImageUrls(urls);
      });
    } else {
      setPendingImageUrls([]);
    }

    // Cleanup object URLs when component unmounts or spot changes
    return () => {
      pendingImageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.id, isPending]);

  // Handle opening/closing with proper animation timing
  useEffect(() => {
    if (spot !== null) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setIsSharing(false);
      setShareUsername('');
    }
  }, [spot]);

  const handleClose = () => {
    setIsOpen(false);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleShare = () => {
    if (shareUsername.trim() && isOwner && spot) {
      onShare(spot.id, shareUsername.trim());
      setShareUsername('');
      setIsSharing(false);
    }
  };

  const handleUnshare = (username: string) => {
    if (isOwner && spot) {
      onUnshare(spot.id, username);
    }
  };

  const handleShareButtonClick = () => {
    setIsSharing(true);
    // Scroll after the input has rendered
    setTimeout(() => {
      shareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!spot) return;

    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirmation(false);
      // onDelete should handle closing the drawer
    } catch (error) {
      console.error('Error deleting spot:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
  };

  const handleLocationSave = (coordinates: Coordinates) => {
    if (spot) {
      onUpdateLocation(spot.id, coordinates);
    }
    setShowLocationPicker(false);
  };

  // Gallery tile showing a real thumbnail; opens the lightbox
  const photoTile = (index: number, className: string) => (
    <button
      type="button"
      onClick={() => handleImageClick(index)}
      className={`relative overflow-hidden bg-line2 ${className}`}
    >
      <img
        src={thumbnailUrls[index]}
        alt={`Foto ${index + 1} af ${imageCount}`}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = fullImageUrls[index];
        }}
      />
      {index === 0 && imageCount >= 3 && (
        <span className="absolute bottom-[10px] left-[10px] rounded-[20px] bg-[rgba(20,15,8,0.42)] px-[9px] py-[4px] font-mono text-[10px] tracking-[0.08em] text-white">
          {imageCount} fotos
        </span>
      )}
    </button>
  );

  // Dashed "+" tile — hooks into the existing add-image flow (ImageCapture lives in the edit sheet)
  const addTile = (className: string, withLabel = false) => (
    <button
      type="button"
      onClick={onEdit}
      disabled={isEditDisabled}
      aria-label="Tilføj foto"
      className={`flex items-center justify-center gap-[8px] border border-dashed border-line bg-surface text-faint transition-colors hover:border-mono hover:text-mono disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      <Plus className="size-[22px]" strokeWidth={1.8} />
      {withLabel && <span className="font-mono text-[11px] uppercase tracking-[0.1em]">Tilføj foto</span>}
    </button>
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          className="max-h-[88%] bg-bg sm:mx-auto sm:max-w-[520px]"
        >
          {spot ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-[26px] pb-[26px] pt-[14px]">
              {/* Header: 72px badge + Spectral 26px name */}
              <div className="flex items-center gap-[16px]">
                <TypeBadge type={spot.type} size={72} />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-[26px] font-semibold leading-[1.15] text-ink">
                    {getDanishLabel(spot.type)}
                  </SheetTitle>
                  {isPending && (
                    <div className="mt-[6px]">
                      <PendingSyncBadge hasError={hasError} />
                    </div>
                  )}
                </div>
              </div>

              {/* Photo gallery: large tile + column of small tiles per the design */}
              {(imageCount > 0 || canAddImage) && (
                <div className="mt-[20px]">
                  {imageCount === 0 ? (
                    addTile('h-[96px] w-full rounded-[14px]', true)
                  ) : (
                    <div className="flex h-[130px] gap-[8px]">
                      {photoTile(0, 'flex-[1.7] rounded-[14px]')}
                      {imageCount === 1 ? (
                        canAddImage && addTile('flex-1 rounded-[12px]')
                      ) : (
                        <div className="flex flex-1 flex-col gap-[8px]">
                          {photoTile(1, 'flex-1 rounded-[12px]')}
                          {imageCount >= 3
                            ? photoTile(2, 'flex-1 rounded-[12px]')
                            : canAddImage && addTile('flex-1 rounded-[12px]')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Meta rows: Space Mono labels, hairline dividers */}
              <div className="mt-[22px]">
                {isOwner && !isEditDisabled ? (
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="flex w-full items-center justify-between gap-[12px] border-b border-line2 py-[13px] text-left"
                  >
                    <MonoLabel>Koordinater</MonoLabel>
                    <span className="flex min-w-0 items-center gap-[8px]">
                      <span className="truncate font-mono text-[13px] text-ink">
                        {formatCoordinates(spot.coordinates.lat, spot.coordinates.lng)}
                      </span>
                      <span className="shrink-0 font-serif text-[12px] text-accent">Redigér ›</span>
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-[12px] border-b border-line2 py-[13px]">
                    <MonoLabel>Koordinater</MonoLabel>
                    <span className="truncate font-mono text-[13px] text-ink">
                      {formatCoordinates(spot.coordinates.lat, spot.coordinates.lng)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-[12px] border-b border-line2 py-[13px]">
                  <MonoLabel>Fundet</MonoLabel>
                  <span className="font-serif text-[15px] text-ink">{formatFoundDate(spot.created)}</span>
                </div>
                {distance && (
                  <div className="flex items-center justify-between gap-[12px] border-b border-line2 py-[13px]">
                    <MonoLabel>Afstand</MonoLabel>
                    <span className="font-serif text-[15px] text-ink">{distance}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {spot.notes && (
                <div className="mt-[20px]">
                  <MonoLabel>Noter</MonoLabel>
                  <p className="mt-[7px] font-serif text-[15.5px] leading-[1.6] text-ink2">{spot.notes}</p>
                </div>
              )}

              {/* Offline notice for synced spots */}
              {isOwner && isEditDisabled && (
                <div className="mt-[20px] flex items-start gap-[10px] rounded-[14px] border border-line bg-surface px-[14px] py-[12px] text-[13px] leading-[1.5] text-ink2">
                  <WifiOff className="mt-[2px] size-[16px] shrink-0 text-muted" />
                  <span>Du er offline. Redigér og slet er ikke tilgængelige for synkroniserede fund.</span>
                </div>
              )}

              {/* Action row: wide primary + 52px square icon buttons */}
              {isOwner && (
                <>
                  <div className="mt-[26px] flex gap-[10px]">
                    <Button
                      variant="brand"
                      disabled={isEditDisabled}
                      onClick={onEdit}
                      className="min-w-0 flex-1"
                    >
                      <Edit />
                      Redigér fund
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon-lg"
                      onClick={handleShareButtonClick}
                      aria-label="Del fund"
                    >
                      <Share />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon-lg"
                      disabled={isEditDisabled}
                      onClick={handleDeleteClick}
                      aria-label="Slet fund"
                      className="text-accent hover:text-accent"
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  {/* Sharing */}
                  <div ref={shareSectionRef} className="mt-[26px]">
                    <div className="flex items-center justify-between">
                      <MonoLabel>Delt med</MonoLabel>
                      <button
                        type="button"
                        onClick={() => setIsSharing(!isSharing)}
                        className="font-serif text-[14px] font-semibold text-accent"
                      >
                        {isSharing ? 'Annullér' : '+ Tilføj bruger'}
                      </button>
                    </div>

                    {isSharing && (
                      <div className="mt-[12px] flex gap-[8px]">
                        <Input
                          type="text"
                          value={shareUsername}
                          onChange={(e) => setShareUsername(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleShare();
                          }}
                          placeholder="brugernavn"
                          className="min-w-0 flex-1"
                          autoFocus
                        />
                        <Button
                          variant="brand"
                          disabled={!shareUsername.trim()}
                          onClick={handleShare}
                          className="h-[54px] px-[20px]"
                        >
                          Del
                        </Button>
                      </div>
                    )}

                    {sharedWith.length > 0 ? (
                      <div className="mt-[12px] space-y-[8px]">
                        {sharedWith.map((username) => (
                          <div
                            key={username}
                            className="flex items-center justify-between rounded-[14px] border border-line bg-surface px-[16px] py-[11px]"
                          >
                            <span className="truncate text-[14.5px] font-medium text-ink">{username}</span>
                            <button
                              type="button"
                              onClick={() => handleUnshare(username)}
                              aria-label={`Fjern deling med ${username}`}
                              className="flex size-[30px] shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-line2 hover:text-accent"
                            >
                              <X className="size-[15px]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isSharing && (
                        <p className="mt-[12px] text-[13.5px] text-muted">
                          Dette fund er privat — ikke delt med nogen.
                        </p>
                      )
                    )}
                  </div>
                </>
              )}

              {/* Non-owner view */}
              {!isOwner && (
                <div className="mt-[24px] rounded-[14px] border border-line bg-surface px-[16px] py-[14px] text-center text-[13.5px] text-ink2">
                  Denne lokation er delt med dig
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Image Viewer */}
      {imageCount > 0 && spot && (
        <ImageViewer
          images={fullImageUrls.map(url => ({ url }))}
          thumbnailUrls={thumbnailUrls}
          initialIndex={selectedImageIndex}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          spotName={getDanishLabel(spot.type)}
          spotDate={formatFoundDate(spot.created)}
          spotCoordinates={formatCoordinates(spot.coordinates.lat, spot.coordinates.lng)}
        />
      )}

      {/* Fullscreen location editor */}
      {showLocationPicker && spot && (
        <LocationEditorScreen
          initialCoordinates={spot.coordinates}
          type={spot.type}
          onSave={handleLocationSave}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Er du sikker?"
        description={`Er du sikker på, at du vil slette denne skat?`}
        confirmText="Slet permanent"
        cancelText="Annuller"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  );
}
