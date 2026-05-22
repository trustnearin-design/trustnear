/**
 * Tailwind config — the TrustNear design system source of truth.
 *
 * Brand position: Trust + Premium (per [[project-trustnear-brand]]).
 *   - brand (deep navy)     — primary CTAs + trust surfaces
 *   - accent (true gold)    — verified badges, premium CTAs, ETA chips
 *   - ink (warm-tinted)     — text gradient, slightly warmer than cool slate
 *   - surface (warm white)  — backgrounds; never harsh pure white
 *   - badge (tier mapping)  — trust score badge tiers (none→platinum)
 *
 * All hex values were chosen against UC, Yes Madam, Snabbit screenshots
 * to ensure TrustNear doesn't visually overlap with competitors. Navy +
 * gold is currently unowned in Indian home-services.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ['System'],
        display: ['System'],
      },
      borderRadius: {
        card: '16px',
        sheet: '24px',
        pill: '999px',
      },
      fontSize: {
        // Type scale tuned for premium feel — generous, not cramped.
        display: ['32px', { lineHeight: '38px', letterSpacing: '-0.5px' }],
        h1: ['28px', { lineHeight: '34px', letterSpacing: '-0.4px' }],
        h2: ['22px', { lineHeight: '28px', letterSpacing: '-0.3px' }],
        h3: ['18px', { lineHeight: '24px' }],
        body: ['15px', { lineHeight: '22px' }],
        small: ['13px', { lineHeight: '18px' }],
        caption: ['11px', { lineHeight: '14px', letterSpacing: '0.4px' }],
      },
      spacing: {
        section: '24px',
        screen: '20px',
      },
    },
  },
  plugins: [],
};
