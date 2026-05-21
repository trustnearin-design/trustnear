/**
 * TS mirror of tailwind.config.js color tokens.
 * Use these for APIs that can't take className (StatusBar, navigation theme,
 * native Splash, etc). For component styling prefer NativeWind classes.
 */
export const colors = {
  brand: {
    DEFAULT: '#1E40AF',
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E3A8A',
    900: '#0F172A',
  },
  accent: {
    DEFAULT: '#F59E0B',
    500: '#F59E0B',
    600: '#D97706',
  },
  ink: {
    DEFAULT: '#0F172A',
    muted: '#475569',
    subtle: '#94A3B8',
    inverse: '#F8FAFC',
  },
  surface: {
    DEFAULT: '#FFFFFF',
    muted: '#F8FAFC',
    raised: '#FFFFFF',
    inverse: '#0F172A',
  },
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  border: '#E2E8F0',
} as const;
