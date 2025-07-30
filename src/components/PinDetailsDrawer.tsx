import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Separator } from './ui/separator';
import { useIsMobile } from './ui/use-mobile';
import { Edit, Trash2, Share, MapPin, Minus } from 'lucide-react';
import type{ ForagingSpot, User } from './types';
import ChanterelleIcon from './ChanterelleIcon';

interface PinDetailsDrawerProps {
  spot: ForagingSpot;
  currentUser: User;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: (spotId: string, email: string) => void;
  onUnshare: (spotId: string, email: string) => void;
}

const getForagingIcon = (type: string) => {
  switch (type) {
    case 'chanterelle':
      return <ChanterelleIcon size={20} />;
    case 'blueberry':
    case 'lingonberry':
    case 'cloudberry':
      return '🫐';
    default:
      return '🌿';
  }
};

const getForagingTitle = (type: string) => {
  switch (type) {
    case 'chanterelle':
      return 'Chanterelles found';
    case 'blueberry':
      return 'Blueberries found';
    case 'lingonberry':
      return 'Lingonberries found';
    case 'cloudberry':
      return 'Cloudberries found';
    default:
      return 'Foraging find';
  }
};

export default function PinDetailsDrawer({ 
  spot, 
  currentUser, 
  onClose, 
  onEdit, 
  onDelete, 
  onShare, 
  onUnshare 
}: PinDetailsDrawerProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const isMobile = useIsMobile();

  const isOwner = spot.userId === currentUser.id;

  const handleShare = () => {
    if (shareEmail.trim() && isOwner) {
      onShare(spot.id, shareEmail.trim());
      setShareEmail('');
      setIsSharing(false);
    }
  };

  const handleUnshare = (email: string) => {
    if (isOwner) {
      onUnshare(spot.id, email);
    }
  };

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={isMobile ? "h-[80vh]" : "w-[400px] h-full"}
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-3">
            <div className="text-2xl">{getForagingIcon(spot.type)}</div>
            <div>
              <div className="text-lg font-semibold">{getForagingTitle(spot.type)}</div>
              <div className="text-sm text-gray-500 font-normal">
                {spot.timestamp.toLocaleDateString()} at {spot.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className={`space-y-6 ${!isMobile ? 'max-h-[calc(100vh-120px)] overflow-y-auto' : ''}`}>
          {/* Location info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">GPS Coordinates</span>
            </div>
            <div className="text-sm text-gray-600 font-mono">
              {spot.coordinates.lat.toFixed(6)}, {spot.coordinates.lng.toFixed(6)}
            </div>
          </div>

          {/* Notes */}
          {spot.notes && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Notes</h4>
              <p className="text-gray-600 bg-gray-50 rounded-lg p-3">
                {spot.notes}
              </p>
            </div>
          )}

          {/* Action buttons (only for owner) */}
          {isOwner && (
            <>
              <div className="flex gap-3">
                <Button onClick={onEdit} variant="outline" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={onDelete} variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>

              <Separator />

              {/* Sharing section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700">Sharing</h4>
                  <Button
                    onClick={() => setIsSharing(!isSharing)}
                    variant="outline"
                    size="sm"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>

                {isSharing && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <Label htmlFor="shareEmail" className="text-sm">Share with email:</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="shareEmail"
                        type="email"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        placeholder="friend@example.com"
                        className="flex-1"
                      />
                      <Button onClick={handleShare} size="sm" disabled={!shareEmail.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {/* Shared with list */}
                {spot.sharedWith.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Shared with:</div>
                    <div className="space-y-2">
                      {spot.sharedWith.map((email) => (
                        <div key={email} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                          <span className="text-sm text-gray-700">{email}</span>
                          <Button
                            onClick={() => handleUnshare(email)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {spot.sharedWith.length === 0 && !isSharing && (
                  <p className="text-sm text-gray-500">Not shared with anyone</p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}