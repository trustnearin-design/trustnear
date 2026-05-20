/**
 * ETA provider abstraction — swap implementations without caller changes.
 */
export interface EtaResult {
  /** Estimated travel time, seconds. */
  etaSeconds: number;
  /** Human-readable text like "~12 min away". */
  etaText: string;
  /** Travel distance in meters (may differ from straight-line). */
  distanceMeters: number;
  /** Provider name for observability. */
  provider: 'haversine' | 'google';
}

export interface EtaInput {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

export interface EtaProvider {
  readonly name: 'haversine' | 'google';
  estimate(input: EtaInput): Promise<EtaResult>;
}

export function formatEtaText(seconds: number): string {
  if (seconds < 60) return '~1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${String(mins)} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins === 0 ? `~${String(hours)}h` : `~${String(hours)}h ${String(remMins)}min`;
}
