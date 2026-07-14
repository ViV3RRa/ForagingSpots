import { useState } from 'react';
import { ArrowLeft, Camera, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { MonoLabel } from './ui/MonoLabel';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from './ui/sheet';
import TypeBadge from './TypeBadge';
import type { ForagingType } from './types';
import { FORAGING_TYPES } from './types';
import { getDanishLabel } from '../utils/danishLabels';

/*
 * Dev-only showcase of the redesigned UI primitives (subtask 1.3), rendered in
 * both themes for visual verification. Reachable via the 'icons' screen in
 * App.tsx (not wired into normal navigation).
 */

const BADGE_SIZES = [44, 52, 60, 72];
const BADGE_TYPES: ForagingType[] = ['chanterelle', 'blueberry', 'porcini', 'raspberry'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <MonoLabel>{title}</MonoLabel>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PrimitivesPanel({ title, onOpenSheet }: { title: string; onOpenSheet: () => void }) {
  return (
    <div className="rounded-[28px] bg-bg text-ink p-6 space-y-8 shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
      <header>
        <MonoLabel>Skovens Skatte · primitives</MonoLabel>
        <h2 className="mt-1">{title}</h2>
      </header>

      <Section title="Buttons">
        <Button size="lg" className="w-full">Kom i gang</Button>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Gem fund</Button>
          <Button variant="brand">Naviger</Button>
          <Button variant="destructive">Slet fund</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary"><Camera />Tilføj foto</Button>
          <Button variant="outline">Annullér</Button>
          <Button variant="ghost">Ikke nu</Button>
          <Button variant="link">Redigér ›</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="icon-sm" aria-label="Luk"><X /></Button>
          <Button variant="secondary" size="icon" aria-label="Tilbage"><ArrowLeft /></Button>
          <Button variant="secondary" size="icon-lg" aria-label="Slet" className="text-accent"><Trash2 /></Button>
          <Button size="sm">Lille knap</Button>
          <Button disabled>Deaktiveret</Button>
        </div>
      </Section>

      <Section title="Felter">
        <div className="space-y-2">
          <Label htmlFor={`email-${title}`}>E-mail</Label>
          <Input id={`email-${title}`} type="email" placeholder="emil@skoven.dk" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`pw-${title}`}>Adgangskode</Label>
          <Input id={`pw-${title}`} type="password" placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`notes-${title}`}>Noter</Label>
          <Textarea id={`notes-${title}`} placeholder="Fx: under birketræerne, tre store eksemplarer…" />
        </div>
      </Section>

      <Section title="Type badge">
        <div className="flex flex-wrap items-end gap-5">
          {BADGE_SIZES.map((size, i) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <TypeBadge type={BADGE_TYPES[i]} size={size} />
              <MonoLabel>{size}px</MonoLabel>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <TypeBadge type="lingonberry" size={60} ring={false} />
            <MonoLabel>60px · uden ring</MonoLabel>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3 pt-2">
          {FORAGING_TYPES.map((type) => (
            <div key={type} className="flex flex-col items-center gap-1.5 text-center">
              <TypeBadge type={type} size={44} ring={false} />
              <span className="text-[10.5px] leading-tight text-ink2">{getDanishLabel(type)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Mono label">
        <div className="flex flex-col gap-2">
          <MonoLabel>Koordinater</MonoLabel>
          <span className="font-mono text-[13px] text-ink">56.1234° N · 10.2038° E</span>
        </div>
      </Section>

      <Section title="Bottom sheet">
        <Button variant="secondary" onClick={onOpenSheet}>Åbn bottom sheet</Button>
      </Section>
    </div>
  );
}

export default function IconShowcase() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto bg-[#d7d2c7] p-6">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 items-start">
        <PrimitivesPanel title="Lys" onOpenSheet={() => setSheetOpen(true)} />
        <div className="dark">
          <PrimitivesPanel title="Mørk" onOpenSheet={() => setSheetOpen(true)} />
        </div>
      </div>

      {/* The sheet portals to <body>, so it follows the app-level theme (toggle .dark on <html> to verify dark). */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-md">
          <div className="flex items-center justify-between border-b border-line2 px-6 pt-2 pb-4">
            <SheetTitle className="text-[23px] text-ink m-0">Nyt fund</SheetTitle>
            <SheetClose asChild>
              <Button variant="secondary" size="icon-sm" aria-label="Luk"><X /></Button>
            </SheetClose>
          </div>
          <div className="space-y-5 px-6 py-5">
            <SheetDescription className="text-[15px] text-ink2 m-0">
              Sheet-chrome fra designet: 28px topradius, grab handle, mørk scrim og rise/fade-animationer.
            </SheetDescription>
            <div className="space-y-2">
              <Label htmlFor="sheet-notes">Noter</Label>
              <Textarea id="sheet-notes" placeholder="Fx: under birketræerne, tre store eksemplarer…" />
            </div>
            <Button size="lg" className="w-full" onClick={() => setSheetOpen(false)}>Gem fund</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
