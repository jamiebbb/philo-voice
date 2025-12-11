/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Phoenician-inspired palette
        phoenician: {
          terracotta: '#C84B31',
          bronze: '#B8860B',
          gold: '#D4AF37',
          sand: '#E8D5B7',
          cream: '#FAF3E0',
          navy: '#1B2838',
          deep: '#0D1821',
          sea: '#2E5266',
          purple: '#4A1942',
          wine: '#722F37',
        }
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Cormorant Garamond', 'serif'],
      },
      animation: {
        'wave': 'wave 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateX(0) translateY(0)' },
          '25%': { transform: 'translateX(-5px) translateY(5px)' },
          '50%': { transform: 'translateX(5px) translateY(-5px)' },
          '75%': { transform: 'translateX(-3px) translateY(3px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}

