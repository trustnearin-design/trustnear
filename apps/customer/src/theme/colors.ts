/**
 * TS mirror of tailwind.config.js color tokens — kept in sync MANUALLY.
 * Use these for APIs that can't take className (StatusBar, navigation theme,
 * native Splash, MapView marker fills). For component styling prefer NativeWind classes.
 *
 * Source of truth: tailwind.config.js. If you change one, change the other.
 */
export const colors = {
  brand: {
    DEFAULT: '#0B1F3A',
    50: '#F0F4FA',
    100: '#D8E2EE',
    200: '#A8B9D3',
    300: '#7A92B6',
    400: '#4A6789',
    500: '#22426E',
    600: '#142F54',
    700: '#0E2645',
    800: '#0B1F3A',
    900: '#06122A',
  },
  accent: {
    DEFAULT: '#D4A24C',
    50: '#FBF7EE',
    100: '#F2E5C5',
    200: '#E8D194',
    400: '#DDB369',
    500: '#D4A24C',
    600: '#A77A2C',
    700: '#7A5A1F',
  },
  ink: {
    DEFAULT: '#111827',
    muted: '#4B5563',
    subtle: '#9CA3AF',
    inverse: '#FAFAF7',
  },
  surface: {
    DEFAULT: '#FFFFFF',
    muted: '#FAFAF7',
    raised: '#FFFFFF',
    inverse: '#0B1F3A',
  },
  badge: {
    none: '#9CA3AF',
    bronze: '#A77A2C',
    silver: '#94A3B8',
    gold: '#D4A24C',
    platinum: '#22426E',
  },
  success: '#15803D',
  warning: '#B45309',
  danger: '#B91C1C',
  border: '#E7E5E0',
} as const;
