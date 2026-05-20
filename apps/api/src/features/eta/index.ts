import { env } from '../../env.js';
import { logger } from '../../logger.js';
import { HaversineEtaProvider } from './haversine.js';
import { GoogleMapsDistanceMatrixProvider, isGoogleProviderConfigured } from './google.js';
import type { EtaProvider } from './provider.js';

function selectProvider(): EtaProvider {
  if (isGoogleProviderConfigured() && env.GOOGLE_MAPS_API_KEY) {
    logger.info('eta: using Google Distance Matrix');
    return new GoogleMapsDistanceMatrixProvider(env.GOOGLE_MAPS_API_KEY);
  }
  logger.warn('eta: using Haversine fallback (set GOOGLE_MAPS_API_KEY for road-aware ETAs)');
  return new HaversineEtaProvider();
}

export const etaProvider: EtaProvider = selectProvider();
export type { EtaProvider, EtaResult, EtaInput } from './provider.js';
