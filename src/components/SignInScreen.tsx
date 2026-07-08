import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MonoLabel } from './ui/MonoLabel';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';

interface SignInScreenProps {
  onSignIn: (email: string, password: string) => Promise<boolean>;
  onBack: () => void;
}

export default function SignInScreen({ onSignIn, onBack }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await onSignIn(email, password);
      if (!success) {
        setError({
          title: 'Forkert e-mail eller adgangskode',
          detail: 'Tjek dine oplysninger og prøv igen.',
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError({ title: 'Noget gik galt', detail: 'Prøv igen om et øjeblik.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Back to welcome */}
      <div className="px-[26px] pt-[max(20px,calc(env(safe-area-inset-top)+8px))]">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onBack}
          aria-label="Tilbage"
          className="size-[42px]"
        >
          <ChevronLeft className="size-[20px]" strokeWidth={1.9} />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex-1 px-[30px] pt-[30px]">
          <h1 className="mb-[6px] font-serif text-[34px] font-semibold leading-[1.15] text-ink">
            Velkommen tilbage
          </h1>
          <p className="mb-[32px] text-[15px] text-ink2">
            Log ind for at se dine markerede steder.
          </p>

          <div className="flex flex-col gap-[18px]">
            <div>
              <label htmlFor="email" className="mb-[8px] block">
                <MonoLabel className="tracking-[0.12em]">E-mail</MonoLabel>
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.dk"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-[8px] block">
                <MonoLabel className="tracking-[0.12em]">Adgangskode</MonoLabel>
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={showPassword ? 'pr-[52px]' : 'pr-[52px] tracking-[3px]'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Skjul adgangskode' : 'Vis adgangskode'}
                  className="absolute right-[16px] top-1/2 flex -translate-y-1/2 text-faint hover:text-ink2"
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" strokeWidth={1.7} />
                  ) : (
                    <Eye className="size-[18px]" strokeWidth={1.7} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-[20px] flex animate-ss-fade items-start gap-[11px] rounded-[14px] border border-[rgba(181,80,47,0.35)] bg-[rgba(181,80,47,0.10)] px-[15px] py-[13px] dark:border-[rgba(201,162,75,0.4)] dark:bg-[rgba(201,162,75,0.14)]">
              <span className="mt-[1px] flex text-accent">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 8v5M12 16.5v.5" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <div>
                <div className="font-serif text-[14.5px] font-semibold text-accent">
                  {error.title}
                </div>
                <div className="mt-[2px] text-[12.5px] text-ink2">{error.detail}</div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom-anchored CTA */}
        <div className="px-[30px] pb-[max(40px,env(safe-area-inset-bottom))] pt-[16px]">
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className={isLoading ? 'w-full gap-[10px] disabled:opacity-[0.85]' : 'w-full'}
          >
            {isLoading ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" className="size-[20px] animate-ss-spin">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    opacity="0.35"
                  />
                  <path
                    d="M12 3a9 9 0 0 1 9 9"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
                Logger ind…
              </>
            ) : (
              'Log ind'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
