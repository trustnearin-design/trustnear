import type { Config } from 'tailwindcss';

/**
 * TrustNear admin Tailwind config — color tokens reference CSS variables
 * defined in globals.css so toggling `.dark` on <html> flips the whole
 * palette. Palette matches the mobile apps (Plum + Coral + Butter +
 * Pearl) so admin and customer/pro feel like the same product.
 */
const c = (token: string) => `rgb(var(--${token}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: c('brand'),
          50: c('brand-50'),
          100: c('brand-100'),
          200: c('brand-200'),
          300: c('brand-300'),
          400: c('brand-400'),
          500: c('brand-500'),
          600: c('brand-600'),
          700: c('brand-700'),
          800: c('brand-800'),
          900: c('brand-900'),
        },
        accent: {
          DEFAULT: c('accent'),
          50: c('accent-50'),
          100: c('accent-100'),
          200: c('accent-200'),
          400: c('accent-400'),
          500: c('accent-500'),
          600: c('accent-600'),
          700: c('accent-700'),
        },
        // Butter — top-tier badges, ratings, premium accents.
        // Used sparingly so it stays special. Mirrors the mobile
        // apps' `support` palette.
        support: {
          DEFAULT: c('support'),
          50: c('support-50'),
          100: c('support-100'),
          200: c('support-200'),
          300: c('support-300'),
          400: c('support-400'),
          500: c('support-500'),
          600: c('support-600'),
          700: c('support-700'),
        },
        ink: {
          DEFAULT: c('ink'),
          muted: c('ink-muted'),
          subtle: c('ink-subtle'),
          inverse: c('ink-inverse'),
        },
        surface: {
          DEFAULT: c('surface'),
          muted: c('surface-muted'),
          subtle: c('surface-subtle'),
          raised: c('surface-raised'),
          inverse: c('surface-inverse'),
        },
        // Trust-tier badge palette aligned with mobile (`mobile/badge.*`)
        badge: {
          none: '#9C8DB0',
          bronze: '#B07C4A',
          silver: '#94A3B8',
          gold: '#F5C76A',
          platinum: '#6B3B85',
        },
        success: c('success'),
        warning: c('warning'),
        danger: c('danger'),
        border: c('border'),
        nav: {
          DEFAULT: c('nav-bg'),
          raised: c('nav-bg-raised'),
          border: c('nav-border'),
          fg: c('nav-fg'),
          'fg-muted': c('nav-fg-muted'),
          'fg-subtle': c('nav-fg-subtle'),
        },
      },
      borderRadius: {
        card: '16px',
        sheet: '24px',
        pill: '999px',
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '38px', letterSpacing: '-0.5px' }],
        h1: ['28px', { lineHeight: '34px', letterSpacing: '-0.4px' }],
        h2: ['22px', { lineHeight: '28px', letterSpacing: '-0.3px' }],
        h3: ['18px', { lineHeight: '24px' }],
        body: ['15px', { lineHeight: '22px' }],
        small: ['13px', { lineHeight: '18px' }],
        caption: ['11px', { lineHeight: '14px', letterSpacing: '0.4px' }],
      },
    },
  },
  plugins: [],
};

export default config;
