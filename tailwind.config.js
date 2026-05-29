/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        neo: {
          black: '#0a0a0a',
          white: '#fefefe',
          yellow: '#ffd700',
          pink: '#ff3366',
          cyan: '#00e5ff',
          lime: '#39ff14',
          orange: '#ff6b35',
          red: '#ff0033',
          gray: '#e0e0e0',
          darkgray: '#888888',
        }
      },
      fontFamily: {
        brut: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'brut-xs': ['0.75rem', { lineHeight: '1', fontWeight: '700' }],
        'brut-sm': ['0.875rem', { lineHeight: '1.1', fontWeight: '700' }],
        'brut-base': ['1rem', { lineHeight: '1.2', fontWeight: '700' }],
        'brut-lg': ['1.25rem', { lineHeight: '1.1', fontWeight: '700' }],
        'brut-xl': ['1.5rem', { lineHeight: '1', fontWeight: '700' }],
        'brut-2xl': ['2rem', { lineHeight: '1', fontWeight: '700' }],
        'brut-3xl': ['2.5rem', { lineHeight: '1', fontWeight: '700' }],
        'brut-4xl': ['3.5rem', { lineHeight: '1', fontWeight: '700' }],
      },
      boxShadow: {
        'brut': '6px 6px 0px #0a0a0a',
        'brut-sm': '4px 4px 0px #0a0a0a',
        'brut-lg': '8px 8px 0px #0a0a0a',
        'brut-hover': '3px 3px 0px #0a0a0a',
        'brut-colored': '6px 6px 0px #ffd700',
        'brut-pink': '6px 6px 0px #ff3366',
        'brut-cyan': '6px 6px 0px #00e5ff',
      },
      borderWidth: {
        'brut': '3px',
        'brut-thick': '4px',
      },
      animation: {
        'brut-bounce': 'brutBounce 0.3s ease',
        'brut-shake': 'brutShake 0.4s ease',
      },
      keyframes: {
        brutBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        brutShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      }
    }
  },
  plugins: []
};
