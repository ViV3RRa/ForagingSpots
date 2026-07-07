import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MonoLabel } from './ui/MonoLabel';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';

interface SignUpScreenProps {
  onSignUp: (name: string, email: string, password: string) => Promise<boolean>;
  onBack: () => void;
  onSignIn: () => void;
}

export default function SignUpScreen({ onSignUp, onBack, onSignIn }: SignUpScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await onSignUp(name, email, password);
      if (!success) {
        setError('Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setError('An error occurred during sign up');
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
            Opret en konto
          </h1>
          <p className="mb-[32px] text-[15px] text-ink2">
            Kom i gang med at markere dine steder.
          </p>

          <div className="flex flex-col gap-[18px]">
            <div>
              <label htmlFor="name" className="mb-[8px] block">
                <MonoLabel className="tracking-[0.12em]">Navn</MonoLabel>
              </label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dit navn"
                required
              />
            </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={showPassword ? 'pr-[52px]' : 'pr-[52px] tracking-[3px]'}
                  required
                  minLength={6}
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
            <div
              className="mt-[18px] rounded-[14px] border px-[16px] py-[12px] text-[14px] text-accent"
              style={{
                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
              }}
            >
              {error}
            </div>
          )}

          <div className="mt-[24px] rounded-[14px] border border-line bg-surface p-[14px] text-center text-[12px] leading-[1.5] text-muted-foreground">
            Ved at oprette en konto accepterer du at følge bæredygtig sankning og lokale regler.
          </div>
        </div>

        {/* Bottom-anchored CTA */}
        <div className="flex flex-col gap-[12px] px-[30px] pb-[max(40px,env(safe-area-inset-bottom))] pt-[16px]">
          <Button type="submit" size="lg" disabled={isLoading} className="w-full">
            {isLoading ? 'Opretter konto...' : 'Opret konto'}
          </Button>
          <Button type="button" variant="ghost" onClick={onSignIn} className="w-full text-[14.5px]">
            Har du allerede en konto? Log ind
          </Button>
        </div>
      </form>
    </div>
  );
}
