/**
 * Format a raw 10-digit Indian mobile to "+91 98765 43210" for display.
 * Strips +91/91 prefix if present. Returns input untouched if not 10 digits.
 */
export function formatIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const ten = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (ten.length !== 10) return raw;
  return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
}

/**
 * Normalise a 10-digit input to E.164 (+91XXXXXXXXXX) for API calls.
 * Returns null if the input isn't a valid Indian mobile.
 */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const ten = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(ten)) return null;
  return `+91${ten}`;
}
