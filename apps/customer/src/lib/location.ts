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
 * Hard cap on how long we will wait for a fresh GPS fix. Cold GPS on a
 * real Android device can take 15-60s — that hangs every category screen
 * because the nearby-pros query is gated on coords. We'd rather show
 * Jaipur-center results in <4s than a spinner forever.
 */
const COORDS_TIMEOUT_MS = 4000;

/** Accept a cached fix up to 5 minutes old — good enough for "nearby pros". */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Ask for foreground location permission and return the current position.
 * Returns null if the user denies, the GPS times out, or the OS errors —
 * callers should fall back to FALLBACK_COORDS and surface the "using
 * approximate location" hint.
 *
 * Two-step strategy: instant last-known position first, then a fresh fix
 * with a hard timeout. Without the timeout, a cold GPS hangs the screen.
 */
export async function getCurrentCoords(): Promise<UserCoords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const last = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
  }).catch(() => null);
  if (last) {
    return { lat: last.coords.latitude, lng: last.coords.longitude };
  }

  const fresh = await Promise.race<UserCoords | null>([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((p) => ({ lat: p.coords.latitude, lng: p.coords.longitude }))
      .catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), COORDS_TIMEOUT_MS)),
  ]);
  return fresh;
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
