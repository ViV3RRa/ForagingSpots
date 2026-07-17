import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { SpotImage } from './ImageCapture';
import BlurImage from './ui/blur-image';
import { getExifCaptureDate } from '../utils/exifDate';
import { formatFoundDate } from '../utils/formatDate';
import { useHistoryLayer } from '../hooks/useHistoryLayer';

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

// The fitted card is the floor (scale 1) — the user can only zoom in from there
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;
// How far past the screen edge a zoomed photo can be panned, so its edge can
// be pulled slightly into view instead of stopping flush with the viewport
const PAN_EDGE_GAP = 24;

interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

const ZOOM_RESET: ZoomState = { scale: 1, x: 0, y: 0 };

// One active touch gesture at a time: carousel swipe (unzoomed), one-finger
// pan (zoomed) or two-finger pinch. A second finger upgrades swipe/pan to
// pinch; lifting back to one finger downgrades pinch to pan.
type TouchGesture =
  | { mode: 'swipe'; x: number; y: number; axis: 'h' | 'v' | null }
  | { mode: 'pan'; x: number; y: number; base: ZoomState; moved: boolean }
  | { mode: 'pinch'; d: number; mx: number; my: number; base: ZoomState };

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
  const gestureRef = useRef<TouchGesture | null>(null);

  // Zoom/pan for the active photo, applied as translate+scale on a wrapper
  // inside the (untransformed) card so overflow-hidden keeps clipping it
  const [zoom, setZoom] = useState<ZoomState>(ZOOM_RESET);
  const [isZoomGesture, setIsZoomGesture] = useState(false);
  const zoomRef = useRef(zoom);
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const lastTouchEndRef = useRef(0);

  // All zoom writes go through here so event handlers can read the latest
  // value from the ref mid-gesture, before React has re-rendered
  const applyZoom = useCallback((next: ZoomState) => {
    zoomRef.current = next;
    setZoom(next);
  }, []);

  // The zoomed image isn't clipped to the card — it grows over the whole
  // lightbox and only the viewport limits it. Per axis: while the scaled
  // image is smaller than the viewport it can't be panned (nothing is
  // hidden) and instead drifts from card-centered toward viewport-centered
  // as it grows, so a deep zoom fills the entire screen without the position
  // jumping at gesture start. Once it covers the viewport, panning unlocks
  // with the image edges clamped to the viewport edges.
  const clampZoom = useCallback((scale: number, x: number, y: number): ZoomState => {
    const s = Math.min(Math.max(scale, 1), MAX_ZOOM);
    const card = activeCardRef.current;
    const root = rootRef.current;
    if (!card || !root || s <= 1) return ZOOM_RESET;
    const rect = card.getBoundingClientRect();
    const view = root.getBoundingClientRect();

    const clampAxis = (t: number, cardStart: number, cardSize: number, viewStart: number, viewSize: number) => {
      const cardCenter = cardStart + cardSize / 2;
      const viewCenter = viewStart + viewSize / 2;
      const coverScale = viewSize / cardSize; // scale where the image spans the viewport
      const drift = coverScale > 1 ? Math.min(1, (s - 1) / (coverScale - 1)) : 1;
      const offset = (viewCenter - cardCenter) * drift;
      const range = Math.max(0, (cardSize * s - viewSize) / 2 + PAN_EDGE_GAP);
      return offset + Math.min(Math.max(t - offset, -range), range);
    };

    return {
      scale: s,
      x: clampAxis(x, rect.left, rect.width, view.left, view.width),
      y: clampAxis(y, rect.top, rect.height, view.top, view.height),
    };
  }, []);

  // New zoom that keeps the content under the screen point (focalX, focalY)
  // fixed. The wrapper maps a content offset p to `cardCenter + t + p·s`,
  // so solve for the new translation t at the new scale.
  const zoomAt = useCallback(
    (focalX: number, focalY: number, nextScale: number, base: ZoomState): ZoomState => {
      const card = activeCardRef.current;
      if (!card) return clampZoom(nextScale, base.x, base.y);
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ratio = nextScale / base.scale;
      return clampZoom(
        nextScale,
        focalX - cx - (focalX - cx - base.x) * ratio,
        focalY - cy - (focalY - cy - base.y) * ratio
      );
    },
    [clampZoom]
  );

  const toggleZoom = useCallback(
    (x: number, y: number) => {
      const base = zoomRef.current;
      applyZoom(base.scale > 1 ? ZOOM_RESET : zoomAt(x, y, DOUBLE_TAP_ZOOM, base));
    },
    [applyZoom, zoomAt]
  );

  // Render-phase reset so reopening jumps straight to the tapped photo instead
  // of animating the carousel track from the previously viewed one.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setDragX(0);
      applyZoom(ZOOM_RESET);
    }
  }

  // Zoom is per-photo: leaving one (swipe, arrows, thumbnails) resets it
  const [zoomIndex, setZoomIndex] = useState(currentIndex);
  if (zoomIndex !== currentIndex) {
    setZoomIndex(currentIndex);
    applyZoom(ZOOM_RESET);
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

  // Desktop zoom via scroll/trackpad-pinch. Native non-passive listener:
  // React registers wheel passively, so a JSX handler couldn't preventDefault
  // (a trackpad pinch would zoom the whole page instead).
  useEffect(() => {
    const track = trackRef.current;
    if (!isOpen || !track) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const base = zoomRef.current;
      // ctrlKey marks a trackpad pinch, whose deltas are much smaller
      const next = base.scale * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002));
      applyZoom(zoomAt(event.clientX, event.clientY, next, base));
    };
    track.addEventListener('wheel', handleWheel, { passive: false });
    return () => track.removeEventListener('wheel', handleWheel);
  }, [isOpen, applyZoom, zoomAt]);

  // Native back closes the lightbox before any sheet beneath it
  useHistoryLayer(isOpen, onClose);

  if (!isOpen || !images.length) return null;

  const safeIndex = Math.min(currentIndex, images.length - 1);
  const hasMultiple = images.length > 1;

  const reportNaturalSize = (url: string) => (w: number, h: number) =>
    setNaturalSizes((prev) => {
      const existing = prev[url];
      if (existing && existing.w === w && existing.h === h) return prev;
      return { ...prev, [url]: { w, h } };
    });

  // Double-tap detection (manual — iOS gets no dblclick for fast taps here)
  const handleTap = (x: number, y: number) => {
    const now = Date.now();
    const last = lastTapRef.current;
    lastTapRef.current = { t: now, x, y };
    if (last && now - last.t < DOUBLE_TAP_MS && Math.hypot(x - last.x, y - last.y) < 40) {
      lastTapRef.current = null;
      toggleZoom(x, y);
    }
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length >= 2) {
      const [a, b] = [event.touches[0], event.touches[1]];
      gestureRef.current = {
        mode: 'pinch',
        d: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        mx: (a.clientX + b.clientX) / 2,
        my: (a.clientY + b.clientY) / 2,
        base: zoomRef.current,
      };
      setIsZoomGesture(true);
      // A second finger cancels any carousel drag in progress
      setIsDragging(false);
      setDragX(0);
    } else if (zoomRef.current.scale > 1) {
      const touch = event.touches[0];
      gestureRef.current = {
        mode: 'pan',
        x: touch.clientX,
        y: touch.clientY,
        base: zoomRef.current,
        moved: false,
      };
      setIsZoomGesture(true);
    } else {
      gestureRef.current = {
        mode: 'swipe',
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        axis: null,
      };
      setIsDragging(true);
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    if (gesture.mode === 'pinch') {
      if (event.touches.length < 2 || gesture.d === 0) return;
      const [a, b] = [event.touches[0], event.touches[1]];
      const d = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const mx = (a.clientX + b.clientX) / 2;
      const my = (a.clientY + b.clientY) / 2;
      const card = activeCardRef.current;
      if (!card) return;
      const nextScale = Math.min(Math.max(gesture.base.scale * (d / gesture.d), 1), MAX_ZOOM);
      // Pin the content that started under the fingers' midpoint to the
      // midpoint's current position (zoom toward the pinch, pan with it)
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ratio = nextScale / gesture.base.scale;
      applyZoom(
        clampZoom(
          nextScale,
          mx - cx - (gesture.mx - cx - gesture.base.x) * ratio,
          my - cy - (gesture.my - cy - gesture.base.y) * ratio
        )
      );
    } else if (gesture.mode === 'pan') {
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) gesture.moved = true;
      applyZoom(clampZoom(gesture.base.scale, gesture.base.x + dx, gesture.base.y + dy));
    } else {
      const dx = event.touches[0].clientX - gesture.x;
      const dy = event.touches[0].clientY - gesture.y;
      // Lock the gesture to an axis once movement is unambiguous
      if (!gesture.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      if (gesture.axis !== 'h') return;
      // Rubber-band resistance past the first/last photo
      const pastEdge = (safeIndex === 0 && dx > 0) || (safeIndex === images.length - 1 && dx < 0);
      setDragX(pastEdge ? dx / 3 : dx);
    }
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    lastTouchEndRef.current = Date.now();
    if (!gesture) return;
    if (event.touches.length > 0) {
      // A finger remains (pinch → one finger): continue as a pan if still
      // zoomed, otherwise wait for the next touchstart
      if (zoomRef.current.scale > 1) {
        const touch = event.touches[0];
        gestureRef.current = {
          mode: 'pan',
          x: touch.clientX,
          y: touch.clientY,
          base: zoomRef.current,
          moved: true,
        };
      } else {
        setIsZoomGesture(false);
      }
      return;
    }
    setIsZoomGesture(false);
    if (gesture.mode === 'swipe') {
      setIsDragging(false);
      if (gesture.axis === 'h') {
        if (dragX < -SWIPE_THRESHOLD && safeIndex < images.length - 1) {
          setCurrentIndex(safeIndex + 1);
        } else if (dragX > SWIPE_THRESHOLD && safeIndex > 0) {
          setCurrentIndex(safeIndex - 1);
        }
      }
      setDragX(0);
      if (gesture.axis === null) handleTap(gesture.x, gesture.y);
    } else if (gesture.mode === 'pan' && !gesture.moved) {
      handleTap(gesture.x, gesture.y);
    }
  };

  const handleTouchCancel = () => {
    gestureRef.current = null;
    setIsZoomGesture(false);
    setIsDragging(false);
    setDragX(0);
  };

  // Desktop: drag to pan while zoomed
  const handleMouseDown = (event: React.MouseEvent) => {
    if (zoomRef.current.scale <= 1 || event.button !== 0) return;
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, base: zoomRef.current };
    setIsZoomGesture(true);
    const handleMove = (ev: MouseEvent) =>
      applyZoom(
        clampZoom(start.base.scale, start.base.x + ev.clientX - start.x, start.base.y + ev.clientY - start.y)
      );
    const handleUp = () => {
      setIsZoomGesture(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    // iOS can synthesize a dblclick after our manual double-tap — ignore it
    if (Date.now() - lastTouchEndRef.current < 700) return;
    toggleZoom(event.clientX, event.clientY);
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
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${safeIndex + 1} af ${images.length}`}
      className="pointer-events-auto fixed inset-0 z-[70] flex animate-ss-fade flex-col bg-[#141009]"
    >
      {/* Top row: counter + circular close button. z-10 keeps it above (and
          clickable over) a zoomed photo extending beneath it. */}
      <div className="relative z-10 safe-area-top">
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

      {/* Carousel track: swipe follows the finger while unzoomed; pinch,
          double-tap and (zoomed) one-finger drag zoom/pan the active photo.
          touch-none so the browser never claims the pinch. Overflow is only
          clipped while unzoomed — a zoomed photo may grow past the track,
          under the top bar and thumbnail strip (swiping is off while zoomed,
          so the neighbour slides stay parked offscreen). */}
      <div
        ref={trackRef}
        className={`min-h-0 flex-1 touch-none ${
          zoom.scale > 1 ? 'cursor-grab' : 'overflow-hidden'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
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
                  ref={index === safeIndex ? activeCardRef : undefined}
                  className={`relative w-full max-w-[430px] rounded-[20px] bg-[#241d12] shadow-[0_24px_60px_rgba(0,0,0,0.5)] ${
                    index === safeIndex && zoom.scale > 1 ? '' : 'overflow-hidden'
                  }`}
                  style={
                    size
                      ? {
                          aspectRatio: `${size.w} / ${size.h}`,
                          width: `min(100cqw, 430px, calc(100cqh * ${size.w / size.h}))`,
                        }
                      : { aspectRatio: '3 / 4', maxHeight: '100%' }
                  }
                >
                  {/* Zoom wrapper: the card itself stays untransformed so its
                      rect stays reliable for the gesture math. While zoomed
                      the card stops clipping and this wrapper's own rounded
                      corners (scaled along with it) take over, letting the
                      photo grow past the card until the viewport stops it. */}
                  <div
                    className="absolute inset-0 overflow-hidden rounded-[20px]"
                    style={
                      index === safeIndex
                        ? {
                            transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                            transition: isZoomGesture
                              ? 'none'
                              : 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                            willChange: zoom.scale > 1 ? 'transform' : undefined,
                          }
                        : undefined
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
                  </div>
                  <div
                    className={`absolute inset-x-0 bottom-0 px-[18px] pb-[14px] pt-[36px] transition-opacity duration-200 ${
                      index === safeIndex && zoom.scale > 1 ? 'opacity-0' : 'opacity-100'
                    }`}
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

      {/* Thumbnail strip — hidden for single-image spots. z-10: stays above
          a zoomed photo extending beneath it. */}
      <div
        className="relative z-10 flex justify-center gap-[10px] overflow-x-auto px-[22px] pt-[8px]"
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
