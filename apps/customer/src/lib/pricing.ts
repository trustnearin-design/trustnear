/**
 * Deterministic "deal" pricing synthesised from a category id — mirrors the
 * faked-rating approach in ServiceCard/CategoryServicesStrip so MEGA-DEAL /
 * "Deal of the day" blocks read like Myntra (MRP + % OFF) until real promo
 * data exists. Same id → same numbers every render (no reshuffle).
 */
export interface SynthDeal {
  /** Inflated MRP in paise, shown struck-through. */
  mrpPaise: number;
  /** e.g. "32% OFF". */
  discountLabel: string;
}

export function synthDeal(id: string, basePrice: number): SynthDeal {
  // 25–45% off, derived from the id so it's stable.
  const pct = 25 + (Math.abs(id.charCodeAt(0) + (id.charCodeAt(2) || 0)) % 21);
  const mrpPaise = Math.round(basePrice / (1 - pct / 100) / 100) * 100;
  return { mrpPaise, discountLabel: `${pct}% OFF` };
}
