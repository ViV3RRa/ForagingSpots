import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { X, ChevronLeft, ChevronRight, Calendar, Download, ZoomIn, ZoomOut } from 'lucide-react';
import type { SpotImage } from './ImageCapture';

interface ImageViewerProps {
  images: SpotImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, isOpen, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case ' ':
          event.preventDefault();
          setIsZoomed(!isZoomed);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentIndex, isZoomed]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsZoomed(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsZoomed(false);
  };

  const handleDownload = () => {
    const currentImage = images[currentIndex];
    if (!currentImage) return;
    
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = `foraging-photo-${currentImage.url}.jpg`;
    link.click();
  };

  if (!images.length) return null;

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  console.log('ImageViewer - Current Image:', currentImage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-full h-full max-h-screen p-0 bg-black/95 border-none overflow-hidden backdrop-blur-xl">
        <div className="relative w-full h-full flex flex-col">
          {/* Header with image info */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2 text-white/90 max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-forest-green/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-forest-green" />
                  </div>
                </div>
                
                {hasMultiple && (
                  <div className="flex items-center gap-2">
                    <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-xs">
                        {currentIndex + 1} of {images.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  <Download className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Image */}
          <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-20">
            <img
              src={currentImage.url}
              className={`max-w-full max-h-full object-contain rounded-lg forest-shadow transition-transform duration-300 cursor-pointer ${
                isZoomed ? 'transform scale-150' : ''
              }`}
              loading="lazy"
              onClick={() => setIsZoomed(!isZoomed)}
            />
          </div>

          {/* Navigation arrows */}
          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white hover:bg-white/20 w-12 h-12 rounded-full transition-all duration-300 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white hover:bg-white/20 w-12 h-12 rounded-full transition-all duration-300 z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}

          {/* Thumbnail strip */}
          {hasMultiple && images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
              <div className="flex gap-2 justify-center overflow-x-auto scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={image.url}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      index === currentIndex
                        ? 'border-forest-green ring-2 ring-forest-green/30'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
              
              {/* Keyboard shortcuts hint */}
              <div className="flex justify-center mt-4">
                <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
                  <div className="text-xs text-white/70 text-center">
                    Benyt ← → for at navigere • Space for at zoome • Esc for at lukke
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}