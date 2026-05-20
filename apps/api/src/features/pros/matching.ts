/**
 * Smart matching: weighted scoring across trust, loyalty, speed, proximity.
 *
 * Composite score (0–100):
 *   trust (40%)      = pro.trust_score                              (already 0–100)
 *   repeats (30%)    = min(repeat_client_count / 50, 1) * 100       (50+ = perfect)
 *   speed (20%)      = inverse of avg_response_time                 (≤30s = 100, ≥180s = 0)
 *   proximity (10%)  = inverse of distance vs radius                (0km = 100, =radius = 0)
 *
 * Weights live in app_config (`trust_score_weights`) so they're tunable
 * without a deploy. The defaults here mirror the seeded config.
 */
export interface MatchInput {
  trustScore: number; // 0–100
  repeatClientCount: number;
  avgResponseTimeSeconds: number;
  distanceKm: number;
  radiusKm: number;
}

export interface MatchWeights {
  trust: number;
  repeat: number;
  speed: number;
  proximity: number;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  trust: 0.4,
  repeat: 0.3,
  speed: 0.2,
  proximity: 0.1,
};

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function computeMatchScore(
  input: MatchInput,
  weights: MatchWeights = DEFAULT_WEIGHTS,
): number {
  const trustPct = clamp01(input.trustScore / 100) * 100;
  const repeatPct = clamp01(input.repeatClientCount / 50) * 100;

  // Speed: 30s response = 100, 180s = 0, linear in between
  const speedSpan = 180 - 30;
  const speedPct = clamp01(1 - Math.max(0, input.avgResponseTimeSeconds - 30) / speedSpan) * 100;

  // Proximity: closer is better; clamp to [0, radius]
  const proxPct = clamp01(1 - Math.min(input.distanceKm, input.radiusKm) / input.radiusKm) * 100;

  return (
    trustPct * weights.trust +
    repeatPct * weights.repeat +
    speedPct * weights.speed +
    proxPct * weights.proximity
  );
}
