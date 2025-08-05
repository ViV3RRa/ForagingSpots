import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  initialQuality?: number;
}

// Default compression settings optimized for foraging spot images
export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 1, // 1MB maximum file size
  maxWidthOrHeight: 1920, // Full HD resolution - aspect ratio preserved
  useWebWorker: true, // Better performance
  fileType: 'image/jpeg', // JPEG for better compression
  initialQuality: 0.8, // Good quality with reasonable compression
};

// Mobile-optimized settings for better upload success
export const MOBILE_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.5, // 500KB for mobile
  maxWidthOrHeight: 1280, // Lower resolution for mobile - aspect ratio preserved
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.7,
};

// High quality settings for important images
export const HIGH_QUALITY_OPTIONS: CompressionOptions = {
  maxSizeMB: 2, // 2MB maximum
  maxWidthOrHeight: 2560, // Higher resolution - aspect ratio preserved
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.9, // Higher quality
};

export const compressImageFile = async (
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<File> => {
  try {
    console.log(`Compressing image: ${file.name}`);
    console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Get original image dimensions for aspect ratio logging
    const originalDimensions = await getImageDimensions(file);
    console.log(`Original dimensions: ${originalDimensions.width}x${originalDimensions.height}`);
    console.log(`Original aspect ratio: ${(originalDimensions.width / originalDimensions.height).toFixed(3)}`);
    
    const compressedFile = await imageCompression(file, {
      ...options,
      // Ensure maxWidthOrHeight preserves aspect ratio
      maxWidthOrHeight: options.maxWidthOrHeight,
    });
    
    // Get compressed image dimensions to verify aspect ratio is maintained
    const compressedDimensions = await getImageDimensions(compressedFile);
    console.log(`Compressed dimensions: ${compressedDimensions.width}x${compressedDimensions.height}`);
    console.log(`Compressed aspect ratio: ${(compressedDimensions.width / compressedDimensions.height).toFixed(3)}`);
    
    console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compression ratio: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);
    
    // Verify aspect ratio is preserved (within small tolerance for rounding)
    const originalRatio = originalDimensions.width / originalDimensions.height;
    const compressedRatio = compressedDimensions.width / compressedDimensions.height;
    const ratioDifference = Math.abs(originalRatio - compressedRatio);
    
    if (ratioDifference > 0.01) {
      console.warn(`Aspect ratio changed significantly: ${originalRatio.toFixed(3)} → ${compressedRatio.toFixed(3)}`);
    } else {
      console.log('✓ Aspect ratio preserved successfully');
    }
    
    // Create a new file with the original name but ensure .jpg extension for JPEG
    let newFileName = file.name;
    if (options.fileType === 'image/jpeg' && !file.name.toLowerCase().endsWith('.jpg') && !file.name.toLowerCase().endsWith('.jpeg')) {
      newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
    }
    
    return new File([compressedFile], newFileName, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    console.warn('Returning original file due to compression error');
    return file;
  }
};

// Helper function to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = url;
  });
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  // Check file size (before compression)
  const maxSizeBeforeCompression = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSizeBeforeCompression) {
    return { valid: false, error: 'Image file is too large (max 50MB)' };
  }
  
  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  if (!supportedTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Unsupported image format. Please use JPEG, PNG, WebP, or HEIC.' };
  }
  
  return { valid: true };
};

export const getOptimalCompressionOptions = (isMobile: boolean = false): CompressionOptions => {
  // Detect if we're on a mobile device with limited resources
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
  
  if (isMobile || isMobileDevice) {
    // return MOBILE_COMPRESSION_OPTIONS;
    return DEFAULT_COMPRESSION_OPTIONS;
  }
  
  return DEFAULT_COMPRESSION_OPTIONS;
};
