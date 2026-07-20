import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { MonoLabel } from './ui/MonoLabel';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Plus, Search, X } from 'lucide-react';
import type { ForagingSpot, ForagingType, Coordinates, ForagingSpotWithPending } from '../lib/types';
import LocationEditorScreen from './LocationEditorScreen';
import DiscardChangesDialog from './DiscardChangesDialog';
import { FORAGING_TYPES } from './types';
import { getForagingSpotConfig } from './icons';
import { getDanishLabel } from '../utils/danishLabels';
import ImageCapture, { type SpotImage } from './ImageCapture';

import { getSpotImageThumbnailUrls } from '../lib/pocketbase';
import { getPendingImages } from '../hooks/usePendingSpots';
import { useUserLocation } from '../hooks/useUserLocation';
import { outsideInteractionStartedInOverlay } from '../utils/sheetInteractOutside';
import { useScrollEdges, headerEdgeClass, footerEdgeClass, topMaskStyle } from '../hooks/useScrollEdges';
import { useHistoryLayer } from '../hooks/useHistoryLayer';

interface AddEditModalProps {
  spot?: ForagingSpot;
  /** null → no GPS fix yet: the Placering section shows the no-location warning
      and the save button stays disabled until a location exists (3.8). */
  coordinates: Coordinates | null;
  /** Where the location editor opens when there are no coordinates yet
      (typically the map's current center). */
  editorFallbackCenter?: Coordinates;
  onSave: (type: ForagingType, notes: string, coordinates: Coordinates, newImages: File[], sharedWith: string[], existingImageFilenames?: string[]) => void;
  onClose: () => void;
  /** Open scrolled to the "Delt med" section with the share input focused —
      the list view's "Del" action lands the user right where they can type. */
  autoFocusShare?: boolean;
  /** "Delt med før" quick picks: usernames from the user's own spots, ranked
      by frequency (useShareContacts). Already-added names are hidden here. */
  shareSuggestions?: string[];
}

