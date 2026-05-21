/**
 * Tailwind config — the SEVALINK design system source of truth.
 *
 * Brand tokens are encoded here so screens stay token-driven
 * (`bg-brand`, `text-ink`) and we can re-theme in one place.
 *
 * Palette rationale:
 *   - brand (deep blue) — trust, calm, primary CTAs
 *   - accent (saffron) — India-warm highlight (badges, ETA chips)
 *   - ink — neutral text gradient
 *   - surface — card / sheet backgrounds
 *   - status colors — success/warn/danger map 1:1 to backend domain states
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
