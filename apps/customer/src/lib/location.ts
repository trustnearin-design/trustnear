import * as Location from 'expo-location';

export interface UserCoords {
  lat: number;
  lng: number;
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
