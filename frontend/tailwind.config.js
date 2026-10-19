/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#0B0B0B',
          50: '#1a1a1a',
          100: '#141414',
          200: '#0f0f0f',
          300: '#0B0B0B',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E8CC6A',
          dark: '#A8871C',
          muted: '#8B6914',
          glow: 'rgba(212,175,55,0.15)',
        },
        slate: {
          panel: '#2C2C2C',
          border: '#3a3a3a',
          text: '#9CA3AF',
        },
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        playfair: ['"Playfair Display"', 'serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #E8CC6A 50%, #A8871C 100%)',
        'obsidian-gradient': 'linear-gradient(180deg, #0B0B0B 0%, #141414 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(44,44,44,0.8) 0%, rgba(20,20,20,0.9) 100%)',
      },
      boxShadow: {
        gold: '0 0 30px rgba(212,175,55,0.2)',
        'gold-sm': '0 0 15px rgba(212,175,55,0.15)',
        panel: '0 4px 24px rgba(0,0,0,0.6)',
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-gold': 'pulseGold 3s ease-in-out infinite',
        'coin-rotate': 'coinRotate 8s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212,175,55,0.2)' },
          '50%': { boxShadow: '0 0 50px rgba(212,175,55,0.5)' },
        },
        coinRotate: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [],
}
