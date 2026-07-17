import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Map from 'react-map-gl';
import { ChevronLeft, MapPin } from 'lucide-react';
import type { Coordinates } from '../lib/types';
import type { ForagingType } from './types';
import TypeBadge from './TypeBadge';
import { Button } from './ui/button';
import { getMapStyle, MAPBOX_ACCESS_TOKEN } from '../utils/mapbox';
import { useTheme } from '../hooks/useTheme';
import { useHistoryLayer } from '../hooks/useHistoryLayer';

interface LocationEditorScreenProps {
  initialCoordinates: Coordinates;
  /** Type for the center pin badge; omitted → generic brand pin. */
  type?: ForagingType;
  /** GPS accuracy in meters; the "± N m" hint is omitted when unknown. */
  accuracy?: number;
  onSave: (coordinates: Coordinates) => void;
  onClose: () => void;
}

const formatCoordinates = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'Ø' : 'V'}`;

/*
 * Fullscreen "Flyt placering" editor from the design: the map pans underneath
 * a fixed center pin that lifts while dragging. The confirmed position is
 * always the map center. Replaces the old dialog-based LocationPickerModal
 * but keeps its callback contract. Only reachable from the add/edit sheet's
 * Placering field, so backing out needs no discard guard — it just returns
 * to the sheet without applying anything.
 */
export default function LocationEditorScreen({
  initialCoordinates,
  type,
  accuracy,
  onSave,
  onClose,
}: LocationEditorScreenProps) {
  const { theme } = useTheme();
  const [coordinates, setCoordinates] = useState<Coordinates>(initialCoordinates);
  const [dragging, setDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);

  // Native back = the back button (mounted only while open)
  useHistoryLayer(true, onClose);

  // Close on Escape without letting Radix dismiss the sheet underneath
  // (capture phase runs before Radix's document-level listener).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  /* Portaled to <body>: the bottom sheets are body-level Radix portals (z-50)
     while #root is a fixed layer with its own stacking context — rendered
     inside #root, no z-index could lift this overlay above an open sheet. At
     body level its z-[60] wins, and the transformed body (tokens.css) sizes
     the fixed frame correctly on every surface. pointer-events-auto: the
     sheet underneath is a Radix modal that sets pointer-events:none on <body>
     while open. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Flyt placering"
      className="pointer-events-auto fixed inset-0 z-[60] animate-ss-fade overflow-hidden bg-map-bg"
    >
      <Map
        initialViewState={{
          longitude: initialCoordinates.lng,
          latitude: initialCoordinates.lat,
          zoom: 16,
        }}
        onMove={(evt) =>
          setCoordinates({ lat: evt.viewState.latitude, lng: evt.viewState.longitude })
        }
        onDragStart={() => {
          setDragging(true);
          setHasDragged(true);
        }}
        onDragEnd={() => setDragging(false)}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={getMapStyle(theme)}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Fixed center pin — bottom of the stem sits on the map center */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div
          className="transition-transform duration-[120ms] ease-out"
          style={{ transform: dragging ? 'translateY(-10px)' : 'translateY(0)' }}
        >
          {type ? (
            <TypeBadge type={type} size={60} stem />
          ) : (
            <div className="flex flex-col items-center">
              <div
                className="flex size-[60px] items-center justify-center rounded-full bg-brand"
                style={{
                  border: '4px solid var(--pin-ring)',
                  boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.3), 0 8px 18px rgba(0,0,0,0.4)',
                }}
              >
                <MapPin className="size-[26px] text-brand-ink" strokeWidth={2} />
              </div>
              <div aria-hidden style={{ width: 2, height: 12, background: 'var(--pin-ring)', marginTop: -1 }} />
            </div>
          )}
        </div>
        {/* Ground shadow grows while the pin is lifted */}
        <div
          aria-hidden
          className="mx-auto mt-[2px] h-[7px] rounded-full bg-[rgba(20,15,8,0.28)] blur-[1px] transition-[width] duration-[120ms] ease-out"
          style={{ width: dragging ? 26 : 18 }}
        />
      </div>

      {/* Top bar: circular back button + title pill */}
      <div className="pointer-events-none absolute inset-x-0 top-0 safe-area-top">
        <div className="flex items-center gap-[12px] px-[18px] pb-[10px] pt-[14px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Annullér"
            className="pointer-events-auto flex size-[44px] shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-[0_3px_10px_var(--shadow)] transition-colors hover:bg-line2"
          >
            <ChevronLeft className="size-[20px]" strokeWidth={1.9} />
          </button>
          <div className="flex h-[44px] flex-1 items-center justify-center rounded-[14px] border border-line bg-surface font-serif text-[15.5px] font-semibold text-ink shadow-[0_3px_10px_var(--shadow)]">
            Flyt placering
          </div>
        </div>
      </div>

      {/* Hint chip — fades out after the first drag */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[20px] border border-line bg-surface px-[13px] py-[5px] font-serif text-[13px] italic text-ink2 transition-opacity duration-300"
        style={{ top: 'calc(50% + 34px)', opacity: hasDragged ? 0 : 0.94 }}
      >
        Træk kortet for at placere pin
      </div>

      {/* Bottom confirm card + CTA over a gradient into --bg */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          padding: '18px 22px calc(34px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(rgba(0,0,0,0), var(--bg) 34%)',
        }}
      >
        <div className="mb-[12px] flex items-center gap-[10px] rounded-[16px] border border-line bg-surface px-[16px] py-[12px] shadow-[0_6px_18px_var(--shadow)]">
          <span className="size-[9px] shrink-0 rounded-full bg-brand" />
          <span className="truncate font-mono text-[13.5px] text-ink">
            {formatCoordinates(coordinates.lat, coordinates.lng)}
          </span>
          {accuracy != null && (
            <span className="ml-auto shrink-0 font-mono text-[11px] text-mono">
              ± {Math.round(accuracy)} m
            </span>
          )}
        </div>
        <Button size="lg" className="w-full" onClick={() => onSave(coordinates)}>
          Bekræft placering
        </Button>
      </div>
    </div>,
    document.body,
  );
}
