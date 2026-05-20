import { haversineKm } from '@sevalink/utils';
import { formatEtaText, type EtaInput, type EtaProvider, type EtaResult } from './provider.js';

/**
 * No-API fallback ETA — straight-line distance × assumed average speed.
 * Fast, free, and "good enough" for MVP. Real production should use Google
 * Maps Distance Matrix for road-aware estimates.
 *
 * Assumed urban speed: 25 km/h. Tune in app_config later if needed.
 */
const ASSUMED_SPEED_KMH = 25;

export class HaversineEtaProvider implements EtaProvider {
  readonly name = 'haversine' as const;

  // eslint-disable-next-line @typescript-eslint/require-await
  async estimate(input: EtaInput): Promise<EtaResult> {
    const distanceKm = haversineKm(
      { latitude: input.fromLat, longitude: input.fromLng },
      { latitude: input.toLat, longitude: input.toLng },
    );
    // Bias straight-line by 1.3× to approximate road distance (typical urban factor)
    const roadDistanceKm = distanceKm * 1.3;
    const etaSeconds = Math.round((roadDistanceKm / ASSUMED_SPEED_KMH) * 3600);
    return {
      etaSeconds,
      etaText: formatEtaText(etaSeconds),
      distanceMeters: Math.round(roadDistanceKm * 1000),
      provider: this.name,
    };
  }
}
