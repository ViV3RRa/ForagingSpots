import { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { MonoLabel } from './ui/MonoLabel';
import TypeBadge from './TypeBadge';
import { FORAGING_TYPES, type ForagingType } from './types';
import type { ForagingSpot } from '../lib/types';
import { getDanishLabel } from '../utils/danishLabels';
import { getAllForagingTypesSet, getTypesInCategory, type ForagingCategory } from '../utils/foragingTypes';
import { useScrollEdges, headerEdgeClass, footerEdgeClass, topMaskStyle } from '../hooks/useScrollEdges';
import { useHistoryLayer } from '../hooks/useHistoryLayer';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Used to derive the species checklist from the types present in the user's finds. */
  spots: ForagingSpot[];
  activeFilters: Set<ForagingType>;
  onApplyFilters: (filters: Set<ForagingType>) => void;
}

type CategoryKey = 'all' | Extract<ForagingCategory, 'mushroom' | 'berry'>;

const CATEGORY_SEGMENTS: ReadonlyArray<{ key: CategoryKey; label: string }> = [
  { key: 'all', label: 'Alle' },
  { key: 'mushroom', label: 'Svampe' },
  { key: 'berry', label: 'Bær' },
];

// Highlight the segment that exactly matches the current selection; any other
// mix (including partial toggles) falls back to "Alle".
function deriveCategory(filters: Set<ForagingType>): CategoryKey {
  const matches = (types: ForagingType[]) =>
    filters.size === types.length && types.every((type) => filters.has(type));
  if (matches(getTypesInCategory('mushroom'))) return 'mushroom';
  if (matches(getTypesInCategory('berry'))) return 'berry';
  return 'all';
}

export default function FilterDialog({
  open,
  onOpenChange,
  spots,
  activeFilters,
  onApplyFilters
}: FilterDialogProps) {
  // Local state for temporary filter selections; applied on "Vis resultater"
  const [tempFilters, setTempFilters] = useState<Set<ForagingType>>(new Set(activeFilters));
  const { ref: bodyRef, atTop, atBottom } = useScrollEdges();
  const [category, setCategory] = useState<CategoryKey>(deriveCategory(activeFilters));

  // Reset temp state when the sheet opens or activeFilters change
  useEffect(() => {
    if (open) {
      setTempFilters(new Set(activeFilters));
      setCategory(deriveCategory(activeFilters));
    }
  }, [open, activeFilters]);

  // Species rows are driven by the types present in the user's spots (in
  // FORAGING_TYPES order), falling back to all types when there are no spots.
  const speciesTypes = useMemo(() => {
    const present = new Set(spots.map((spot) => spot.type));
    const presentInOrder = FORAGING_TYPES.filter((type) => present.has(type));
    return presentInOrder.length > 0 ? presentInOrder : [...FORAGING_TYPES];
  }, [spots]);

  // Bulk-select over the full type list (not just visible rows) so hidden
  // types stay consistent with the chosen category on the map and list.
  const handleCategorySelect = (key: CategoryKey) => {
    setCategory(key);
    setTempFilters(key === 'all' ? getAllForagingTypesSet() : new Set(getTypesInCategory(key)));
  };

  // Individual toggles keep the category highlight as-is (mock behavior)
  const handleSpeciesToggle = (type: ForagingType) => {
    setTempFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleReset = () => {
    setCategory('all');
    setTempFilters(getAllForagingTypesSet());
  };

  const handleApply = () => {
    onApplyFilters(new Set(tempFilters));
    onOpenChange(false);
  };

  // Scrim tap / swipe-down discards temp changes (state re-syncs on next open)
  const handleCancel = () => {
    onOpenChange(false);
  };

  // Native back dismisses the filter sheet like a scrim tap
  useHistoryLayer(open, handleCancel);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <SheetContent
        side="bottom"
        handle={false}
        className="max-h-[86%] bg-bg sm:mx-auto sm:max-w-[520px]"
      >
        {/* Header: Spectral 23px title + accent reset link; hairline/shadow appear on scroll */}
        <div className={`flex shrink-0 items-center justify-between px-[24px] pb-[14px] pt-[20px] ${headerEdgeClass(atTop)}`}>
          <SheetTitle className="text-[23px] font-semibold leading-none text-ink">
            Filtrér
          </SheetTitle>
          <button
            type="button"
            onClick={handleReset}
            className="font-serif text-[14px] text-accent transition-opacity hover:opacity-80"
          >
            Nulstil
          </button>
        </div>

        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-[24px] pb-[20px] pt-[20px]"
          style={topMaskStyle(atTop)}
        >
          {/* Kategori: three equal segments, active = accent fill */}
          <MonoLabel className="mb-[12px] block">Kategori</MonoLabel>
          <div className="mb-[22px] flex gap-[9px]">
            {CATEGORY_SEGMENTS.map(({ key, label }) => {
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCategorySelect(key)}
                  aria-pressed={active}
                  className={`h-[46px] flex-1 rounded-[13px] border border-line font-serif text-[14.5px] font-semibold transition-colors ${
                    active ? 'bg-accent text-accent-ink' : 'bg-surface text-ink2'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Arter: checklist rows with 44px badge + square accent checkbox */}
          <MonoLabel className="mb-[8px] block">Arter</MonoLabel>
          <div className="flex flex-col">
            {speciesTypes.map((type) => {
              const checked = tempFilters.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSpeciesToggle(type)}
                  role="checkbox"
                  aria-checked={checked}
                  className="flex w-full items-center gap-[13px] border-b border-line2 px-[2px] py-[12px] text-left"
                >
                  <TypeBadge
                    type={type}
                    size={44}
                    ring={false}
                    style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.3)' }}
                  />
                  <span className="flex-1 truncate font-serif text-[17px] text-ink">
                    {getDanishLabel(type)}
                  </span>
                  <span
                    aria-hidden
                    className={`flex size-[26px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] transition-colors ${
                      checked ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-transparent'
                    }`}
                  >
                    {checked && <Check className="size-[15px]" strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer: accent apply CTA; hairline/shadow only while content remains below */}
        <div className={`shrink-0 px-[24px] pb-[20px] pt-[14px] ${footerEdgeClass(atBottom)}`}>
          <Button type="button" size="lg" className="w-full" onClick={handleApply}>
            Vis resultater
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
