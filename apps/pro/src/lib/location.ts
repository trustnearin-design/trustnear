import * as Location from 'expo-location';

export interface UserCoords {
  lat: number;
  lng: number;
}

export interface ResolvedAddress {
  /** Sub-locality / neighbourhood — e.g. "Vaishali Nagar". */
  area: string | null;
  /** Wider city. */
  city: string | null;
  /** Indian PIN code. */
  pincode: string | null;
  /** Human-readable single line built from the available parts. */
  formatted: string;
}

/**
 * Jaipur city center — used when permission is denied or GPS fails so the
 * Discovery screens can still show *something* useful in MVP.
 */
export const FALLBACK_COORDS: UserCoords = { lat: 26.9124, lng: 75.7873 };

/**
 * Ask for foreground location permission and read the current position.
 * Returns null if the user denies — callers should fall back to FALLBACK_COORDS
 * and surface the "using approximate location" hint.
 */
export async function getCurrentCoords(): Promise<UserCoords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/**
 * Reverse-geocode coordinates into a human-readable address using
 * expo-location's native API (Android: Geocoder; iOS: CLGeocoder).
 * Returns null if the platform geocoder fails — callers should let the
 * user type their address manually in that case.
 */
export async function reverseGeocode(coords: UserCoords): Promise<ResolvedAddress | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    const r = results[0];
    if (!r) return null;

    const area = r.district || r.subregion || r.name || null;
    const city = r.city || r.region || null;
    const pincode = r.postalCode || null;

    const parts = [area, city, pincode].filter((x): x is string => !!x);
    return {
      area,
      city,
      pincode,
      formatted: parts.join(', ') || 'Address unavailable',
    };
  } catch {
    return null;
  }
}
