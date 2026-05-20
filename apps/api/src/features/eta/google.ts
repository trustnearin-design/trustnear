import { env } from '../../env.js';
import { logger } from '../../logger.js';
import { formatEtaText, type EtaInput, type EtaProvider, type EtaResult } from './provider.js';
import { HaversineEtaProvider } from './haversine.js';

/**
 * Google Maps Distance Matrix — accurate road-aware ETA.
 *
 * Auto-falls back to Haversine on:
 *   - rate limit (OVER_QUERY_LIMIT)
 *   - network errors
 *   - any non-OK response
 * This keeps tracking working even if Google has a hiccup.
 *
 * Cost: ~$5 per 1000 requests after the $200 free monthly credit.
 * The pro_location handler caches ETAs per pro for 5s to keep costs sane.
 */
const ENDPOINT = 'https://maps.googleapis.com/maps/api/distancematrix/json';

interface DistanceMatrixResponse {
  status: string;
  // Google sometimes includes a human-readable hint here ("enable Billing",
  // "API not enabled", etc) — we surface it in logs so misconfig is obvious.
  error_message?: string;
  rows?: {
    elements: {
      status: string;
      duration?: { value: number; text: string };
      distance?: { value: number; text: string };
    }[];
  }[];
}

export class GoogleMapsDistanceMatrixProvider implements EtaProvider {
  readonly name = 'google' as const;
  private readonly apiKey: string;
  private readonly fallback = new HaversineEtaProvider();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async estimate(input: EtaInput): Promise<EtaResult> {
    const url = new URL(ENDPOINT);
    url.searchParams.set('origins', `${String(input.fromLat)},${String(input.fromLng)}`);
    url.searchParams.set('destinations', `${String(input.toLat)},${String(input.toLng)}`);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('departure_time', 'now');
    url.searchParams.set('key', this.apiKey);

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) {
        throw new Error(`HTTP ${String(res.status)}`);
      }
      const body = (await res.json()) as DistanceMatrixResponse;
      if (body.status !== 'OK' || !body.rows?.[0]?.elements?.[0]) {
        const hint = body.error_message ? ` — ${body.error_message}` : '';
        throw new Error(`Google status: ${body.status}${hint}`);
      }
      const element = body.rows[0].elements[0];
      if (element.status !== 'OK' || !element.duration || !element.distance) {
        throw new Error(`Element status: ${element.status}`);
      }
      return {
        etaSeconds: element.duration.value,
        etaText: formatEtaText(element.duration.value),
        distanceMeters: element.distance.value,
        provider: this.name,
      };
    } catch (err) {
      logger.warn({ err }, 'google distance matrix failed — falling back to haversine');
      return this.fallback.estimate(input);
    }
  }
}

export function isGoogleProviderConfigured(): boolean {
  return Boolean(env.GOOGLE_MAPS_API_KEY && env.GOOGLE_MAPS_API_KEY.length > 10);
}
