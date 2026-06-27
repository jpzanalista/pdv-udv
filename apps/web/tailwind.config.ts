import type { Config } from 'tailwindcss'

// Tokens portados do design system da referência (novo-encanto-ref).
// Marca = azul Novo Encanto. Ver ../DESIGN.md.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#118dff',
          dark: '#0a6dc2',
          bg: '#e1f0ff',
          subtle: '#f8fbff',
          border: '#d0e7ff',
        },
        ink: {
          DEFAULT: '#333333',
          muted: '#666666',
          light: '#888888',
        },
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c',
        surface: '#ffffff',
        canvas: '#f5f9ff',
        line: '#dddddd',
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
        touch: '44px', // alvo de toque padrão (iOS)
        'touch-lg': '56px', // caixa/totem
      },
    },
  },
  plugins: [],
} satisfies Config