const formatCoordinates = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'Ø' : 'V'}`;

export default function AddEditModal({ spot, coordinates, editorFallbackCenter, onSave, onClose, autoFocusShare = false, shareSuggestions = [] }: AddEditModalProps) {
  const isEdit = spot !== undefined;
  const [selectedType, setSelectedType] = useState<ForagingType>(spot?.type || 'chanterelle');
  const [notes, setNotes] = useState(spot?.notes || '');
  // Sharing is edited here and applied on save, like every other field —
  // the detail drawer only displays the resulting list
  const [sharedWith, setSharedWith] = useState<string[]>(spot?.sharedWith || []);
  const [shareUsername, setShareUsername] = useState('');
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates | null>(coordinates);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [manuallyPicked, setManuallyPicked] = useState(false);
  const { position: livePosition } = useUserLocation();

  // A GPS fix landing while the sheet still has no location fills the section
  // automatically ("Nuværende"). A manually picked location is terminal — it is
  // never overwritten by a later fix (it sets coordinates, ending this state).
  useEffect(() => {
    if (currentCoordinates === null && livePosition) {
      setCurrentCoordinates(livePosition);
    }
  }, [currentCoordinates, livePosition]);
  const [isOpen, setIsOpen] = useState(true);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const { ref: bodyRef, atTop, atBottom } = useScrollEdges();
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [activeSpeciesPage, setActiveSpeciesPage] = useState(0);
  const speciesPagerRef = useRef<HTMLDivElement>(null);
  const shareInputRef = useRef<HTMLInputElement>(null);

  // "Del" entry point: focus the share input right away (in the tap's task,
  // so iOS brings up the keyboard), then — once the sheet's 300ms entrance
  // has finished — smooth-scroll the share section into view. One scroll,
  // after the animation, keeps every engine happy; scrolling during the
  // entrance fought Radix's mount work and Chrome's animation handling.
  // Radix's own open-autofocus is suppressed via onOpenAutoFocus.
  useEffect(() => {
    if (!autoFocusShare) return;
    shareInputRef.current?.focus({ preventScroll: true });
    const timer = setTimeout(() => {
      shareInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 320);
    return () => clearTimeout(timer);
  }, [autoFocusShare]);

  const matchingTypes = FORAGING_TYPES.filter((type) =>
    getDanishLabel(type).toLowerCase().includes(speciesQuery.trim().toLowerCase())
  );
  // The generic picks are always on offer, appended in this order when the search misses them
  const fallbackTypes: ForagingType[] = ['generic_berry', 'generic_mushroom', 'other'];
  const visibleTypes: ForagingType[] = [
    ...matchingTypes,
    ...fallbackTypes.filter((type) => !matchingTypes.includes(type)),
  ];
  // Horizontally snap-scrolled pages of 8 tiles (4×2); the dots track the page
  const speciesPages: ForagingType[][] = [];
  for (let i = 0; i < visibleTypes.length; i += 8) {
    speciesPages.push(visibleTypes.slice(i, i + 8));
  }
  const activeSpeciesDot = Math.min(Math.max(speciesPages.length - 1, 0), activeSpeciesPage);

  // Back to the first page whenever the search narrows the list
  useEffect(() => {
    if (speciesPagerRef.current) speciesPagerRef.current.scrollLeft = 0;
    setActiveSpeciesPage(0);
  }, [speciesQuery]);

  // Open on the page holding the pre-selected species (edit mode starts mid-list).
  // Declared after the reset effect so this one wins on mount.
  useEffect(() => {
    const pager = speciesPagerRef.current;
    const index = FORAGING_TYPES.indexOf(selectedType);
    if (pager && index > 0) {
      const page = Math.floor(index / 8);
      pager.scrollLeft = page * pager.clientWidth;
      setActiveSpeciesPage(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if this is a pending spot
  const isPendingSpot = spot?.id?.startsWith('pending-') || (spot as ForagingSpotWithPending)?._pending;

  // Snapshots of the state the sheet opened with, for the dirty check
  // (issues/004 §8). The type/notes defaults mirror the useState initializers.
  const initialFormRef = useRef({
    type: spot?.type || ('chanterelle' as ForagingType),
    notes: spot?.notes || '',
    sharedWith: (spot?.sharedWith || []).join('\n'),
  });

  const [images, setImages] = useState<SpotImage[]>(() => {
    // Initialize images from existing server spot (not pending)
    if (!isPendingSpot && spot?.images && spot.images.length > 0) {
      const existingImageUrls = getSpotImageThumbnailUrls(spot);
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

  // Image baseline for the dirty check: ids of the set the sheet opened with.
  // A pending spot's images arrive async below, so the baseline moves with them.
  const baselineImageIdsRef = useRef<string[]>(images.map((img) => img.id ?? img.url));

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
        baselineImageIdsRef.current = pendingImages.map((img) => img.id ?? img.url);
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

  // Dirty = any difference from the state the sheet opened with. Coordinates
  // only change through the location editor, which sets manuallyPicked — the
  // auto GPS fill in the add flow doesn't count.
  const isDirty =
    selectedType !== initialFormRef.current.type ||
    notes !== initialFormRef.current.notes ||
    manuallyPicked ||
    sharedWith.join('\n') !== initialFormRef.current.sharedWith ||
    images.map((img) => img.id ?? img.url).join('\n') !== baselineImageIdsRef.current.join('\n');

  /** Guarded close (issues/004 §8): scrim, header X, Escape and native back
      all land here — a dirty form opens the discard dialog instead of
      silently dropping input (false = the back press is vetoed). */
  const attemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return false;
    }
    handleClose();
    return true;
  };

  useHistoryLayer(isOpen, attemptClose);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // The save button is disabled without a location (and, when editing,
    // without changes) — guard the form's implicit submit (Enter key) too
    if (!currentCoordinates) return;
    if (isEdit && !isDirty) return;

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

    onSave(selectedType, notes, currentCoordinates, newImageFiles, sharedWith, existingImageFilenames);
  };

  const handleAddShare = () => {
    const username = shareUsername.trim();
    if (!username || sharedWith.includes(username)) return;
    setSharedWith([...sharedWith, username]);
    setShareUsername('');
  };

  const handleRemoveShare = (username: string) => {
    setSharedWith(sharedWith.filter((u) => u !== username));
  };

  // Chips offer only names not already added (removing a row re-suggests it);
  // typing in the share input narrows them, so filtering and free text feed
  // the same field
  const shareQuery = shareUsername.trim().toLowerCase();
  const visibleSuggestions = shareSuggestions.filter(
    (username) =>
      !sharedWith.includes(username) &&
      (!shareQuery || username.toLowerCase().includes(shareQuery))
  );

  const handleAddSuggestion = (username: string) => {
    if (sharedWith.includes(username)) return;
    setSharedWith([...sharedWith, username]);
    setShareUsername('');
  };

  const handleLocationUpdate = (newCoordinates: Coordinates) => {
    setCurrentCoordinates(newCoordinates);
    setManuallyPicked(true);
    setShowLocationPicker(false);
  };

  // "Nuværende" while the add flow still holds the live GPS fix; otherwise
  // indicate where the coordinates came from. Only the live fix pulses the dot.
  const isAutoLocation = !manuallyPicked && !isEdit;
  const locationHint = manuallyPicked ? 'Manuel' : isEdit ? 'Redigér placering' : 'Nuværende';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) attemptClose(); }}>
        <SheetContent
          side="bottom"
          handle={false}
          // The fullscreen location editor renders outside the sheet's portal —
          // its taps must not dismiss the sheet underneath (see the helper for
          // why the open-flag alone is not enough on touch)
          onInteractOutside={(e) => {
            if (showLocationPicker || outsideInteractionStartedInOverlay(e)) e.preventDefault();
          }}
          // Radix's default open-autofocus targets the first tabbable element,
          // scrolling the body back to the top — it must stand down when the
          // share input is the landing point
          onOpenAutoFocus={(e) => {
            if (autoFocusShare) e.preventDefault();
          }}
          className="max-h-[92%] bg-bg sm:mx-auto sm:max-w-[520px]"
        >
          {/* Header: Spectral 23px title + 36px circular close button; hairline/shadow appear on scroll */}
          <div className={`flex shrink-0 items-center justify-between px-[24px] pb-[14px] pt-[20px] ${headerEdgeClass(atTop)}`}>
            <SheetTitle className="text-[23px] font-semibold leading-none text-ink">
              {isEdit ? 'Redigér fund' : 'Nyt fund'}
            </SheetTitle>
            <button
              type="button"
              onClick={attemptClose}
              aria-label="Luk"
              className="flex size-[36px] shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:bg-line2"
            >
              <X className="size-[16px]" strokeWidth={1.9} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            {/* Scrollable content between the pinned header and footer */}
            <div
              ref={bodyRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-[24px] pb-[24px] pt-[20px]"
              style={topMaskStyle(atTop)}
            >
              {/* Species selector: search field + scrollable 4-column tile grid + page dots */}
              <MonoLabel className="mb-[12px] block">Vælg art</MonoLabel>
              <div className="mb-[14px] flex h-[46px] items-center gap-[9px] rounded-[13px] border border-line bg-surface px-[14px]">
                <Search className="size-[16px] shrink-0 text-mono" strokeWidth={1.8} />
                <input
                  type="text"
                  value={speciesQuery}
                  onChange={(e) => setSpeciesQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  placeholder="Søg art…"
                  aria-label="Søg art"
                  className="min-w-0 flex-1 bg-transparent font-serif text-[15px] text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
              <div
                ref={speciesPagerRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setActiveSpeciesPage(Math.round(el.scrollLeft / el.clientWidth));
                }}
                className="scrollbar-hide -mx-[24px] flex snap-x snap-mandatory overflow-x-auto"
              >
                {speciesPages.map((page, pageIndex) => (
                  <div key={pageIndex} className="w-full shrink-0 snap-start px-[24px] py-[2px]">
                    <div className="grid grid-cols-4 gap-[12px]">
                      {page.map((type) => {
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
                  </div>
                ))}
              </div>
              {speciesPages.length > 1 && (
                <div className="mt-[12px] flex justify-center gap-[5px]" aria-hidden>
                  {speciesPages.map((_, i) => (
                    <span
                      key={i}
                      className={`size-[6px] rounded-full ${i === activeSpeciesDot ? 'bg-map-trail' : 'bg-line'}`}
                    />
                  ))}
                </div>
              )}

              {/* Placering: surface field with brand dot (pulsing while it holds the
                  live fix), opens the location picker. With no location, the design's
                  amber warning card + manual-add button take its place instead. */}
              <MonoLabel className="mb-[8px] mt-[24px] block">Placering</MonoLabel>
              {currentCoordinates ? (
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="flex h-[52px] w-full items-center gap-[10px] rounded-[14px] border border-line bg-surface px-[15px] text-left transition-colors hover:border-mono"
                >
                  <span
                    className={`size-[9px] shrink-0 rounded-full bg-brand ${isAutoLocation ? 'animate-ss-pulse' : ''}`}
                  />
                  <span className="truncate font-mono text-[13px] text-ink">
                    {formatCoordinates(currentCoordinates.lat, currentCoordinates.lng)}
                  </span>
                  <span className="ml-auto shrink-0 font-serif text-[12px] text-mono">{locationHint}</span>
                </button>
              ) : (
                <div>
                  <div className="flex items-start gap-[10px] rounded-[14px] border border-offline-border bg-offline-bg px-[14px] py-[12px]">
                    <span className="mt-[1px] flex shrink-0 text-offline-ink">
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 10.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" fill="currentColor" stroke="none" />
                        <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 12-4.9M3 3l18 18" />
                      </svg>
                    </span>
                    <span className="text-[12.5px] leading-[1.5] text-offline-ink">
                      Ingen lokation fundet. Tilføj den manuelt for at gemme fundet.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="mt-[10px] flex h-[50px] w-full items-center justify-center gap-[8px] rounded-[14px] bg-brand font-serif text-[15.5px] font-semibold text-brand-ink transition-transform active:scale-95"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z" />
                      <circle cx="12" cy="10" r="2.6" />
                    </svg>
                    Tilføj lokation manuelt
                  </button>
                </div>
              )}

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

              {/* Delt med: user rows with remove + @-input; applied on save like
                  every other field (moved here from the detail drawer, which now
                  only displays the list) */}
              <div className="mt-[24px]">
                <div className="mb-[12px] flex items-center justify-between">
                  <MonoLabel>Delt med</MonoLabel>
                  {sharedWith.length > 0 && (
                    <span className="font-mono text-[11px] text-faint">
                      {sharedWith.length === 1 ? '1 person' : `${sharedWith.length} personer`}
                    </span>
                  )}
                </div>

                {sharedWith.length > 0 && (
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
                          onClick={() => handleRemoveShare(username)}
                          aria-label={`Fjern deling med ${username}`}
                          className="flex size-[28px] shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-line2 hover:text-accent"
                        >
                          <X className="size-[15px]" strokeWidth={1.9} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-[8px]">
                  <div className="flex h-[48px] min-w-0 flex-1 items-center gap-[8px] rounded-[13px] border border-line bg-surface px-[14px]">
                    <span className="font-serif text-[16px] text-mono">@</span>
                    <input
                      ref={shareInputRef}
                      type="text"
                      value={shareUsername}
                      onChange={(e) => setShareUsername(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddShare();
                        }
                      }}
                      placeholder="Del med brugernavn…"
                      aria-label="Del med brugernavn"
                      className="min-w-0 flex-1 bg-transparent font-serif text-[15px] text-ink outline-none placeholder:text-muted"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddShare}
                    disabled={!shareUsername.trim()}
                    aria-label="Del fund"
                    className="flex size-[48px] shrink-0 items-center justify-center rounded-[13px] bg-brand text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Plus className="size-[20px]" strokeWidth={1.9} />
                  </button>
                </div>

                {/* Delt med før: quick-pick chips, visually lighter than the
                    committed rows above (smaller avatar, no @). Collapses to
                    nothing without history/matches */}
                {visibleSuggestions.length > 0 && (
                  <div className="mt-[14px]">
                    <div className="mb-[9px]">
                      <MonoLabel className="text-[10.5px] text-faint">Delt med før</MonoLabel>
                    </div>
                    <div className="flex flex-wrap gap-[8px]">
                      {visibleSuggestions.map((username) => (
                        <button
                          key={username}
                          type="button"
                          onClick={() => handleAddSuggestion(username)}
                          aria-label={`Del med ${username}`}
                          className="flex h-[38px] items-center gap-[8px] rounded-full border border-line bg-surface pl-[5px] pr-[12px] transition-colors hover:border-brand"
                        >
                          <span className="flex size-[28px] shrink-0 items-center justify-center rounded-full bg-brand font-serif text-[12.5px] font-semibold text-brand-ink">
                            {username.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-serif text-[14.5px] text-ink">{username}</span>
                          <Plus className="size-[15px] shrink-0 text-brand" strokeWidth={2} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Pinned footer inside the form (button stays type=submit). The accent
                CTA is inert and dimmed until a location exists (design
                addSaveOpacity/.45 + not-allowed cursor, so it stays hit-testable) —
                and, when editing, until something actually changed */}
            <div className={`shrink-0 px-[24px] pb-[24px] pt-[14px] ${footerEdgeClass(atBottom)}`}>
              <Button
                type="submit"
                size="lg"
                disabled={!currentCoordinates || (isEdit && !isDirty)}
                className="w-full disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-[.45]"
              >
                {isEdit ? 'Gem ændringer' : 'Gem fund'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Discard-changes guard (issues/004 §8) */}
      <DiscardChangesDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          handleClose();
        }}
        description={isEdit ? 'Dine ændringer bliver ikke gemt.' : 'Dit nye fund bliver ikke gemt.'}
      />

      {/* Fullscreen location editor. Without coordinates it opens on the map's
          current center (Denmark center as a last resort); backing out returns
          to the sheet with the warning state unchanged. */}
      {showLocationPicker && (
        <LocationEditorScreen
          initialCoordinates={currentCoordinates ?? editorFallbackCenter ?? { lat: 56.0, lng: 10.0 }}
          type={selectedType}
          onSave={handleLocationUpdate}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </>
  );
}
