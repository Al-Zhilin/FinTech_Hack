/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#F7F5F2',
          card: '#FFFFFF',
          elevated: '#FEFEFE',
          muted: '#F2F0ED',
        },
        primary: {
          DEFAULT: '#E8856A',
          light: '#FDF0EC',
          dark: '#D4705A',
          foreground: '#FFFFFF',
        },
        purple: {
          DEFAULT: '#B87EFF',
          light: '#F3EAFF',
          dark: '#9B5EEF',
        },
        success: {
          DEFAULT: '#34C759',
          light: '#E8F9ED',
        },
        warning: {
          DEFAULT: '#FF9500',
          light: '#FFF3E0',
        },
        danger: {
          DEFAULT: '#FF3B30',
          light: '#FFE8E7',
        },
        text: {
          primary: '#1C1C1E',
          secondary: '#8E8E93',
          tertiary: '#AEAEB2',
          inverse: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E5E5EA',
          light: '#F2F2F7',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xs': '6px',
        'sm': '10px',
        'md': '14px',
        'lg': '18px',
        'xl': '22px',
        '2xl': '28px',
        '3xl': '36px',
        '4xl': '48px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10)',
        'primary': '0 8px 24px rgba(232,133,106,0.35)',
        'purple': '0 8px 24px rgba(184,126,255,0.30)',
        'bottom-nav': '0 -1px 0 rgba(0,0,0,0.06), 0 -4px 20px rgba(0,0,0,0.04)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'nav': '72px',
      },
      maxWidth: {
        'mobile': '430px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #E8856A 0%, #FF9A7E 100%)',
        'gradient-purple': 'linear-gradient(135deg, #B87EFF 0%, #D4A8FF 100%)',
        'gradient-success': 'linear-gradient(135deg, #34C759 0%, #6EE7A0 100%)',
        'gradient-hero': 'linear-gradient(160deg, #FFF6F3 0%, #F7F5F2 60%, #F0EEF8 100%)',
        'gradient-card-pink': 'linear-gradient(135deg, #FFF0EC 0%, #FFE4DC 100%)',
        'gradient-card-purple': 'linear-gradient(135deg, #F3EAFF 0%, #E8D8FF 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-right': 'slideInRight 0.35s ease-out',
        'pulse-dot': 'pulseDot 1.4s infinite ease-in-out',
        'typing': 'typing 1s steps(3) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        pulseDot: { '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.5' }, '40%': { transform: 'scale(1)', opacity: '1' } },
        typing: { '0%, 100%': { content: '.' }, '33%': { content: '..' }, '66%': { content: '...' } },
      },
    },
  },
  plugins: [],
}
