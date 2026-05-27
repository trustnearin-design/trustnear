/**
 * Curated Unsplash photo URLs per category slug. MVP imagery layer — replaces
 * the generic-icon look with real photography. Swap with brand-shot CDN URLs
 * when a proper photo shoot lands.
 */
const CATEGORY_PHOTOS: Record<string, string> = {
  'home-cleaning':
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80&auto=format&fit=crop',
  'deep-clean':
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=900&q=80&auto=format&fit=crop',
  'pest-control':
    'https://images.unsplash.com/photo-1632935190508-c4c4cca0e6b1?w=900&q=80&auto=format&fit=crop',
  sanitization:
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=900&q=80&auto=format&fit=crop',
  cooking:
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80&auto=format&fit=crop',
  electrical:
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=900&q=80&auto=format&fit=crop',
  plumbing:
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=900&q=80&auto=format&fit=crop',
  'ac-service':
    'https://images.unsplash.com/photo-1617704548623-340376564e68?w=900&q=80&auto=format&fit=crop',
  'appliance-repair':
    'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=900&q=80&auto=format&fit=crop',
  'salon-women':
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80&auto=format&fit=crop',
  'spa-massage':
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80&auto=format&fit=crop',
  'hair-makeup':
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=80&auto=format&fit=crop',
  'mens-grooming':
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80&auto=format&fit=crop',
  'fitness-trainer':
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=900&q=80&auto=format&fit=crop',
  yoga: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80&auto=format&fit=crop',
  photography:
    'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=900&q=80&auto=format&fit=crop',
  tutor:
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80&auto=format&fit=crop',
};

const CATEGORY_FALLBACK =
  'https://images.unsplash.com/photo-1556909114-44e3e9376a5d?w=900&q=80&auto=format&fit=crop';

export function categoryPhoto(slug: string): string {
  return CATEGORY_PHOTOS[slug] ?? CATEGORY_FALLBACK;
}

/**
 * Per-category portfolio sample shots (3 each). Used by the expert detail
 * screen until pros upload their own work. Each pro is shown the photos
 * of the categories they actively offer, so a plumber doesn't get salon
 * shots — keeps the visual consistent with their service mix.
 */
const PORTFOLIO_BY_SLUG: Record<string, string[]> = {
  'home-cleaning': [
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&q=80&auto=format&fit=crop',
  ],
  'deep-clean': [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1597844815762-13c9d2c0ef41?w=600&q=80&auto=format&fit=crop',
  ],
  'pest-control': [
    'https://images.unsplash.com/photo-1632935190508-c4c4cca0e6b1?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&q=80&auto=format&fit=crop',
  ],
  sanitization: [
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?w=600&q=80&auto=format&fit=crop',
  ],
  plumbing: [
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&q=80&auto=format&fit=crop',
  ],
  electrical: [
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610465299996-30f240ac2b1c?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1565608438257-fac3c27beb36?w=600&q=80&auto=format&fit=crop',
  ],
  'ac-service': [
    'https://images.unsplash.com/photo-1617704548623-340376564e68?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1631545806609-cb83a44eebab?w=600&q=80&auto=format&fit=crop',
  ],
  'appliance-repair': [
    'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&q=80&auto=format&fit=crop',
  ],
  'salon-women': [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80&auto=format&fit=crop',
  ],
  'spa-massage': [
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&q=80&auto=format&fit=crop',
  ],
  'hair-makeup': [
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80&auto=format&fit=crop',
  ],
  'mens-grooming': [
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80&auto=format&fit=crop',
  ],
  'fitness-trainer': [
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80&auto=format&fit=crop',
  ],
  yoga: [
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600&q=80&auto=format&fit=crop',
  ],
  photography: [
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80&auto=format&fit=crop',
  ],
  tutor: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80&auto=format&fit=crop',
  ],
};

/**
 * Build a portfolio gallery (3-6 photos) for a pro based on the categories
 * they actively serve. Deterministic per professional id so reload doesn't
 * shuffle the order.
 */
export function portfolioFor(professionalId: string, categorySlugs: string[]): string[] {
  // Dedupe across categories — sibling slugs (home-cleaning + deep-clean,
  // salon-women + spa-massage) intentionally share some hero shots, so
  // without this we'd hand React duplicate keys for the gallery.
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const slug of categorySlugs) {
    const shots = PORTFOLIO_BY_SLUG[slug];
    if (!shots) continue;
    for (const s of shots) {
      if (!seen.has(s)) {
        seen.add(s);
        pool.push(s);
      }
    }
  }
  if (pool.length === 0) return [];
  // Stable shuffle by hashing the professional id
  let seed = 0;
  for (let i = 0; i < professionalId.length; i++) {
    seed = (seed * 31 + professionalId.charCodeAt(i)) >>> 0;
  }
  const out = [...pool];
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [out[i]!, out[j]!] = [out[j]!, out[i]!];
  }
  return out.slice(0, 6);
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
