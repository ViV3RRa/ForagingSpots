import type { Coordinates } from '../lib/types';

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance between two coordinates in meters (haversine). */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

const kmOneDecimal = new Intl.NumberFormat('da-DK', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const kmWhole = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });

/**
 * Danish distance formatting per the design's "0,8 km" style: comma decimal,
 * one decimal below 10 km, whole kilometers above.
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km < 10 ? `${kmOneDecimal.format(km)} km` : `${kmWhole.format(km)} km`;
}

/** Formatted distance from the user to a spot, or null when no position fix exists. */
export function distanceToSpot(
  userPosition: Coordinates | null,
  spot: Coordinates
): string | null {
  if (!userPosition) return null;
  return formatDistance(haversineDistance(userPosition, spot));
}
