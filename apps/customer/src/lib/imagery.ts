/**
 * Curated Unsplash photo URLs per category slug. MVP imagery layer — replaces
 * the generic-icon look with real photography. Swap with brand-shot CDN URLs
 * when a proper photo shoot lands.
 */
const CATEGORY_PHOTOS: Record<string, string> = {
  'home-cleaning':
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80&auto=format&fit=crop',
  cooking:
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80&auto=format&fit=crop',
  electrical:
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=900&q=80&auto=format&fit=crop',
  plumbing:
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=900&q=80&auto=format&fit=crop',
  tutor:
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80&auto=format&fit=crop',
};

const CATEGORY_FALLBACK =
  'https://images.unsplash.com/photo-1556909114-44e3e9376a5d?w=900&q=80&auto=format&fit=crop';

export function categoryPhoto(slug: string): string {
  return CATEGORY_PHOTOS[slug] ?? CATEGORY_FALLBACK;
}

export const HOME_HERO_PHOTO =
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80&auto=format&fit=crop';

/**
 * Deterministic accent color for an avatar with initials when the user has no
 * profilePhoto. Hash the name into one of a small palette so the same person
 * always gets the same color.
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
