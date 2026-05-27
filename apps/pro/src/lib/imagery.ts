/**
 * Subset of the customer app's imagery helpers — Pro app only needs the
 * avatar helpers (color + initials). Category/portfolio imagery lives in
 * the customer app since pros don't browse a catalogue.
 */

const AVATAR_COLORS = ['#1E40AF', '#0F766E', '#9333EA', '#DC2626', '#D97706', '#0369A1'] as const;
const AVATAR_FALLBACK = '#1E40AF';

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_FALLBACK;
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}
