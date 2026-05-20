const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance in kilometers between two lat/lng points.
 * Use this for quick local checks; for serious geo queries hit PostGIS in the DB.
 */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Round coords to a grid for cache keys (e.g. 2 decimal places ≈ 1.1km grid).
 * Used by /pros/nearby cache: nearby:{lat_grid}:{lng_grid}:{category}
 */
export function roundCoord(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}
