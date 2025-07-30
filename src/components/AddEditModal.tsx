import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { MapPin } from 'lucide-react';
import type{ ForagingSpot, ForagingType, Coordinates } from './types';
import ChanterelleIcon from './ChanterelleIcon';

interface AddEditModalProps {
  // mode: 'add' | 'edit';
  spot?: ForagingSpot;
  coordinates: Coordinates;
  onSave: (type: ForagingType, notes: string) => void;
  onClose: () => void;
}

const foragingOptions = [
  { value: 'chanterelle', label: 'Chanterelle', icon: <ChanterelleIcon size={16} /> },
  { value: 'blueberry', label: 'Blueberry', icon: '🫐' },
  { value: 'lingonberry', label: 'Lingonberry', icon: '🔴' },
  { value: 'cloudberry', label: 'Cloudberry', icon: '🟠' },
  { value: 'other', label: 'Other', icon: '🌿' },
];

export default function AddEditModal({ spot, coordinates, onSave, onClose }: AddEditModalProps) {
  const [selectedType, setSelectedType] = useState<ForagingType>(spot?.type || 'chanterelle');
  const [notes, setNotes] = useState(spot?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedType, notes);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="text-xl">
              {foragingOptions.find(opt => opt.value === selectedType)?.icon}
            </div>
            {spot === undefined ? 'Add Foraging Spot' : 'Edit Foraging Spot'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GPS Coordinates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">GPS Location</span>
            </div>
            <div className="text-sm text-gray-600 font-mono">
              {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </div>
          </div>

          {/* What did you find? */}
          <div className="space-y-2">
            <Label htmlFor="type">What did you find?</Label>
            <Select value={selectedType} onValueChange={(e) => setSelectedType(e as ForagingType)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {foragingOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="flex items-center">
                    <div className="flex items-center gap-2">
                      {typeof option.icon === 'string' ? (
                        <span className="text-base">{option.icon}</span>
                      ) : (
                        <div className="text-base">{option.icon}</div>
                      )}
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details about the location, quantity, size, etc."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {spot === undefined ? 'Save Spot' : 'Update Spot'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}