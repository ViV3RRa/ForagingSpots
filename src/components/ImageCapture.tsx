import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
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
    <div className="space-y-[12px]">
      {/* Thumbnail strip */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-[8px]">
          {images.map((image) => (
            <div key={image.url} className="relative">
              <div className="aspect-square overflow-hidden rounded-[12px] bg-line2">
                <img
                  src={image.url}
                  alt="Foto af fund"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    console.error(`Failed to load image: ${image.url}`, image);
                    (e.target as HTMLImageElement).style.opacity = '0.3';
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(image.url)}
                aria-label="Fjern billede"
                className="absolute right-[5px] top-[5px] flex size-[22px] items-center justify-center rounded-full bg-[rgba(20,15,8,0.55)] text-white transition-colors hover:bg-[rgba(20,15,8,0.75)]"
              >
                <X className="size-[12px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Capture/Select Controls */}
      {canAddMore && (
        <div className="flex gap-[10px]">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCameraCapture}
            disabled={isProcessing}
            className="min-w-0 flex-1 text-[15px]"
          >
            <Camera strokeWidth={1.6} />
            {isCapturing ? 'Åbner kamera…' : 'Tilføj foto'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleGallerySelect}
            disabled={isProcessing}
            className="min-w-0 flex-1 text-[15px]"
          >
            <Upload strokeWidth={1.6} />
            Fra galleri
          </Button>
        </div>
      )}

      {/* Image count indicator */}
      {images.length > 0 && (
        <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
          {images.length} / {maxImages} fotos
        </div>
      )}

      {/* Processing indicator */}
      {isCompressing && (
        <div className="flex items-center gap-[8px] text-[13px] text-ink2">
          <div className="size-[14px] animate-spin rounded-full border-2 border-line border-t-mono" />
          Komprimerer billeder…
        </div>
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