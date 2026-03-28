import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.ts',
    './plugins/**/*.ts',
    './app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        harbor: {
          // Paleta base
          white: '#f1fafe',
          gray: '#d2d9e0',
          black: '#141f21',
          blue: '#48bff7',
          'blue-dark': '#1b99d3',
          // Superficies
          'pure-white': '#ffffff',
          'neutral-white': '#f8f9fa',
          'surface-gray': '#e9ecef',
          'dark-surface': '#1c282b',
          // Estados
          success: '#34d399',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
          purple: '#a855f7',
        }
      }
    }
  },
  plugins: [],
} satisfies Config
