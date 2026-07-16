import { Sheet, SheetContent, SheetTitle } from './ui/sheet';

/*
 * Small bottom sheet asking where a photo should come from (issues/004 §2):
 * camera or gallery. The caller owns the two hidden file inputs — same
 * mechanism as the spot-image flow (ImageCapture): a `capture="environment"`
 * input for the camera and a plain `accept="image/*"` one for the gallery.
 * Dismissal is free (scrim, swipe, Escape, Annuller) — nothing to guard.
 */

const cameraIcon = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8h3l1.5-2h9L18 8h3v11H3z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
);

const galleryIcon = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.8" />
    <path d="M4 18l5-5 4 3.5 3-2.5 4 4" />
  </svg>
);

interface PhotoSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickCamera: () => void;
  onPickGallery: () => void;
}

export default function PhotoSourceSheet({
  open,
  onOpenChange,
  onPickCamera,
  onPickGallery,
}: PhotoSourceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-bg sm:mx-auto sm:max-w-[520px]">
        <SheetTitle className="sr-only">Vælg fotokilde</SheetTitle>
        {/* Padding lives on an inner wrapper: on the content root it would
            fight the sheet's own .safe-area-bottom (env() is 0 on Android,
            which ate the bottom padding entirely) */}
        <div className="px-[16px] pb-[30px]">
        <button
          type="button"
          onClick={onPickCamera}
          className="flex w-full items-center gap-[15px] rounded-[15px] px-[14px] py-[15px] text-left transition-colors hover:bg-surface"
        >
          <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] bg-brand text-brand-ink">
            {cameraIcon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[16.5px] font-semibold text-ink">
              Tag et billede
            </span>
            <span className="block text-[13px] text-muted">Brug kameraet</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onPickGallery}
          className="flex w-full items-center gap-[15px] rounded-[15px] px-[14px] py-[15px] text-left transition-colors hover:bg-surface"
        >
          <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] border border-line bg-surface text-ink">
            {galleryIcon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[16.5px] font-semibold text-ink">
              Vælg fra galleri
            </span>
            <span className="block text-[13px] text-muted">Vælg et eksisterende billede</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-[8px] flex h-[52px] w-full items-center justify-center rounded-[14px] border border-line font-serif text-[16px] font-medium text-ink2 transition-colors hover:bg-surface"
        >
          Annuller
        </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
