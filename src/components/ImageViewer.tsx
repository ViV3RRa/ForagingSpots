import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { SpotImage } from './ImageCapture';

interface ImageViewerProps {
  images: SpotImage[];
  /** Thumbnail URLs matching `images` by index; falls back to the full-size URL. */
  thumbnailUrls?: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  /** Caption overlay: Danish type label, formatted date, and formatted coordinates. */
  spotName: string;
  spotDate: string;
  spotCoordinates: string;
}

/*
 * Photo lightbox from the design's `isPhoto` block. The near-black backdrop is
 * intentionally theme-independent (dark in both themes), so colors here are
 * hard-coded rather than token-based — except the accent ring on the active thumb.
 */
export default function ImageViewer({
  images,
  thumbnailUrls,
  initialIndex = 0,
  isOpen,
  onClose,
  spotName,
  spotDate,
  spotCoordinates,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

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
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          break;
        case 'ArrowRight':
          setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || !images.length) return null;

  const safeIndex = Math.min(currentIndex, images.length - 1);
  const currentImage = images[safeIndex];
  const hasMultiple = images.length > 1;
  const isLoaded = loadedUrls.has(currentImage.url);

  const markLoaded = (url: string) =>
    setLoadedUrls((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));

  return (
    /* pointer-events-auto: the drawer underneath is a Radix modal that sets
       pointer-events:none on <body> while open */
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

      {/* Centered 3:4 image card with caption overlay */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-[20px]">
        <div
          className="relative w-full max-w-[430px] overflow-hidden rounded-[20px] bg-[#241d12] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
          style={{ aspectRatio: '3 / 4', maxHeight: '100%' }}
        >
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="size-[28px] animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            </div>
          )}
          <img
            src={currentImage.url}
            alt={`Foto ${safeIndex + 1} af ${spotName}`}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
            style={{ opacity: isLoaded ? 1 : 0 }}
            onLoad={() => markLoaded(currentImage.url)}
            onError={() => markLoaded(currentImage.url)}
          />
          <div
            className="absolute inset-x-0 bottom-0 px-[18px] pb-[16px] pt-[42px]"
            style={{ background: 'linear-gradient(rgba(0,0,0,0), rgba(20,15,8,0.6))' }}
          >
            <div className="font-serif text-[19px] font-semibold text-white">{spotName}</div>
            <div className="mt-[2px] font-mono text-[11px] text-white/80">
              {spotDate} · {spotCoordinates}
            </div>
          </div>
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
              />
            </button>
          ))}
      </div>
    </div>
  );
}
