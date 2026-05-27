/**
 * Tailwind config — TrustNear design system source of truth.
 *
 * D0/D1 (2026-05-25) — palette migrated from navy+gold to **Plum + Coral + Pearl**.
 * See `design/D0-BRAND-FOUNDATION.md` for the full brand doc.
 *
 *   - brand (deep plum)       — hero surfaces, primary buttons, header bg
 *   - accent (sunset coral)   — CTAs, verified badges, prices, ETA chips
 *   - support (butter)        — top-tier badge, ratings, premium accents
 *   - ink (warm-tinted)       — text gradient, slight plum hint instead of cool slate
 *   - surface (pearl cream)   — never harsh pure white; warm background
 *   - badge (tier mapping)    — trust-score tier colors (none → platinum=plum)
 *
 * Names like `brand`, `accent`, `ink` are preserved so existing
 * `bg-brand-800` / `text-accent` references keep compiling with the new hues.
 * No Indian home-services competitor currently owns plum+coral.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary: aubergine / plum
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
        // Accent: sunset coral
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
        // Support: butter yellow (use sparingly — top tier, stars, success accents)
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
        // Ink: warm near-black with slight plum hint
        ink: {
          DEFAULT: '#1A1226',
          muted: '#5B4868',
          subtle: '#9C8DB0',
          inverse: '#FAF6F1',
        },
        // Surface: pearl cream + variants
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FAF6F1',
          subtle: '#F4EEE7',
          raised: '#FFFFFF',
          inverse: '#3D1F4E',
        },
        // Trust-score tier badges
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
      },
      fontFamily: {
        // D1.5: wire Plus Jakarta Sans via expo-google-fonts in app/_layout.tsx
        sans: ['PlusJakartaSans_500Medium', 'System'],
        display: ['PlusJakartaSans_700Bold', 'System'],
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        card: '18px',
        xl: '22px',
        sheet: '28px',
        pill: '999px',
      },
      fontSize: {
        // Premium type scale — generous line-height, slight negative tracking on display.
        display: ['34px', { lineHeight: '40px', letterSpacing: '-0.6px' }],
        h1: ['28px', { lineHeight: '34px', letterSpacing: '-0.4px' }],
        h2: ['22px', { lineHeight: '28px', letterSpacing: '-0.3px' }],
        h3: ['18px', { lineHeight: '24px', letterSpacing: '-0.2px' }],
        bodyLg: ['16px', { lineHeight: '24px' }],
        body: ['15px', { lineHeight: '22px' }],
        small: ['13px', { lineHeight: '18px' }],
        caption: ['11px', { lineHeight: '14px', letterSpacing: '0.4px' }],
        overline: ['11px', { lineHeight: '14px', letterSpacing: '1.5px' }],
      },
      spacing: {
        section: '24px',
        screen: '20px',
      },
    },
  },
  plugins: [],
};
