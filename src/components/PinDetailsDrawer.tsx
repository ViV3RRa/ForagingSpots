import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Separator } from './ui/separator';
import { useIsMobile } from './ui/use-mobile';
import { X, Edit, Trash2, Share, MapPin, Calendar, Clock, UserPlus, Camera } from 'lucide-react';
import type { ForagingSpot, User } from '../lib/types';
import { getForagingSpotConfig } from './icons';
import { getSpotImageUrls, getSpotImageThumbnailUrls } from '../lib/pocketbase';
// import ImageThumbnails from './ImageThumbnails';
import ImageViewer from './ImageViewer';

interface PinDetailsDrawerProps {
  spot: ForagingSpot | null;
  currentUser: User;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: (spotId: string, email: string) => void;
  onUnshare: (spotId: string, email: string) => void;
}

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
  const [isOpen, setIsOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isMobile = useIsMobile();

  const isOwner = spot?.user === currentUser.id;
  const hasImages = spot?.images && spot.images.length > 0;

  // Handle opening/closing with proper animation timing
  useEffect(() => {
    if (spot !== null) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [spot]);

  const handleClose = () => {
    setIsOpen(false);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleShare = () => {
    if (shareEmail.trim() && isOwner && spot) {
      onShare(spot.id, shareEmail.trim());
      setShareEmail('');
      setIsSharing(false);
    }
  };

  const handleUnshare = (email: string) => {
    if (isOwner && spot) {
      onUnshare(spot.id, email);
    }
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  const config = spot ? getForagingSpotConfig(spot.type) : null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent 
          side={isMobile ? "bottom" : "right"} 
          className={`
            ${isMobile ? "h-[85vh]" : "w-[420px] h-full"} 
            bg-earth-background border-0 p-0 m-0 gap-0 flex flex-col
            ${isMobile ? 'rounded-t-[20px]' : 'rounded-l-[20px]'}
          `}
          style={{
            boxShadow: isMobile 
              ? '0 -8px 32px rgba(0, 0, 0, 0.12)' 
              : '-8px 0 32px rgba(0, 0, 0, 0.12)'
          }}
        >
          {spot ? (
            <>
              {/* Header with forest gradient background */}
              <div className={`forest-gradient px-6 pt-8 pb-0 flex-shrink-0 ${isMobile ? 'rounded-t-[20px]' : 'rounded-tl-[20px]'}`}>
                <SheetHeader className="mb-0 space-y-0">
                  <SheetTitle className="flex items-start gap-4 text-white">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm`} style={config?.background}>
                      {config?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-white mb-1 leading-tight">
                        {config?.label}
                      </h2>
                      <div className="flex items-center gap-3 text-white/80 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(spot.created).toLocaleDateString('da-DK', { 
                            month: 'short', 
                            day: 'numeric',
                            year: new Date(spot.created).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{new Date(spot.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  </SheetTitle>
                </SheetHeader>
              </div>

              {/* Scrollable content container */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                <div className="space-y-6 px-6 pt-6 pb-6">
                {/* Location info card */}
                <div className="bg-white rounded-xl p-4 mushroom-shadow border border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-forest-green/10 p-2 rounded-lg">
                      <MapPin className="h-4 w-4 text-forest-green" />
                    </div>
                    <span className="font-medium text-foreground">GPS Lokation</span>
                  </div>
                  <div className="font-mono text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    {spot.coordinates.lat.toFixed(6)}, {spot.coordinates.lng.toFixed(6)}
                  </div>
                </div>

                {/* Notes section */}
                {spot.notes && (
                  <div className="bg-white rounded-xl p-4 mushroom-shadow border border-border/50">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <div className="bg-mushroom-brown/10 p-2 rounded-lg">
                        <Edit className="h-4 w-4 text-mushroom-brown" />
                      </div>
                      Noter
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {spot.notes}
                    </p>
                  </div>
                )}

                {/* Images section */}
                {spot.images && spot.images.length > 0 && (
                  <div className="bg-white rounded-xl p-4 mushroom-shadow border border-border/50">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <div className="bg-forest-green/10 p-2 rounded-lg">
                        <Camera className="h-4 w-4 text-forest-green" />
                      </div>
                      Billeder ({spot.images.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {getSpotImageThumbnailUrls(spot).map((thumbnailUrl, index) => {
                        const fullImageUrl = getSpotImageUrls(spot)[index];
                        return (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/30">
                            <img
                              src={thumbnailUrl}
                              alt={`Spot image ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
                              loading="lazy"
                              onError={(e) => {
                                console.error(`Failed to load thumbnail: ${thumbnailUrl}`);
                                // Fallback to full image URL if thumbnail fails
                                (e.target as HTMLImageElement).src = fullImageUrl;
                              }}
                              onClick={() => {
                                // Open full image in a new tab
                                // window.open(fullImageUrl, '_blank');
                                handleImageClick(index);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action buttons (only for owner) */}
                {isOwner && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={onEdit} 
                        variant="outline" 
                        className="h-12 border-forest-green/20 text-forest-green hover:bg-forest-green/10 hover:border-forest-green/30 transition-all duration-200"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Rediger
                      </Button>
                      <Button 
                        onClick={onDelete} 
                        variant="outline" 
                        className="h-12 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Slet
                      </Button>
                    </div>

                    <Separator className="my-6" />

                    {/* Enhanced sharing section */}
                    <div className="bg-white rounded-xl p-4 mushroom-shadow border border-border/50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-foreground flex items-center gap-2">
                          <div className="bg-light-green/10 p-2 rounded-lg">
                            <Share className="h-4 w-4 text-light-green" />
                          </div>
                          Del denne lokation
                        </h4>
                        <Button
                          onClick={() => setIsSharing(!isSharing)}
                          variant={isSharing ? "default" : "outline"}
                          size="sm"
                          className={
                            isSharing 
                              ? "bg-light-green hover:bg-light-green/90 text-white" 
                              : "border-light-green/20 text-light-green hover:bg-light-green/10"
                          }
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {isSharing ? 'Annuller' : 'Tilføj bruger'}
                        </Button>
                      </div>

                      {isSharing && (
                        <div className="bg-muted/30 rounded-lg p-4 mb-4 transition-all duration-300 ease-out">
                          <Label htmlFor="shareEmail" className="text-sm font-medium text-foreground">
                            Del med e-mailadresse:
                          </Label>
                          <div className="flex gap-2 mt-3">
                            <Input
                              id="shareEmail"
                              type="email"
                              value={shareEmail}
                              onChange={(e) => setShareEmail(e.target.value)}
                              placeholder="friend@forager.com"
                              className="flex-1 bg-white border-border/50 focus:border-light-green"
                            />
                            <Button 
                              onClick={handleShare} 
                              size="sm" 
                              disabled={!shareEmail.trim()}
                              className="bg-light-green hover:bg-light-green/90 px-4"
                            >
                              Del
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Shared with list */}
                      {spot.sharedWith.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-3">
                            Del med {spot.sharedWith.length} {spot.sharedWith.length === 1 ? 'person' : 'personer'}:
                          </div>
                          <div className="space-y-2">
                            {spot.sharedWith.map((email) => (
                              <div 
                                key={email} 
                                className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-3 group transition-all duration-200 hover:bg-muted/50"
                              >
                                <span className="text-sm text-foreground font-medium">{email}</span>
                                <Button
                                  onClick={() => handleUnshare(email)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {spot.sharedWith.length === 0 && !isSharing && (
                        <div className="text-center py-4">
                          <div className="text-muted-foreground/60 text-sm">
                            Denne lokation er privat - ikke delt med nogen
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Non-owner view */}
                {!isOwner && (
                  <div className="bg-muted/30 rounded-xl p-4 text-center">
                    <div className="text-muted-foreground text-sm">
                      Denne lokation er delt med dig
                    </div>
                  </div>
                )}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Image Viewer */}
      {hasImages && (
        <ImageViewer
          images={getSpotImageThumbnailUrls(spot).map(img => ({
            url: img,
          }))}
          initialIndex={selectedImageIndex}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </>
  );
}
