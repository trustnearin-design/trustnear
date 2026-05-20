/**
 * All money in SEVALINK is stored as paise (integer).
 * Rules:
 *   • Never use floats for currency anywhere.
 *   • DB columns are Int (paise).
 *   • Convert only at the UI/display boundary.
 */

export const PAISE_PER_RUPEE = 100;

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/**
 * Format paise as Indian-locale rupee string: "₹1,23,456" or "₹1,234.50"
 */
export function formatRupees(paise: number, opts: { showDecimals?: boolean } = {}): string {
  const showDecimals = opts.showDecimals ?? paise % PAISE_PER_RUPEE !== 0;
  const rupees = paiseToRupees(paise);
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  return formatter.format(rupees);
}

/**
 * Calculate platform commission in paise.
 * @param totalPaise total booking amount
 * @param commissionPercent e.g. 15 for 15%
 */
export function calculateCommission(totalPaise: number, commissionPercent: number): number {
  return Math.round((totalPaise * commissionPercent) / 100);
}
