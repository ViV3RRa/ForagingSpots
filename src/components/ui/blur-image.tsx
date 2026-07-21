import { useCallback, useRef, useState } from 'react';
import { cn } from './utils';

interface BlurImageProps {
  src: string;
  /** Tiny same-aspect thumb (32x0) blurred up behind the real image while it
      loads. Omit for local object URLs (pending spots) — they render with the
      plain fade only. */
  placeholderSrc?: string;
  alt: string;
  /** Wrapper classes — callers keep size, rounding and backdrop tone here. */
  className?: string;
  imgClassName?: string;
  /** Extra gaussian blur on the placeholder beyond the browser's own upscale
      smoothing: 'sm' = 4px (small tiles), 'base' = 8px (large surfaces like
      the lightbox card, where the 32px upscale looks blocky). */
  blurPlaceholder?: 'sm' | 'base';
  /** Forwarded so callers can keep fallback-src behavior on the raw element. */
  onError?: React.ReactEventHandler<HTMLImageElement>;
  /** Reports the photo's natural dimensions as soon as they're known — from
      the placeholder (same aspect ratio) if it wins the race, refined by the
      real image. Lets callers size a frame to the photo's own aspect ratio. */
  onNaturalSize?: (width: number, height: number) => void;
  draggable?: boolean;
}

/*
 * Blur-up lazy image (plans/005): the placeholder is a tiny thumb with the
 * same aspect ratio as the real photo, so `cover` frames both identically and
 * the fade-in doesn't jump. A shimmer band sweeps the tile until the real
 * image arrives. The placeholder is an eager high-priority <img> rather than
 * the blog's background-image — background fetches queue behind every <img>
 * on the page, which defeats a placeholder.
 */
export default function BlurImage({
  src,
  placeholderSrc,
  alt,
  className,
  imgClassName,
  blurPlaceholder,
  onError,
  onNaturalSize,
  draggable,
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  /* Cached fast path: for HTTP-cached / service-worker-served images the load
     event can fire before React attaches onLoad — the ref callback catches
     those via img.complete and skips the fade so there's no blur flash. */
  const [instant, setInstant] = useState(false);
  /* Mirrors `loaded` synchronously. The ref callback re-runs whenever its
     identity changes (parent re-renders with a fresh onNaturalSize/onError),
     and after a normal load the image IS complete — without this guard a
     later re-attach would flip `instant` mid-fade and kill the transition.
     Only an attach that beats the load event may take the instant path. */
  const loadObservedRef = useRef(false);

  // Render-phase reset so a reused tile doesn't stay "loaded" across src swaps
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoaded(false);
    setInstant(false);
    loadObservedRef.current = false;
  }

  const imgRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0 && !loadObservedRef.current) {
        loadObservedRef.current = true;
        setLoaded(true);
        setInstant(true);
        onNaturalSize?.(img.naturalWidth, img.naturalHeight);
      }
    },
    [onNaturalSize]
  );

  // Same complete-check as the main image — a cached placeholder can finish
  // loading before React attaches onLoad
  const placeholderRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        onNaturalSize?.(img.naturalWidth, img.naturalHeight);
      }
    },
    [onNaturalSize]
  );

  return (
    /* rounded-[inherit] pulls the corner radius from whichever ancestor rounds
       the tile (the detail-sheet button, the lightbox card) down onto this
       wrapper — the box that actually contains the blurred placeholder and the
       shimmer. translateZ(0) then promotes that wrapper to its own compositing
       layer: iOS/WebKit only applies a rounded overflow clip to composited
       descendants (filter:blur placeholder, transform shimmer) when the
       clipping box is itself composited — otherwise those back layers show
       square corners past the rounded photo. twMerge lets a caller override the
       radius via className. */
    <div
      className={cn(
        'relative overflow-hidden rounded-[inherit] [transform:translateZ(0)]',
        className
      )}
    >
      {placeholderSrc && !instant && (
        <img
          ref={placeholderRef}
          src={placeholderSrc}
          alt=""
          aria-hidden
          fetchPriority="high"
          decoding="async"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            onNaturalSize?.(img.naturalWidth, img.naturalHeight);
          }}
          /* The gaussian blur smooths the 32px upscale beyond plain bilinear.
             The box is overscanned by a FIXED amount equal to the blur radius
             to push the blur's transparent edge fringe outside the clip —
             fixed, not a scale(), so the placeholder↔image misalignment is
             bounded by the blur radius itself and stays invisible at any
             surface size. */
          className={
            blurPlaceholder === 'base'
              ? 'absolute -left-2 -top-2 h-[calc(100%+16px)] w-[calc(100%+16px)] object-cover blur'
              : blurPlaceholder === 'sm'
                ? 'absolute -left-1 -top-1 h-[calc(100%+8px)] w-[calc(100%+8px)] object-cover blur-sm'
                : 'absolute inset-0 h-full w-full object-cover'
          }
        />
      )}
      {!loaded && (
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full animate-ss-shimmer bg-[linear-gradient(105deg,transparent_40%,rgba(244,239,227,0.4)_50%,transparent_60%)]"
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={draggable}
        onLoad={(e) => {
          loadObservedRef.current = true;
          setLoaded(true);
          const img = e.currentTarget;
          onNaturalSize?.(img.naturalWidth, img.naturalHeight);
        }}
        onError={(e) => {
          loadObservedRef.current = true;
          setLoaded(true);
          onError?.(e);
        }}
        className={cn(
          'relative h-full w-full object-cover',
          loaded ? 'opacity-100' : 'opacity-0',
          !instant && 'transition-opacity duration-[400ms] ease-out',
          imgClassName
        )}
      />
    </div>
  );
}
