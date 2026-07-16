import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { MonoLabel } from './ui/MonoLabel';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Edit, Trash2, Plus, X, WifiOff } from 'lucide-react';
import type { ForagingSpot, User, ForagingSpotWithPending, Coordinates } from '../lib/types';
import TypeBadge from './TypeBadge';
import { getDanishLabel } from '../utils/danishLabels';
import { getSpotImageUrls, getSpotImageThumbnailUrls, getSpotImagePlaceholderUrls } from '../lib/pocketbase';
import BlurImage from './ui/blur-image';
import { useUserLocation } from '../hooks/useUserLocation';
import { distanceToSpot } from '../utils/distance';
import ImageViewer from './ImageViewer';
import ConfirmationDialog from './ConfirmationDialog';
import LocationEditorScreen from './LocationEditorScreen';
import { PendingSyncBadge } from './PendingSyncBadge';
import { getPendingImageUrls } from '../hooks/usePendingSpots';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { outsideInteractionStartedInOverlay } from '../utils/sheetInteractOutside';
import { useScrollEdges, footerEdgeClass } from '../hooks/useScrollEdges';
import { isWebKitEngine } from '../utils/platform';
import { formatFoundDate } from '../utils/formatDate';

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
  const [isOpen, setIsOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const { ref: bodyRef, atBottom, collapsed } = useScrollEdges();
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
  // Pending spots are local object URLs with no thumb variants — no blur-up
  const placeholderUrls = !isPending && spot ? getSpotImagePlaceholderUrls(spot) : [];
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
    }
  };

  const handleUnshare = (username: string) => {
    if (isOwner && spot) {
      onUnshare(spot.id, username);
    }
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

  // Gallery tile showing a real thumbnail; opens the lightbox at its index.
  // overlayLabel renders the design's dark "+N" veil (5-photo bucket).
  const photoTile = (index: number, className: string, overlayLabel?: string) => (
    <button
      type="button"
      onClick={() => handleImageClick(index)}
      className={`relative overflow-hidden ${className}`}
    >
      <BlurImage
        src={thumbnailUrls[index]}
        placeholderSrc={placeholderUrls[index]}
        alt={`Foto ${index + 1} af ${imageCount}`}
        className="h-full w-full bg-line2"
        blurPlaceholder="sm"
        onError={(e) => {
          (e.target as HTMLImageElement).src = fullImageUrls[index];
        }}
      />
      {index === 0 && imageCount >= 2 && (
        <span className="absolute bottom-[10px] left-[10px] rounded-[20px] bg-[rgba(20,15,8,0.42)] px-[9px] py-[4px] font-mono text-[10px] tracking-[0.08em] text-white">
          {imageCount} fotos
        </span>
      )}
      {overlayLabel && (
        <span className="absolute inset-0 flex items-center justify-center bg-[rgba(20,15,8,0.5)] font-serif text-[18px] font-semibold text-white">
          {overlayLabel}
        </span>
      )}
    </button>
  );

  // Dashed "+" tile — hooks into the existing add-image flow (ImageCapture lives in the edit sheet)
  const addTile = (className: string, label?: string) => (
    <button
      type="button"
      onClick={onEdit}
      aria-label="Tilføj foto"
      className={`flex flex-col items-center justify-center gap-[4px] border-[1.5px] border-dashed border-line bg-surface text-faint transition-colors hover:border-mono hover:text-mono ${className}`}
    >
      <Plus className="size-[20px]" strokeWidth={1.9} />
      {label && <span className="font-serif text-[12px]">{label}</span>}
    </button>
  );

  // Two-state soft fade where content scrolls under the floating header
  // (see the body's comment for the coordinate translation)
  const bodyMask = collapsed
    ? 'linear-gradient(to bottom, transparent 0, transparent 45px, #000 63px)'
    : 'linear-gradient(to bottom, transparent 0, transparent 79px, #000 97px)';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          className="max-h-[88%] bg-bg sm:mx-auto sm:max-w-[520px]"
          // The lightbox and location editor are plain overlays outside this Radix
          // layer — interacting with them must not dismiss the sheet underneath
          // (see the helper for why the open-flags alone are not enough on touch)
          onInteractOutside={(e) => {
            if (imageViewerOpen || showLocationPicker || outsideInteractionStartedInOverlay(e)) {
              e.preventDefault();
            }
          }}
        >
          {spot ? (
            <>
              {/* Floating header (design variant 1a): sits over the scroll body just
                  below the drag handle and morphs into a surface pill once scrolled
                  past 12px — badge 72→46, title 26→19, pending chip slides in.
                  px-[25px]: the 1px (transparent) pill border lands the expanded
                  badge on the body's 26px content inset.
                  Pinned by its vertical CENTER (top 65 = the expanded badge's
                  centerline, so the expanded state sits exactly at the design's
                  top-28) — the badge scales around this fixed line and the pill
                  box holds a constant height on it. */}
              <div className="pointer-events-none absolute inset-x-0 top-[65px] z-[5] -translate-y-1/2 px-[25px]">
                {/* The pill's box is CONSTANT height (46 + 14 padding + border) in
                    both states — it is invisible when expanded, so it simply fades
                    in at its final size. No vertical dimension is ever animated in
                    layout: WebKit runs layout transitions on the main thread and
                    the badge scale on the compositor, and reconciles the two with
                    a visible size-snap at transitionend (the iOS settle jerk). The
                    only vertical motion left is the compositor-driven badge scale. */}
                <div
                  className={`pointer-events-auto flex items-center rounded-full border py-[7px] pr-[16px] ${
                    collapsed
                      ? 'gap-[12px] border-line bg-surface pl-[7px] shadow-[0_3px_10px_-4px_rgba(20,15,8,0.18)]'
                      : 'gap-[16px] border-transparent bg-transparent pl-0'
                  }`}
                  style={{
                    transition:
                      'background-color .22s ease, border-color .22s ease, box-shadow .22s ease, padding-left .22s ease, gap .22s ease',
                  }}
                >
                  {/* Badge box: fixed 46px tall; only its WIDTH animates (it drives
                      the title's horizontal slide). The badge morph is engine-
                      dependent: WebKit re-rasterizes scaled layers when the
                      animation ends, popping the settled pill by ~1px — so it gets
                      a cross-fade between two natively-rendered badges on
                      permanently-composited (will-change) layers, which never
                      re-rasterize. Blink/Gecko render the continuous transform
                      scale cleanly and keep the smoother geometric morph. */}
                  <div
                    className="relative h-[46px] shrink-0"
                    style={{ width: collapsed ? 46 : 72, transition: 'width .22s ease' }}
                  >
                    {isWebKitEngine ? (
                      <>
                        <TypeBadge
                          type={spot.type}
                          size={72}
                          className="absolute left-1/2 top-1/2 -ml-[36px] -mt-[36px] will-change-[opacity]"
                          style={{ opacity: collapsed ? 0 : 1, transition: 'opacity .22s ease' }}
                        />
                        <TypeBadge
                          type={spot.type}
                          size={46}
                          className="absolute left-1/2 top-1/2 -ml-[23px] -mt-[23px] will-change-[opacity]"
                          style={{ opacity: collapsed ? 1 : 0, transition: 'opacity .22s ease' }}
                        />
                      </>
                    ) : (
                      <TypeBadge
                        type={spot.type}
                        size={72}
                        className="absolute left-1/2 top-1/2 -ml-[36px] -mt-[36px]"
                        style={{
                          transform: collapsed ? 'scale(0.639)' : 'scale(1)',
                          transition: 'transform .22s ease',
                        }}
                      />
                    )}
                  </div>
                  {/* Title: same engine split (font-size animation re-rasterizes
                      text at settle on WebKit). On WebKit the 26px title stays in
                      flow so the column height is constant and a 19px twin fades
                      in over it; elsewhere the font-size animates directly. */}
                  <div className="relative min-w-0 flex-1">
                    {isWebKitEngine ? (
                      <>
                        <SheetTitle
                          className="truncate text-[26px] font-semibold leading-[1.15] text-ink will-change-[opacity]"
                          style={{ opacity: collapsed ? 0 : 1, transition: 'opacity .22s ease' }}
                        >
                          {getDanishLabel(spot.type)}
                        </SheetTitle>
                        <div
                          aria-hidden
                          className="absolute inset-x-0 top-1/2 -translate-y-1/2 truncate font-serif text-[19px] font-semibold leading-[1.15] text-ink will-change-[opacity]"
                          style={{ opacity: collapsed ? 1 : 0, transition: 'opacity .22s ease' }}
                        >
                          {getDanishLabel(spot.type)}
                        </div>
                      </>
                    ) : (
                      <SheetTitle
                        className="truncate font-semibold leading-[1.15] text-ink"
                        style={{ fontSize: collapsed ? 19 : 26, transition: 'font-size .22s ease' }}
                      >
                        {getDanishLabel(spot.type)}
                      </SheetTitle>
                    )}
                    {/* Long sync badge floats below the title (over the body's
                        masked zone) instead of stacking in flow — in-flow it would
                        make the pill's height state-dependent again */}
                    {isPending && (
                      <div
                        className="pointer-events-none absolute left-0 top-full pt-[7px]"
                        style={{ opacity: collapsed ? 0 : 1, transition: 'opacity .18s ease' }}
                      >
                        <PendingSyncBadge hasError={hasError} long className="whitespace-nowrap" />
                      </div>
                    )}
                  </div>
                  {isPending && (
                    <div
                      className="shrink-0 overflow-hidden"
                      style={{
                        maxWidth: collapsed ? 150 : 0,
                        opacity: collapsed ? 1 : 0,
                        transition: 'max-width .22s ease, opacity .18s ease',
                      }}
                    >
                      <PendingSyncBadge hasError={hasError} className="whitespace-nowrap" />
                    </div>
                  )}
                </div>
              </div>

              {/* Scroll body under the floating header. Mask stops are the design's
                  sheet-relative 100/118 (expanded) and 66/84 (collapsed) shifted by
                  the 21px drag-handle strip above this box; pt lands the first
                  content block (mt-20) right at the mask's end. */}
              <div
                ref={bodyRef}
                className="min-h-[200px] flex-1 overflow-y-auto overflow-x-hidden px-[26px] pb-[26px] pt-[79px]"
                style={{
                  WebkitMaskImage: bodyMask,
                  maskImage: bodyMask,
                }}
              >

              {/* Photo gallery buckets (design g0–g5): the count chip carries 3rd/4th
                  photos; at max (5) the third tile gets a "+N" overlay instead of an add tile */}
              {(imageCount > 0 || canAddImage) && (
                <div className="mt-[20px]">
                  {imageCount === 0 ? (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="flex h-[120px] w-full flex-col items-center justify-center gap-[6px] rounded-[14px] border-[1.5px] border-dashed border-line bg-surface text-muted transition-colors hover:border-mono hover:text-mono"
                    >
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 8h3l1.5-2h9L18 8h3v11H3z" />
                        <circle cx="12" cy="13" r="3.2" />
                        <path d="M12 11v4M10 13h4" />
                      </svg>
                      <span className="font-serif text-[14.5px]">Tilføj foto</span>
                    </button>
                  ) : (
                    <div className="flex h-[130px] gap-[8px]">
                      {photoTile(0, 'flex-[1.7] rounded-[14px]')}
                      {imageCount === 1 ? (
                        canAddImage && addTile('flex-1 rounded-[12px]', 'Foto')
                      ) : (
                        <div className="flex flex-1 flex-col gap-[8px]">
                          {photoTile(1, 'flex-1 rounded-[12px]')}
                          {imageCount >= MAX_IMAGES
                            ? photoTile(2, 'flex-1 rounded-[12px]', `+${imageCount - 3}`)
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

              {/* Sharing section: user rows / "Kun dig" empty card + always-visible @-input */}
              {isOwner && (
                <div className="mt-[24px]">
                  <div className="mb-[12px] flex items-center justify-between">
                    <MonoLabel>Delt med</MonoLabel>
                    {sharedWith.length > 0 && (
                      <span className="font-mono text-[11px] text-faint">
                        {sharedWith.length === 1 ? '1 person' : `${sharedWith.length} personer`}
                      </span>
                    )}
                  </div>

                  {sharedWith.length > 0 ? (
                    <div className="mb-[12px] flex flex-col gap-[8px]">
                      {sharedWith.map((username) => (
                        <div
                          key={username}
                          className="flex items-center gap-[12px] rounded-[13px] border border-line bg-surface px-[12px] py-[9px]"
                        >
                          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-brand font-serif text-[14px] font-semibold text-brand-ink">
                            {username.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-serif text-[15.5px] text-ink">
                            @{username}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnshare(username)}
                            aria-label={`Fjern deling med ${username}`}
                            className="flex size-[28px] shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-line2 hover:text-accent"
                          >
                            <X className="size-[15px]" strokeWidth={1.9} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-[12px] rounded-[13px] border border-dashed border-line bg-surface p-[14px] text-center">
                      <div className="font-serif text-[14.5px] text-ink2">Kun dig</div>
                      <div className="mt-[2px] text-[12.5px] text-muted">
                        Dette fund er privat. Del det med en ven for at give adgang.
                      </div>
                    </div>
                  )}

                  <div className="flex gap-[8px]">
                    <div className="flex h-[48px] min-w-0 flex-1 items-center gap-[8px] rounded-[13px] border border-line bg-surface px-[14px]">
                      <span className="font-serif text-[16px] text-mono">@</span>
                      <input
                        type="text"
                        value={shareUsername}
                        onChange={(e) => setShareUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleShare();
                        }}
                        placeholder="Del med brugernavn…"
                        aria-label="Del med brugernavn"
                        className="min-w-0 flex-1 bg-transparent font-serif text-[15px] text-ink outline-none placeholder:text-muted"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={!shareUsername.trim()}
                      aria-label="Del fund"
                      className="flex size-[48px] shrink-0 items-center justify-center rounded-[13px] bg-brand text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <Plus className="size-[20px]" strokeWidth={1.9} />
                    </button>
                  </div>
                </div>
              )}

              {/* Offline-lock notice for synced spots (amber offline palette, shared with 3.2) */}
              {isOwner && isEditDisabled && (
                <div className="mt-[20px] flex items-start gap-[11px] rounded-[14px] border border-offline-border bg-offline-bg px-[14px] py-[12px]">
                  <WifiOff className="mt-[1px] size-[18px] shrink-0 text-offline-ink" strokeWidth={1.6} />
                  <span className="text-[12.5px] leading-[1.5] text-offline-ink">
                    Du er offline. Redigér og slet er ikke tilgængelige for synkroniserede fund.
                  </span>
                </div>
              )}

              {/* Non-owner view */}
              {!isOwner && (
                <div className="mt-[24px] rounded-[14px] border border-line bg-surface px-[16px] py-[14px] text-center text-[13.5px] text-ink2">
                  Denne lokation er delt med dig
                </div>
              )}
              </div>

              {/* Pinned action footer: wide primary + square delete (the share icon
                  moved out — the share section lives in the body); dims to .5 and
                  goes inert when offline-locked (buttons keep disabled semantics, so
                  cancel their own disabled:opacity to avoid double dimming). The top
                  hairline/shadow show only while content remains below. */}
              {isOwner && (
                <div className={`shrink-0 px-[24px] pb-[24px] pt-[14px] ${footerEdgeClass(atBottom)}`}>
                  <div className={`flex gap-[10px] ${isEditDisabled ? 'opacity-50' : ''}`}>
                    <Button
                      variant="brand"
                      disabled={isEditDisabled}
                      onClick={onEdit}
                      className="min-w-0 flex-1 disabled:opacity-100"
                    >
                      <Edit />
                      Redigér
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon-lg"
                      disabled={isEditDisabled}
                      onClick={handleDeleteClick}
                      aria-label="Slet fund"
                      className="text-accent hover:text-accent disabled:opacity-100"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Image Viewer */}
      {imageCount > 0 && spot && (
        <ImageViewer
          images={fullImageUrls.map(url => ({ url }))}
          thumbnailUrls={thumbnailUrls}
          placeholderUrls={placeholderUrls}
          initialIndex={selectedImageIndex}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          spotName={getDanishLabel(spot.type)}
          spotDate={formatFoundDate(spot.created)}
        />
      )}

      {/* Fullscreen location editor */}
      {showLocationPicker && spot && (
        <LocationEditorScreen
          initialCoordinates={spot.coordinates}
          type={spot.type}
          // Standalone move flow: backing out with a moved, unconfirmed pin
          // discards it — guard that path (issues/004 §8). The add/edit sheet's
          // editor stays unguarded (backing out returns to the sheet).
          guardDiscard
          onSave={handleLocationSave}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Slet dette fund?"
        subjectName={spot ? getDanishLabel(spot.type) : undefined}
        description="fjernes permanent. Dette kan ikke fortrydes."
        confirmText="Slet fund"
        cancelText="Annullér"
        isLoading={isDeleting}
      />
    </>
  );
}
