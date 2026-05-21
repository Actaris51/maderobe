import * as Location from 'expo-location';

export type LocationResult =
  | { granted: true; lat: number; lon: number }
  | { granted: false; reason: 'denied' | 'error' };

/**
 * Request a one-shot coarse location. Uses balanced accuracy (fast, low battery).
 * The caller is responsible for caching the result if needed — this triggers a
 * native prompt on the first call.
 */
export async function getCoarseLocation(): Promise<LocationResult> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return { granted: false, reason: 'denied' };
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { granted: true, lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return { granted: false, reason: 'error' };
  }
}
