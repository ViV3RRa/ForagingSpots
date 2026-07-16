import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { SpotImage } from './ImageCapture';
import BlurImage from './ui/blur-image';
import { getExifCaptureDate } from '../utils/exifDate';
import { formatFoundDate } from '../utils/formatDate';

interface ImageViewerProps {
  images: SpotImage[];
  /** Thumbnail URLs matching `images` by index; falls back to the full-size URL. */
  thumbnailUrls?: string[];
  /** Tiny blur-up placeholders matching `images` by index — the same 32x0 URLs
      the gallery tiles already fetched, so they're served from cache. */
  placeholderUrls?: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  /** Used for the images' alt text — not displayed. */
  spotName: string;
  /** Fallback caption date (the spot's "Fundet" date) for photos without an
      EXIF capture date. */
  spotDate: string;
}

// Minimum horizontal travel (px) for a swipe to commit to the next/prev photo
const SWIPE_THRESHOLD = 60;

/*
 * Photo lightbox from the design's `isPhoto` block. The near-black backdrop is
 * intentionally theme-independent (dark in both themes), so colors here are
 * hard-coded rather than token-based — except the accent ring on the active thumb.
 */
export default function ImageViewer({
  images,
  thumbnailUrls,
  placeholderUrls,
  initialIndex = 0,
  isOpen,
  onClose,
  spotName,
  spotDate,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Natural photo dimensions per URL, reported by BlurImage (placeholder first,
  // refined by the full image) — the card adopts each photo's own aspect ratio
  const [naturalSizes, setNaturalSizes] = useState<Record<string, { w: number; h: number }>>({});
  // Per-photo EXIF capture date (null = parsed, none found → spotDate fallback)
  const [captureDates, setCaptureDates] = useState<Record<string, Date | null>>({});
  const requestedExif = useRef(new Set<string>());
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchState = useRef<{ x: number; y: number; axis: 'h' | 'v' | null } | null>(null);

  // Render-phase reset so reopening jumps straight to the tapped photo instead
  // of animating the carousel track from the previously viewed one.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setDragX(0);
    }
  }

  const goPrev = useCallback(
    () => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1)),
    [images.length]
  );
  const goNext = useCallback(
    () => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0)),
    [images.length]
  );

  // Capture phase so Escape doesn't also dismiss the Radix sheet underneath.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.stopPropagation();
          onClose();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'ArrowRight':
          goNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, goPrev, goNext, onClose]);

  // Read each photo's EXIF capture date once the lightbox opens — all up
  // front (≤5 photos, chunked Range reads) so swiping never swaps the caption
  useEffect(() => {
    if (!isOpen) return;
    images.forEach(({ url }) => {
      if (requestedExif.current.has(url)) return;
      requestedExif.current.add(url);
      getExifCaptureDate(url).then((date) =>
        setCaptureDates((prev) => ({ ...prev, [url]: date }))
      );
    });
  }, [isOpen, images]);

  if (!isOpen || !images.length) return null;

  const safeIndex = Math.min(currentIndex, images.length - 1);
  const hasMultiple = images.length > 1;

  const reportNaturalSize = (url: string) => (w: number, h: number) =>
    setNaturalSizes((prev) => {
      const existing = prev[url];
      if (existing && existing.w === w && existing.h === h) return prev;
      return { ...prev, [url]: { w, h } };
    });

  const handleTouchStart = (event: React.TouchEvent) => {
    touchState.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, axis: null };
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    const start = touchState.current;
    if (!start) return;
    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;
    // Lock the gesture to an axis once movement is unambiguous
    if (!start.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      start.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (start.axis !== 'h') return;
    // Rubber-band resistance past the first/last photo
    const pastEdge = (safeIndex === 0 && dx > 0) || (safeIndex === images.length - 1 && dx < 0);
    setDragX(pastEdge ? dx / 3 : dx);
  };

  const handleTouchEnd = () => {
    const start = touchState.current;
    touchState.current = null;
    setIsDragging(false);
    if (start?.axis === 'h') {
      if (dragX < -SWIPE_THRESHOLD && safeIndex < images.length - 1) {
        setCurrentIndex(safeIndex + 1);
      } else if (dragX > SWIPE_THRESHOLD && safeIndex > 0) {
        setCurrentIndex(safeIndex - 1);
      }
    }
    setDragX(0);
  };

  const handleTouchCancel = () => {
    touchState.current = null;
    setIsDragging(false);
    setDragX(0);
  };

  /* Portaled to <body>: the bottom sheets are body-level Radix portals (z-50)
     while #root is a fixed layer with its own stacking context — rendered
     inside #root, no z-index could lift the lightbox above an open sheet. At
     body level its z-[70] wins, and the transformed body (tokens.css) sizes
     the fixed frame correctly on every surface. pointer-events-auto: the
     drawer underneath is a Radix modal that sets pointer-events:none on
     <body> while open. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${safeIndex + 1} af ${images.length}`}
      className="pointer-events-auto fixed inset-0 z-[70] flex animate-ss-fade flex-col bg-[#141009]"
    >
      {/* Top row: counter + circular close button */}
      <div className="safe-area-top">
        <div className="flex items-center justify-between px-[22px] pt-[14px]">
          <span className="font-mono text-[13px] text-[#e8e0cf]">
            {safeIndex + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="flex size-[40px] items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] text-white transition-colors hover:bg-[rgba(255,255,255,0.22)]"
          >
            <X className="size-[17px]" strokeWidth={1.9} />
          </button>
        </div>
      </div>

      {/* Carousel track: one 3:4 card per photo, swipe follows the finger */}
      <div
        className="min-h-0 flex-1 touch-pan-y overflow-hidden"
        onTouchStart={hasMultiple ? handleTouchStart : undefined}
        onTouchMove={hasMultiple ? handleTouchMove : undefined}
        onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
        onTouchCancel={hasMultiple ? handleTouchCancel : undefined}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(${-safeIndex * 100}% + ${dragX}px))`,
            transition: isDragging ? 'none' : 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {images.map((image, index) => {
            /* The card hugs the photo's own aspect ratio (known from the tiny
               placeholder almost immediately; 3:4 only until then). Sized via
               container-query units: the largest box of that ratio that fits
               the padded slide, capped at 430px wide. */
            const size = naturalSizes[image.url];
            return (
              <div
                key={image.url}
                className="flex h-full w-full shrink-0 items-center justify-center p-[20px] [container-type:size]"
                aria-hidden={index !== safeIndex}
              >
                <div
                  className="relative w-full max-w-[430px] overflow-hidden rounded-[20px] bg-[#241d12] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                  style={
                    size
                      ? {
                          aspectRatio: `${size.w} / ${size.h}`,
                          width: `min(100cqw, 430px, calc(100cqh * ${size.w / size.h}))`,
                        }
                      : { aspectRatio: '3 / 4', maxHeight: '100%' }
                  }
                >
                  <BlurImage
                    src={image.url}
                    placeholderSrc={placeholderUrls?.[index]}
                    alt={`Foto ${index + 1} af ${spotName}`}
                    className="absolute inset-0"
                    blurPlaceholder="base"
                    onNaturalSize={reportNaturalSize(image.url)}
                    draggable={false}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 px-[18px] pb-[14px] pt-[36px]"
                    style={{ background: 'linear-gradient(rgba(0,0,0,0), rgba(20,15,8,0.6))' }}
                  >
                    <div className="font-mono text-[11px] text-white/80">
                      {captureDates[image.url] ? formatFoundDate(captureDates[image.url]!) : spotDate}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thumbnail strip — hidden for single-image spots */}
      <div
        className="flex justify-center gap-[10px] overflow-x-auto px-[22px] pt-[8px]"
        style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
      >
        {hasMultiple &&
          images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`Vis foto ${index + 1}`}
              aria-current={index === safeIndex}
              className={`size-[58px] shrink-0 overflow-hidden rounded-[12px] border-2 transition-all duration-200 ${
                index === safeIndex ? 'border-accent opacity-100' : 'border-transparent opacity-55'
              }`}
            >
              <img
                src={thumbnailUrls?.[index] ?? image.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
      </div>
    </div>,
    document.body,
  );
}
