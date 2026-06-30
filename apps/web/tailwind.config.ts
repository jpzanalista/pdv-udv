import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

// Tokens via variáveis CSS (canais RGB) → claro/escuro em globals.css.
// Mantém os nomes históricos (brand/ink/canvas/line…) para não quebrar as telas
// e ainda preservar os modificadores de opacidade (ex.: bg-danger/10).
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: rgb('--brand'),
          dark: rgb('--brand-dark'),
          bg: rgb('--brand-bg'),
          subtle: rgb('--brand-subtle'),
          border: rgb('--brand-border'),
        },
        ink: {
          DEFAULT: rgb('--ink'),
          muted: rgb('--ink-muted'),
          light: rgb('--ink-light'),
        },
        success: rgb('--success'),
        warning: rgb('--warning'),
        danger: rgb('--danger'),
        surface: rgb('--surface'),
        canvas: rgb('--canvas'),
        line: rgb('--line'),
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.05)',
        md: '0 2px 5px rgba(0,0,0,0.08)',
        lg: '0 4px 12px rgba(0,0,0,0.12)',
      },
      minHeight: {
        touch: '44px',
        'touch-lg': '56px',
      },
      keyframes: {
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [animate],
} satisfies Config
