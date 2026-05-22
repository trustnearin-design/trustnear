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

/**
 * Format a paise amount (smallest INR unit — ₹1 = 100 paise, the backend
 * stores all money fields this way) into "₹N" for display. Whole-rupee
 * values render without paise.
 */
export function formatRupees(paise: string | number): string {
  const n = typeof paise === 'string' ? Number(paise) : paise;
  if (!Number.isFinite(n)) return '—';
  const rupees = n / 100;
  return rupees % 1 === 0 ? `₹${rupees.toFixed(0)}` : `₹${rupees.toFixed(2)}`;
}

/**
 * Display helper for the category priceUnit enum. Returns a short suffix
 * like "/hr" or "/visit" suitable to follow a rupee amount.
 */
export function priceUnitLabel(unit: string): string {
  switch (unit) {
    case 'per_hour':
      return '/hr';
    case 'per_visit':
      return '/visit';
    case 'per_day':
      return '/day';
    case 'per_month':
      return '/mo';
    case 'per_unit':
      return '/unit';
    default:
      return '';
  }
}

const BADGE_LABELS: Record<string, string> = {
  none: '',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export function badgeLabel(tier: string): string {
  return BADGE_LABELS[tier] ?? '';
}

// Badge tier palettes — kept in sync with tailwind `badge.*` tokens.
// Background is a soft tint, text is the saturated brand-tier color.
const NONE_BADGE = { bg: 'transparent', text: '#9CA3AF' };
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  none: NONE_BADGE,
  bronze: { bg: '#F5EBDC', text: '#7A5A1F' }, // muted brown-gold
  silver: { bg: '#E7E5E0', text: '#475569' }, // warm-tinted silver
  gold: { bg: '#FBF7EE', text: '#A77A2C' }, // brand-gold tint
  platinum: { bg: '#D8E2EE', text: '#0B1F3A' }, // brand-navy on cool-navy tint
};

export function badgeColors(tier: string): { bg: string; text: string } {
  return BADGE_COLORS[tier] ?? NONE_BADGE;
}

/**
 * Human-readable label + tone for each booking status.
 */
const BOOKING_STATUS_INFO: Record<
  string,
  { label: string; tone: 'info' | 'progress' | 'success' | 'danger' }
> = {
  pending_match: { label: 'Finding expert', tone: 'info' },
  matched: { label: 'Expert matched', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'progress' },
  pro_en_route: { label: 'Expert on the way', tone: 'progress' },
  otp_verified: { label: 'Expert arrived', tone: 'progress' },
  in_progress: { label: 'In progress', tone: 'progress' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled_customer: { label: 'You cancelled', tone: 'danger' },
  cancelled_pro: { label: 'Expert cancelled', tone: 'danger' },
  disputed: { label: 'Disputed', tone: 'danger' },
};

export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_INFO[status]?.label ?? status;
}

export function bookingStatusTone(status: string): 'info' | 'progress' | 'success' | 'danger' {
  return BOOKING_STATUS_INFO[status]?.tone ?? 'info';
}

/**
 * Format an ISO datetime into a friendly "Today, 3:30 PM" / "Tomorrow,
 * 10:00 AM" / "Tue, 14 May · 3:30 PM" string for booking schedule display.
 */
export function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tmrw = new Date(now);
  tmrw.setDate(tmrw.getDate() + 1);
  const isTomorrow = d.toDateString() === tmrw.toDateString();

  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (sameDay) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  const dayMonth = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${dayMonth} · ${time}`;
}

/**
 * Format seconds as "Xs", "Xm", or "Xh Ym" depending on magnitude.
 * Used for the pro's avg response time pill.
 */
export function formatResponseTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remM = minutes % 60;
  return remM ? `${hours}h ${remM}m` : `${hours}h`;
}
