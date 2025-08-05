import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Camera, Upload, X } from 'lucide-react';
import { compressImageFile, validateImageFile, getOptimalCompressionOptions } from '../utils/imageCompression';

export interface SpotImage {
  id?: string; // Unique identifier for React keys
  url: string;
  file?: File; // For newly uploaded images before server upload
  filename?: string; // For existing images on the server (from spot.images array)
  isExisting?: boolean; // True if this is an existing image from the server
  timestamp?: Date; // When the image was added/taken
}

interface ImageCaptureProps {
  images: SpotImage[];
  onImagesChange: (images: SpotImage[]) => void;
  maxImages?: number;
}

export default function ImageCapture({ images, onImagesChange, maxImages = 5 }: ImageCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const createImageFromFile = (file: File): SpotImage => {
    return {
      id: `new-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
      isExisting: false, // New image, not from server
      timestamp: new Date(),
    };
  };

  const handleCameraCapture = async () => {
    if (cameraInputRef.current) {
      setIsCapturing(true);
      cameraInputRef.current.click();
    }
  };

  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setIsCapturing(false);
      return;
    }

    setIsCompressing(true);
    setIsCapturing(false);

    try {
      const availableSlots = maxImages - images.length;
      const filesToProcess = files.slice(0, availableSlots);
      
      console.log(`Processing ${filesToProcess.length} images...`);
      
      const compressedFiles: File[] = [];
      const compressionOptions = getOptimalCompressionOptions();
      
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        console.log(`Processing image ${i + 1}/${filesToProcess.length}: ${file.name}`);
        
        // Validate the file first
        const validation = validateImageFile(file);
        if (!validation.valid) {
          console.error(`Invalid file ${file.name}: ${validation.error}`);
          alert(`Invalid file ${file.name}: ${validation.error}`);
          continue;
        }
        
        const compressedFile = await compressImageFile(file, compressionOptions);
        compressedFiles.push(compressedFile);
      }

      if (compressedFiles.length > 0) {
        const newImages = compressedFiles.map(createImageFromFile);
        onImagesChange([...images, ...newImages]);
        console.log(`Successfully processed ${compressedFiles.length} images`);
      }
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images. Please try again.');
    } finally {
      setIsCompressing(false);
      // Reset input
      event.target.value = '';
    }
  };

  const removeImage = (url: string) => {
    const imageToRemove = images.find(img => img.url === url);
    if (imageToRemove?.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    onImagesChange(images.filter(img => img.url !== url));
  };

  const canAddMore = images.length < maxImages;
  const isProcessing = isCapturing || isCompressing;

  return (
    <div className="space-y-4">
      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <div key={image.url} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                <img
                  src={image.url}
                  alt="Skat billede"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    console.error(`Failed to load image: ${image.url}`, image);
                    // Add a red border to indicate failed loading
                    (e.target as HTMLImageElement).style.border = '2px solid red';
                  }}
                  onLoad={() => {
                    console.log(`Successfully loaded image: ${image.url}`);
                  }}
                />
              </div>
              <button
                onClick={() => removeImage(image.url)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center shadow-sm transition-all duration-300 mushroom-shadow"
                aria-label="Fjern billede"
              >
                <X className="w-3 h-3" />
              </button>
              
              {/* Image overlay info */}
              {/* <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs">
                  {image.timestamp.toLocaleDateString()}
                </p>
              </div> */}
            </div>
          ))}
        </div>
      )}

      {/* Capture/Select Controls */}
      {images.length === 0 ? (
        /* Empty State */
        <Card className="p-8 text-center border-2 border-dashed border-border bg-gradient-to-br from-forest-green/5 to-light-green/5">
          <div className="w-16 h-16 bg-forest-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-forest-green" />
          </div>
          <h3 className="text-lg mb-2 text-foreground">Tilføj billeder</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {isCompressing ? 'Komprimerer billeder...' : 'Tag billeder af dine opdagelser for at huske dem bedre'}
          </p>
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <Button
              type="button"
              onClick={handleCameraCapture}
              disabled={isProcessing}
              className="w-full bg-forest-green hover:bg-forest-dark text-white transition-all duration-300 forest-shadow"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isCapturing ? 'Åbner kamera...' : isCompressing ? 'Behandler...' : 'Tag billede'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleGallerySelect}
              disabled={isProcessing}
              className="w-full border-light-green/30 text-light-green hover:bg-light-green/10 hover:border-light-green transition-all duration-300"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isCompressing ? 'Behandler...' : 'Vælg fra galleri'}
            </Button>
          </div>
        </Card>
      ) : (
        /* Add More Controls */
        canAddMore && (
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleCameraCapture}
              disabled={isProcessing}
              className="flex-1 bg-forest-green/10 border border-forest-green/30 text-forest-green hover:bg-forest-green hover:text-white transition-all duration-300"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isCapturing ? 'Åbner...' : isCompressing ? 'Behandler...' : 'Kamera'}
            </Button>
            
            <Button
              type="button"
              onClick={handleGallerySelect}
              disabled={isProcessing}
              className="flex-1 bg-light-green/10 border border-light-green/30 text-light-green hover:bg-light-green hover:text-white transition-all duration-300"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isCompressing ? 'Behandler...' : 'Vælg fra galleri'}
            </Button>
          </div>
        )
      )}

      {/* Image count indicator */}
      {images.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{images.length} billed{images.length !== 1 ? 'er' : ''} tilføjet</span>
          <span>{maxImages - images.length} tilbageværende</span>
        </div>
      )}

      {/* Processing indicator */}
      {isCompressing && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Komprimerer billeder...</span>
          </div>
        </div>
      )}

      {images.length >= maxImages && (
        <p className="text-sm text-center text-muted-foreground bg-mushroom-brown/10 p-3 rounded-lg border border-mushroom-brown/20">
          Maksimum {maxImages} billeder pr. skat
        </p>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        multiple={false}
        disabled={isProcessing}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        multiple
        disabled={isProcessing}
      />
    </div>
  );
}