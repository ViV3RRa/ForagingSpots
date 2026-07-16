/**
 * Reads a photo's EXIF capture date (DateTimeOriginal, falling back to
 * CreateDate) from a URL. Uploads preserve EXIF through compression
 * (imageCompression.ts preserveExif), so this works on the stored originals;
 * exifr reads the file in chunks via Range requests, so it doesn't
 * re-download the whole image. Returns null when there's no EXIF (pre-2026
 * uploads, screenshots, PNG sources) — callers fall back to the spot date.
 *
 * exifr is dynamically imported to keep the parser out of the main bundle
 * until a lightbox actually opens.
 */
export async function getExifCaptureDate(url: string): Promise<Date | null> {
  try {
    const { default: exifr } = await import('exifr');
    const tags = await exifr.parse(url, { pick: ['DateTimeOriginal', 'CreateDate'] });
    const date: unknown = tags?.DateTimeOriginal ?? tags?.CreateDate;
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}
