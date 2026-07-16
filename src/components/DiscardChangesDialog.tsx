import ConfirmationDialog from './ConfirmationDialog';

/*
 * The designed discard-changes guard dialog (issues/004 §7): ConfirmationDialog
 * with the alert-circle glyph and fixed title/buttons — only the body copy
 * varies per surface (profile sheet, add/edit sheet, location editor).
 */

const alertCircleIcon = (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.5" />
  </svg>
);

interface DiscardChangesDialogProps {
  isOpen: boolean;
  /** "Bliv og rediger" or a tap on the dialog's scrim — the form stays intact. */
  onClose: () => void;
  /** "Kassér ændringer" — the caller closes its surface and resets state. */
  onConfirm: () => void;
  /** Surface-specific body, e.g. "Dine profilændringer bliver ikke gemt." */
  description: string;
  /** Lift dialog + scrim above a fullscreen overlay (location editor, z-60). */
  elevated?: boolean;
}

export default function DiscardChangesDialog({
  isOpen,
  onClose,
  onConfirm,
  description,
  elevated = false,
}: DiscardChangesDialogProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Kassér ændringer?"
      description={description}
      confirmText="Kassér ændringer"
      cancelText="Bliv og rediger"
      icon={alertCircleIcon}
      className={elevated ? 'z-[80]' : undefined}
      overlayClassName={elevated ? 'z-[80]' : undefined}
    />
  );
}
