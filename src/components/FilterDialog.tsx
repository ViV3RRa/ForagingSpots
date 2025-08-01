import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type{ ForagingType } from './types';
import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getForagingIcon, foragingIconConfig, type ExtendedForagingType } from './icons';
import { ALL_FORAGING_TYPES } from '../utils/foragingTypes';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: Set<ForagingType>;
  onApplyFilters: (filters: Set<ForagingType>) => void;
}

// Generate foraging types from the icon configuration
const foragingTypes = ALL_FORAGING_TYPES.map(type => ({
  type: type as ForagingType,
  label: foragingIconConfig[type as keyof typeof foragingIconConfig]?.label || type,
  icon: getForagingIcon(type as ExtendedForagingType, { size: 20 }),
  color: foragingIconConfig[type as keyof typeof foragingIconConfig]?.color || 'bg-green-500',
  description: foragingIconConfig[type as keyof typeof foragingIconConfig]?.description || `${type} foraging finds`
}));

export default function FilterDialog({ 
  open, 
  onOpenChange, 
  activeFilters, 
  onApplyFilters 
}: FilterDialogProps) {
  // Local state for temporary filter selections
  const [tempFilters, setTempFilters] = useState<Set<ForagingType>>(new Set(activeFilters));

  // Reset temp filters when dialog opens or activeFilters change
  useEffect(() => {
    if (open) {
      setTempFilters(new Set(activeFilters));
    }
  }, [open, activeFilters]);

  const handleFilterToggle = (type: ForagingType) => {
    setTempFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  const handleShowAll = () => {
    setTempFilters(new Set(ALL_FORAGING_TYPES));
  };

  const handleHideAll = () => {
    setTempFilters(new Set());
  };

  const handleApply = () => {
    onApplyFilters(tempFilters);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempFilters(new Set(activeFilters)); // Reset to original filters
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-forest-green">🗂️</span>
            Filter Foraging Spots
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filter summary and quick actions */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {tempFilters.size} of {foragingTypes.length} types selected
            </span>
            <div className="flex gap-2">
              <Button
                onClick={handleShowAll}
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs text-forest-green hover:text-forest-dark"
              >
                All
              </Button>
              <Button
                onClick={handleHideAll}
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs text-gray-600 hover:text-gray-700"
              >
                None
              </Button>
            </div>
          </div>

          <Separator />

          {/* Filter options - scrollable */}
          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {foragingTypes.map(({ type, label, icon, color, description }) => {
              const isActive = tempFilters.has(type);
              
              return (
                <button
                  key={type}
                  onClick={() => handleFilterToggle(type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                    isActive
                      ? 'bg-forest-green/5 border-forest-green/30 shadow-sm'
                      : 'bg-gray-50/50 border-gray-200 hover:bg-gray-100/50'
                  }`}
                >
                  {/* Icon */}
                  <div className={`h-10 w-10 ${color} rounded-full flex items-center justify-center text-white shadow-sm`}>
                    {typeof icon === 'string' ? (
                      <span className="text-lg">{icon}</span>
                    ) : (
                      <div className="text-white">{type === 'other' ? null : icon}</div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500">{description}</div>
                  </div>

                  {/* Check indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isActive 
                      ? 'border-forest-green bg-forest-green' 
                      : 'border-gray-300'
                  }`}>
                    {isActive && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 bg-forest-green hover:bg-forest-dark"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
