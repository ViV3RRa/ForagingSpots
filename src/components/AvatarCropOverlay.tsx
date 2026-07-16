import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area, type MediaSize, type Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';

interface AvatarCropOverlayProps {
  /** Data/object URL of the picked image. */
  src: string;
  /** X or "Annuller" — discard the pick, the sheet is unchanged. */
  onCancel: () => void;
  /** "Brug billede" — the cropped 512px square as a File. */
  onAccept: (file: File) => void;
}

const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface PointerSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onValue: (value: number) => void;
  ariaLabel: string;
}

/** Range input driven by captured pointer events: the profile sheet underneath
    is a Radix modal whose scroll-lock preventDefaults touchmove outside its own
    content, which kills the native drag of a range input in this overlay (taps
    still work, drags die). Same pattern as the sheet drag-handle; the input's
    onChange stays for keyboard control. */
function PointerSlider({ min, max, step, value, onValue, ariaLabel }: PointerSliderProps) {
  const ref = useRef<HTMLInputElement>(null);

  const fromPointer = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const stepped = Math.round((min + t * (max - min)) / step) * step;
    onValue(Math.min(max, Math.max(min, stepped)));
  };

  return (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValue(Number(e.target.value))}
      onPointerDown={(e) => {
        // Also suppresses the native drag so the two don't fight
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        fromPointer(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientX);
      }}
      aria-label={ariaLabel}
      className="min-w-0 flex-1 touch-none"
      style={{ accentColor: '#b5502f' }}
    />
  );
}

/** Cropped rect → 512×512 File. Format branches on source alpha (issues/004
    §2a): any transparency → PNG so it survives end-to-end (a transparent
    avatar floats directly over the live map in the TopBar — no background
    fill), opaque sources (photos, the common case) → JPEG q0.9. */
async function exportCrop(src: string, px: Area, rotationDeg: number): Promise<File> {
  const img = new Image();
  img.src = src;
  await img.decode();

  // react-easy-crop reports the pixel rect relative to the ROTATED image's
  // bounding box — render that first, then cut the crop from it.
  let source: HTMLImageElement | HTMLCanvasElement = img;
  const normalized = ((rotationDeg % 360) + 360) % 360;
  if (normalized !== 0) {
    const rot = (normalized * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rot));
    const cos = Math.abs(Math.cos(rot));
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = Math.ceil(w * cos + h * sin);
    rotatedCanvas.height = Math.ceil(w * sin + h * cos);
    const rctx = rotatedCanvas.getContext('2d');
    if (!rctx) throw new Error('canvas 2d context unavailable');
    rctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    rctx.rotate(rot);
    rctx.drawImage(img, -w / 2, -h / 2);
    source = rotatedCanvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(source, px.x, px.y, px.width, px.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const data = ctx.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE).data;
  let transparent = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      transparent = true;
      break;
    }
  }

  const type = transparent ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.9)
  );
  if (!blob) throw new Error('canvas export failed');
  return new File([blob], transparent ? 'avatar.png' : 'avatar.jpg', { type });
}

/*
 * Fullscreen avatar crop step (issues/004 §2a): fixed dark chrome (#141310) in
 * both themes — an immersive media surface like the photo lightbox — with a
 * round react-easy-crop window and a zoom slider. Portaled to <body> at z-[70]
 * so it stacks above the profile sheet's Radix portal (z-50), same reasoning
 * as ImageViewer.
 */
