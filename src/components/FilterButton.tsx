import { Button } from './ui/button';
import { SlidersHorizontal } from 'lucide-react';
import type{ ForagingType } from './types';

interface FilterButtonProps {
  onClick: () => void;
  activeFilters: Set<ForagingType>;
  totalTypes: number;
}

export default function FilterButton({ onClick, activeFilters, totalTypes }: FilterButtonProps) {
  const hasActiveFilters = activeFilters.size < totalTypes;
  
  return (
    <Button
      onClick={onClick}
      size="sm"
      className={`absolute top-4 left-4 z-20 shadow-lg transition-all duration-300 ${
        hasActiveFilters
          ? 'bg-forest-green text-white hover:bg-forest-dark border-2 border-white'
          : 'bg-white/90 backdrop-blur text-gray-700 hover:bg-white/95 border border-gray-200'
      }`}
    >
      <SlidersHorizontal className="h-4 w-4 mr-2" />
      <span className="text-sm font-medium">
        Filter
      </span>
      {hasActiveFilters && (
        <div className="ml-2 bg-white/20 px-1.5 py-0.5 rounded-full text-xs font-medium">
          {activeFilters.size}
        </div>
      )}
    </Button>
  );
}