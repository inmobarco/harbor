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
          white: '#f1fafe',
          gray: '#d2d9e0',
          black: '#141f21',
          blue: '#48bff7',
          'blue-dark': '#1b99d3',
        }
      }
    }
  },
  plugins: [],
} satisfies Config