export default function AvatarCropOverlay({ src, onCancel, onAccept }: AvatarCropOverlayProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [exporting, setExporting] = useState(false);
  // The pixel rect only matters on accept — a ref avoids re-rendering per drag
  const areaPixelsRef = useRef<Area | null>(null);

  // Fixed crop-circle diameter, measured from the crop area's container.
  // Without an explicit cropSize, react-easy-crop recomputes the crop area
  // from the ROTATED image's bounding box, so the circle would resize while
  // rotating. objectFit="cover" (below) keeps the image covering the pinned
  // circle at zoom 1 regardless of the image's aspect.
  const [cropDiameter, setCropDiameter] = useState<number | null>(null);
  const cropAreaRef = useCallback((node: HTMLDivElement) => {
    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      setCropDiameter(Math.max(80, Math.floor(Math.min(width, height)) - 48));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Zoom floor: with objectFit="cover", zoom 1 means "covers the whole
  // container" — but the real constraint is only covering the pinned CIRCLE,
  // which for wide/tall images is much less zoomed-in. Allow zooming out to
  // that point. Coverage is judged on the rotated bounding box, matching the
  // library's own position clamping.
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const minZoom = useMemo(() => {
    if (!mediaSize || cropDiameter === null) return MIN_ZOOM;
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const boxWidth = mediaSize.width * cos + mediaSize.height * sin;
    const boxHeight = mediaSize.width * sin + mediaSize.height * cos;
    return Math.min(MIN_ZOOM, Math.max(cropDiameter / boxWidth, cropDiameter / boxHeight));
  }, [mediaSize, cropDiameter, rotation]);

  // Open fully zoomed out: once the real floor is known (media measured), an
  // untouched zoom drops to it so the slider starts at its left end. After the
  // user has zoomed, only clamp upward — rotating back toward 0/90° shrinks
  // the bounding box and raises the floor, and the circle must stay covered.
  const zoomTouchedRef = useRef(false);
  const handleZoomChange = (z: number) => {
    zoomTouchedRef.current = true;
    setZoom(z);
  };
  useEffect(() => {
    setZoom((z) => {
      if (!zoomTouchedRef.current) return minZoom;
      return z < minZoom ? minZoom : z;
    });
  }, [minZoom]);

  /** Snap to the next 90° step, normalized to (-180, 180] — a full flip reads
      "180°", not "-180°" (decided 2026-07-16). */
  const rotateStep = () => {
    setRotation((r) => {
      const next = (((Math.round(r / 90) * 90 + 90) % 360) + 360) % 360;
      return next > 180 ? next - 360 : next;
    });
  };

  // Close on Escape without letting Radix dismiss the sheet underneath
  // (capture phase runs before Radix's document-level listener).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel]);

  const handleAccept = async () => {
    const px = areaPixelsRef.current;
    if (!px || exporting) return;
    setExporting(true);
    try {
      onAccept(await exportCrop(src, px, rotation));
    } catch (error) {
      console.error('Avatar crop export failed:', error);
      setExporting(false);
    }
  };

  /* Portaled to <body>: the profile sheet is a body-level Radix portal (z-50)
     while #root is a fixed layer with its own stacking context — at body level
     this overlay's z-[70] wins. pointer-events-auto: the sheet underneath is a
     Radix modal that sets pointer-events:none on <body> while open. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Beskær billede"
      className="pointer-events-auto fixed inset-0 z-[70] flex animate-ss-fade flex-col bg-[#141310]"
    >
      {/* Header: close button — centered title — spacer */}
      <div className="safe-area-top shrink-0">
        <div className="flex items-center justify-between px-[20px] pb-[14px] pt-[14px]">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Annuller beskæring"
            className="flex size-[40px] items-center justify-center rounded-full bg-[rgba(244,239,227,.1)] text-[#f4efe3] transition-colors hover:bg-[rgba(244,239,227,.2)]"
          >
            <X className="size-[18px]" strokeWidth={1.9} />
          </button>
          <span className="font-serif text-[19px] font-semibold text-[#f4efe3]">
            Beskær billede
          </span>
          <span aria-hidden className="size-[40px]" />
        </div>
      </div>

      {/* Crop area — round window over the design's dark mask */}
      <div ref={cropAreaRef} className="relative min-h-0 flex-1">
        {cropDiameter !== null && (
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          minZoom={minZoom}
          maxZoom={MAX_ZOOM}
          aspect={1}
          cropSize={{ width: cropDiameter, height: cropDiameter }}
          objectFit="cover"
          // NOT onMediaLoaded: that fires with contain-fitted dimensions,
          // before the lib resolves "cover" to vertical/horizontal-cover.
          // setMediaSize re-fires from every computeSizes pass, so the last
          // call carries the real cover-fitted rendered size.
          setMediaSize={setMediaSize}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={handleZoomChange}
          onRotationChange={setRotation}
          onCropComplete={(_, areaPixels) => {
            areaPixelsRef.current = areaPixels;
          }}
          style={{
            containerStyle: { background: '#141310' },
            cropAreaStyle: {
              boxShadow: '0 0 0 9999em rgba(20,15,8,.62)',
              border: '2px solid rgba(255,255,255,.75)',
            },
          }}
        />
        )}
      </div>

      {/* Footer: zoom slider + Annuller / Brug billede */}
      <div
        className="shrink-0 px-[30px] pt-[22px]"
        style={{ paddingBottom: 'calc(34px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mb-[16px] flex items-center gap-[14px]">
          <ZoomOut className="size-[18px] shrink-0 text-[rgba(244,239,227,.55)]" strokeWidth={1.8} />
          <PointerSlider
            min={minZoom}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onValue={handleZoomChange}
            ariaLabel="Zoom"
          />
          <ZoomIn className="size-[18px] shrink-0 text-[rgba(244,239,227,.85)]" strokeWidth={1.8} />
        </div>

        {/* Rotation: slider (two-finger gesture works too) + 90°-step chip */}
        <div className="mb-[20px] flex items-center gap-[14px]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(244,239,227,.7)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v5h-5" />
          </svg>
          <PointerSlider
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onValue={setRotation}
            ariaLabel="Rotation"
          />
          <button
            type="button"
            onClick={rotateStep}
            title="Drej 90°"
            className="min-w-[52px] shrink-0 rounded-[9px] bg-[rgba(244,239,227,.1)] px-[10px] py-[6px] text-center font-mono text-[12.5px] text-[#f4efe3] transition-colors hover:bg-[rgba(244,239,227,.2)]"
          >
            {Math.round(rotation)}°
          </button>
        </div>
        <div className="flex gap-[12px]">
          <button
            type="button"
            onClick={onCancel}
            className="h-[54px] flex-1 rounded-[15px] border border-[rgba(244,239,227,.25)] font-serif text-[16px] font-medium text-[#f4efe3] transition-colors hover:bg-[rgba(244,239,227,.08)]"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={exporting}
            className="flex h-[54px] flex-[1.4] items-center justify-center gap-[8px] rounded-[15px] bg-[#b5502f] font-serif text-[16px] font-semibold text-[#f4efe3] shadow-[0_8px_22px_-6px_rgba(181,80,47,.6)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Check className="size-[18px]" strokeWidth={2} />
            Brug billede
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
