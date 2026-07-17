import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { useHistoryLayer } from '../hooks/useHistoryLayer';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  /** Subject rendered quoted before the description, e.g. "“Kantarel” fjernes permanent…" */
  subjectName?: string;
  /** Glyph inside the tinted circle; defaults to the design's trash icon */
  icon?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  /** Extra classes on the panel — e.g. a z-lift above fullscreen overlays. */
  className?: string;
  /** Matching z-lift for the scrim (see DialogContent.overlayClassName). */
  overlayClassName?: string;
}

const trashIcon = (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  subjectName,
  icon = trashIcon,
  confirmText = 'Bekræft',
  cancelText = 'Annullér',
  isLoading = false,
  className,
  overlayClassName,
}: ConfirmationDialogProps) {
  // Native back dismisses the dialog (cancel path); vetoed mid-action so a
  // running delete/save isn't left without its dialog
  useHistoryLayer(isOpen, () => {
    if (isLoading) return false;
    onClose();
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={overlayClassName}
        className={cn(
          'block w-[calc(100%-68px)] max-w-[340px] rounded-[24px] border-none bg-bg px-[26px] pb-[22px] pt-[28px] text-center shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:max-w-[340px]',
          className,
        )}
      >
        {/* delTint circle — accent at low opacity, per theme */}
        <div className="mx-auto mb-[16px] flex size-[60px] items-center justify-center rounded-full bg-[rgba(181,80,47,0.12)] text-accent dark:bg-[rgba(201,162,75,0.16)]">
          {icon}
        </div>
        <DialogTitle className="mb-[8px] font-serif text-[22px] font-semibold leading-[1.25] text-ink">
          {title}
        </DialogTitle>
        <DialogDescription className="mb-[24px] text-[14.5px] leading-[1.55] text-ink2">
          {subjectName && <>“{subjectName}” </>}
          {description}
        </DialogDescription>
        <div className="flex flex-col gap-[10px]">
          <Button
            variant="destructive"
            className="w-full"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Vent…' : confirmText}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
