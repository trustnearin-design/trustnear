/**
 * TS mirror of tailwind.config.js color tokens — kept in sync MANUALLY.
 * Use these for APIs that can't take className (StatusBar, navigation theme,
 * native Splash, MapView marker fills, LinearGradient stops). For component
 * styling prefer NativeWind classes.
 *
 * Source of truth: tailwind.config.js. If you change one, change the other.
 * Brand palette (D0 2026-05-25): Plum + Coral + Pearl.
 */
export const colors = {
  brand: {
    DEFAULT: '#3D1F4E',
    50: '#F8EEFC',
    100: '#F0DFF8',
    200: '#E2C8EF',
    300: '#CDA3E0',
    400: '#AF7BCB',
    500: '#8B53A8',
    600: '#6B3B85',
    700: '#4F2A66',
    800: '#3D1F4E',
    900: '#22102F',
  },
  accent: {
    DEFAULT: '#FF7A5C',
    50: '#FFF3EE',
    100: '#FFE3DA',
    200: '#FFCBBA',
    300: '#FFB6A4',
    400: '#FF9881',
    500: '#FF7A5C',
    600: '#E55A3C',
    700: '#B83E25',
  },
  support: {
    DEFAULT: '#F5C76A',
    50: '#FEFAEE',
    100: '#FDF1D5',
    200: '#FBE7B5',
    300: '#FAE0A6',
    400: '#F8D38A',
    500: '#F5C76A',
    600: '#D9A53F',
    700: '#A87C25',
  },
  ink: {
    DEFAULT: '#1A1226',
    muted: '#5B4868',
    subtle: '#9C8DB0',
    inverse: '#FAF6F1',
  },
  surface: {
    DEFAULT: '#FFFFFF',
    muted: '#FAF6F1',
    subtle: '#F4EEE7',
    raised: '#FFFFFF',
    inverse: '#3D1F4E',
  },
  badge: {
    none: '#9C8DB0',
    bronze: '#B07C4A',
    silver: '#94A3B8',
    gold: '#F5C76A',
    platinum: '#6B3B85',
  },
  success: '#2D7A4F',
  warning: '#C77A1A',
  danger: '#C2362A',
  border: {
    DEFAULT: '#EAE3DA',
    strong: '#D6CCBE',
  },
  // Gradient stops for LinearGradient — see §1.3 of D0-BRAND-FOUNDATION.md.
  gradient: {
    hero: ['#4F2A66', '#3D1F4E', '#22102F'] as const,
    coralCta: ['#FF9881', '#FF7A5C'] as const,
    butterGlow: ['#FAE0A6', '#F5C76A'] as const,
    pearlCard: ['#FFFFFF', '#FAF6F1'] as const,
  },
} as const;
