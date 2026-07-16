import { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { MonoLabel } from './ui/MonoLabel';
import { Camera, Eye, EyeOff, Lock, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { WrongPasswordError } from '../lib/api';
import { getAvatarUrl } from '../lib/pocketbase';
import AvatarCropOverlay from './AvatarCropOverlay';
import DiscardChangesDialog from './DiscardChangesDialog';
import PhotoSourceSheet from './PhotoSourceSheet';
import { outsideInteractionStartedInOverlay } from '../utils/sheetInteractOutside';
import { isIOS } from '../utils/platform';
import { useScrollEdges, headerEdgeClass, footerEdgeClass, topMaskStyle } from '../hooks/useScrollEdges';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* Strength meter (issues/004 §2): +1 each for length ≥ 8, mixed case, digit,
   symbol — non-empty input always lights at least the "Svag" bar. */
const STRENGTH_LEVELS = [
  { color: '#b5502f', label: 'Svag' },
  { color: '#c99a2e', label: 'Middel' },
  { color: '#7a8b3e', label: 'God' },
  { color: '#2f6b3a', label: 'Stærk' },
] as const;

function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.max(1, score);
}

/* 14px alert-circle for the inline field errors — same glyph as the discard
   dialog's 28px version. */
const fieldAlertIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.5" />
  </svg>
);

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  /** Accent border for the mismatch / wrong-password states. */
  error?: boolean;
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  error = false,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-[8px] block">
        <MonoLabel>{label}</MonoLabel>
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`h-[54px] w-full rounded-[14px] border bg-surface pl-[16px] pr-[48px] font-serif text-[16px] text-ink outline-none placeholder:text-muted ${
            error ? 'border-accent' : 'border-line focus:border-mono'
          }`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? 'Skjul adgangskode' : 'Vis adgangskode'}
          className="absolute right-[3px] top-1/2 flex size-[42px] -translate-y-1/2 items-center justify-center text-mono"
        >
          {show ? (
            <EyeOff className="size-[18px]" strokeWidth={1.7} />
          ) : (
            <Eye className="size-[18px]" strokeWidth={1.7} />
          )}
        </button>
      </div>
    </div>
  );
}

/*
 * "Rediger profil" bottom sheet (issues/004): avatar photo with crop step,
 * display name, read-only email and an optional password change, in the
 * established three-zone sheet skeleton. Dirty dismissal is guarded by the
 * discard-changes dialog (§7).
 */
