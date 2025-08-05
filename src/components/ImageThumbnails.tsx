import { Button } from './ui/button';
import { ZoomIn } from 'lucide-react';

interface ImageThumbnailsProps {
  images: string[];
  onImageClick: (index: number) => void;
  className?: string;
}

export default function ImageThumbnails({ images, onImageClick, className = '' }: ImageThumbnailsProps) {
  if (images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, 6);
  const remainingCount = images.length - 6;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Grid of thumbnails */}
      <div className="grid grid-cols-3 gap-2">
        {displayImages.map((image, index) => (
          <div key={image} className="relative group">
            <Button
              variant="ghost"
              onClick={() => onImageClick(index)}
              className="w-full h-20 p-0 relative overflow-hidden rounded-lg border border-border/30 hover:border-forest-green/50 transition-all duration-300 group bg-muted/20 hover:bg-muted/30"
            >
              <img
                src={image}
                // alt={image.caption || `Spot image ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="absolute inset-0 bg-muted/50 flex flex-col items-center justify-center">
                        <div class="w-6 h-6 text-muted-foreground/50 mb-1">📷</div>
                        <div class="text-xs text-muted-foreground/70 text-center px-1">
                          Billede ikke tilgængeligt
                        </div>
                      </div>
                    `;
                  }
                }}
              />
              
              {/* Overlay for additional images */}
              {index === 5 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-white text-sm mb-1">
                      +{remainingCount}
                    </div>
                    <div className="text-white/80 text-xs">
                      flere billeder
                    </div>
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Zoom icon */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-5 h-5 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <ZoomIn className="w-3 h-3 text-white" />
                </div>
              </div>
            </Button>

            {/* Hover ring effect */}
            <div className="absolute inset-0 rounded-lg ring-2 ring-forest-green/0 group-hover:ring-forest-green/30 transition-all duration-300 pointer-events-none" />
          </div>
        ))}
      </div>
      
      {/* Image count and interaction hint */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 bg-forest-green/50 rounded-full"></div>
          <span>
            {images.length} billed{images.length !== 1 ? 'er' : ''} tilføjet
          </span>
        </div>
        <div className="text-muted-foreground/70 bg-muted/30 px-2 py-1 rounded-md">
          Tryk for at se i fuld størrelse
        </div>
      </div>
    </div>
  );
}