export default function ProfileSheet({ open, onOpenChange }: ProfileSheetProps) {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  /** undefined = unchanged, File = new cropped photo, null = removed. */
  const [avatar, setAvatar] = useState<File | null | undefined>(undefined);
  /** Data URL of a freshly picked file — non-null while the crop overlay is up. */
  const [pickedSrc, setPickedSrc] = useState<string | null>(null);
  const [pwCur, setPwCur] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConf, setPwConf] = useState('');
  const [pwShow, setPwShow] = useState({ cur: false, new: false, conf: false });
  const [wrongPw, setWrongPw] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);

  // Camera vs gallery: same mechanism as the spot-image flow (ImageCapture) —
  // two hidden inputs, the camera one with capture="environment"
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { ref: bodyRef, atTop, atBottom } = useScrollEdges();

  // Fresh form every time the sheet opens; deliberately NOT re-run on user
  // changes while open (a mid-edit refreshAuth must not wipe the fields).
  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setAvatar(undefined);
      setPickedSrc(null);
      setPwCur('');
      setPwNew('');
      setPwConf('');
      setPwShow({ cur: false, new: false, conf: false });
      setWrongPw(false);
      setShowDiscard(false);
      setPhotoSourceOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const previewUrl = useMemo(
    () => (avatar instanceof File ? URL.createObjectURL(avatar) : null),
    [avatar]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!user) return null;

  const storedAvatarUrl = getAvatarUrl(user);
  const displayedSrc = avatar instanceof File ? previewUrl : avatar === null ? null : storedAvatarUrl;
  const hasPhoto = displayedSrc !== null;

  const pwDirty = pwCur !== '' || pwNew !== '' || pwConf !== '';
  const pwValid = pwCur !== '' && pwNew.length >= 8 && pwConf === pwNew;
  const pwMismatch = pwConf !== '' && pwConf !== pwNew;
  const canSave = name.trim() !== '' && (!pwDirty || pwValid);
  const isDirty = name !== user.name || avatar !== undefined || pwDirty;

  const strength = STRENGTH_LEVELS[passwordScore(pwNew) - 1];

  /** Scrim, header X, swipe and Escape all land here (§7). */
  const requestClose = () => {
    if (isDirty) setShowDiscard(true);
    else onOpenChange(false);
  };

  /** "Skift billede" / camera badge. iOS's plain file input already presents
      a native Take Photo / Photo Library chooser, so the custom drawer would
      be a redundant double-ask there — go straight to the gallery input. */
  const openPhotoPicker = () => {
    if (isIOS) galleryInputRef.current?.click();
    else setPhotoSourceOpen(true);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so re-picking the same file fires change again
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPickedSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    if (!hasPhoto) return;
    // With a stored avatar → mark for deletion; a merely picked one → revert
    setAvatar(user.avatar ? null : undefined);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || updateProfile.isPending) return;
    const profileChanged = name !== user.name || avatar !== undefined;
    updateProfile.mutate(
      {
        userId: user.id,
        email: user.email,
        profile: profileChanged ? { name, avatar } : undefined,
        password: pwDirty ? { oldPassword: pwCur, password: pwNew } : undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          if (error instanceof WrongPasswordError) setWrongPw(true);
        },
      }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) requestClose(); }}>
        <SheetContent
          side="bottom"
          // The crop overlay and discard dialog render outside the sheet's
          // portal — their taps must not count as outside dismissal (see the
          // helper for why the open-flag alone is not enough on touch)
          onInteractOutside={(e) => {
            if (pickedSrc || outsideInteractionStartedInOverlay(e)) e.preventDefault();
          }}
          className="max-h-[94%] bg-bg sm:mx-auto sm:max-w-[520px]"
        >
          {/* Header: Spectral 23px title + 36px circular close button */}
          <div className={`flex shrink-0 items-center justify-between px-[24px] pb-[14px] pt-[20px] ${headerEdgeClass(atTop)}`}>
            <SheetTitle className="text-[23px] font-semibold leading-none text-ink">
              Rediger profil
            </SheetTitle>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Luk"
              className="flex size-[36px] shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:bg-line2"
            >
              <X className="size-[16px]" strokeWidth={1.9} />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <div
              ref={bodyRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-[24px] pb-[24px] pt-[22px]"
              style={topMaskStyle(atTop)}
            >
              {/* Avatar uploader: 104px circle + camera badge + button row.
                  No backdrop behind the photo — transparent avatars show the
                  surface behind by design (issues/004 §2a). */}
              <div className="flex flex-col items-center gap-[14px]">
                <div className="relative">
                  <div
                    className="size-[104px] overflow-hidden rounded-full"
                    style={{
                      border: '3px solid var(--pin-ring)',
                      boxShadow: '0 0 0 1px var(--line), 0 8px 22px -8px rgba(20,15,8,.4)',
                    }}
                  >
                    {displayedSrc ? (
                      <img src={displayedSrc} alt="Profilbillede" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-brand font-serif text-[40px] font-semibold text-brand-ink">
                        {name.charAt(0).toUpperCase() || user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openPhotoPicker}
                    aria-label="Skift profilbillede"
                    className="absolute -bottom-[2px] -right-[2px] flex size-[38px] items-center justify-center rounded-full bg-accent text-accent-ink"
                    style={{ border: '3px solid var(--bg)' }}
                  >
                    <Camera className="size-[17px]" strokeWidth={1.8} />
                  </button>
                </div>
                <div className="flex gap-[10px]">
                  <button
                    type="button"
                    onClick={openPhotoPicker}
                    className="h-[40px] rounded-[12px] border border-line bg-surface px-[16px] font-serif text-[14px] font-medium text-ink transition-colors hover:bg-line2"
                  >
                    Skift billede
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    aria-disabled={!hasPhoto}
                    className={`h-[40px] rounded-[12px] border border-line bg-transparent px-[16px] font-serif text-[14px] font-medium text-accent ${
                      hasPhoto ? 'transition-colors hover:bg-surface' : 'cursor-not-allowed opacity-40'
                    }`}
                  >
                    Fjern
                  </button>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFilePick}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFilePick}
                  className="hidden"
                />
              </div>

              {/* Navn */}
              <label htmlFor="profile-name" className="mb-[8px] mt-[26px] block">
                <MonoLabel>Navn</MonoLabel>
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="h-[54px] w-full rounded-[14px] border border-line bg-surface px-[16px] font-serif text-[16px] text-ink outline-none placeholder:text-muted focus:border-mono"
              />

              {/* E-mail — read-only: recessed line2 bg + dashed border + lock */}
              <div className="mb-[8px] mt-[16px]">
                <MonoLabel>E-mail</MonoLabel>
              </div>
              <div className="flex h-[54px] items-center gap-[10px] rounded-[14px] border border-dashed border-line bg-line2 px-[16px]">
                <span className="min-w-0 flex-1 truncate font-serif text-[16px] text-muted">
                  {user.email}
                </span>
                <Lock className="size-[16px] shrink-0 text-mono" strokeWidth={1.8} />
              </div>

              {/* Skift adgangskode — hairline / label / hairline */}
              <div className="mb-[14px] mt-[30px] flex items-center gap-[12px]">
                <span aria-hidden className="h-px flex-1 bg-line2" />
                <MonoLabel>Skift adgangskode</MonoLabel>
                <span aria-hidden className="h-px flex-1 bg-line2" />
              </div>

              <div className="flex flex-col gap-[16px]">
                <div>
                  <PasswordField
                    id="profile-pw-current"
                    label="Nuværende adgangskode"
                    placeholder="••••••••"
                    value={pwCur}
                    onChange={(value) => {
                      setPwCur(value);
                      setWrongPw(false);
                    }}
                    show={pwShow.cur}
                    onToggleShow={() => setPwShow((s) => ({ ...s, cur: !s.cur }))}
                    autoComplete="current-password"
                    error={wrongPw}
                  />
                  {wrongPw && (
                    <div className="mt-[8px] flex h-[16px] animate-ss-fade items-center gap-[6px] text-accent">
                      {fieldAlertIcon}
                      <span className="font-serif text-[12.5px]">Forkert nuværende adgangskode</span>
                    </div>
                  )}
                </div>

                <div>
                  <PasswordField
                    id="profile-pw-new"
                    label="Ny adgangskode"
                    placeholder="Mindst 8 tegn"
                    value={pwNew}
                    onChange={setPwNew}
                    show={pwShow.new}
                    onToggleShow={() => setPwShow((s) => ({ ...s, new: !s.new }))}
                    autoComplete="new-password"
                  />
                  {pwNew !== '' && (
                    <div className="mt-[8px] flex h-[16px] animate-ss-fade items-center gap-[6px]">
                      {STRENGTH_LEVELS.map((level, i) => (
                        <span
                          key={level.label}
                          className="h-[4px] flex-1 rounded-full bg-line2 dark:bg-[#4a4534]"
                          style={i < passwordScore(pwNew) ? { background: strength.color } : undefined}
                        />
                      ))}
                      <span className="ml-[4px] font-mono text-[10.5px]" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <PasswordField
                    id="profile-pw-confirm"
                    label="Gentag ny adgangskode"
                    placeholder="Gentag adgangskode"
                    value={pwConf}
                    onChange={setPwConf}
                    show={pwShow.conf}
                    onToggleShow={() => setPwShow((s) => ({ ...s, conf: !s.conf }))}
                    autoComplete="new-password"
                    error={pwMismatch}
                  />
                  {pwMismatch && (
                    <div className="mt-[8px] flex h-[16px] animate-ss-fade items-center gap-[6px] text-accent">
                      {fieldAlertIcon}
                      <span className="font-serif text-[12.5px]">Adgangskoderne er ikke ens</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned footer — inert + dimmed until saveable, like "Gem fund" */}
            <div className={`shrink-0 px-[24px] pb-[30px] pt-[14px] ${footerEdgeClass(atBottom)}`}>
              <Button
                type="submit"
                size="lg"
                disabled={!canSave || updateProfile.isPending}
                className="w-full disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-[.45]"
              >
                {updateProfile.isPending ? 'Gemmer…' : 'Gem ændringer'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Camera-or-gallery chooser; the input .click() stays inside the tap
          handler's call stack (iOS requires the user gesture) */}
      <PhotoSourceSheet
        open={photoSourceOpen}
        onOpenChange={setPhotoSourceOpen}
        onPickCamera={() => {
          cameraInputRef.current?.click();
          setPhotoSourceOpen(false);
        }}
        onPickGallery={() => {
          galleryInputRef.current?.click();
          setPhotoSourceOpen(false);
        }}
      />

      {/* Fullscreen crop step above the sheet */}
      {pickedSrc && (
        <AvatarCropOverlay
          src={pickedSrc}
          onCancel={() => setPickedSrc(null)}
          onAccept={(file) => {
            setAvatar(file);
            setPickedSrc(null);
          }}
        />
      )}

      {/* Discard-changes guard (§7) */}
      <DiscardChangesDialog
        isOpen={showDiscard}
        onClose={() => setShowDiscard(false)}
        onConfirm={() => {
          setShowDiscard(false);
          onOpenChange(false);
        }}
        description="Dine profilændringer bliver ikke gemt."
      />
    </>
  );
}
