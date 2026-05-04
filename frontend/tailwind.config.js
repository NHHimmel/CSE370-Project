/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void:     '#000000',
        obsidian: '#080808',
        charcoal: '#0f0f0f',
        graphite: '#181818',
        ash:      '#242424',
        steel:    '#333333',
        muted:    '#666666',
        silver:   '#999999',
        pearl:    '#cccccc',
        snow:     '#f0f0f0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-hero':  'linear-gradient(135deg, #000000 0%, #141414 60%, #0a0a0a 100%)',
        'gradient-card':  'linear-gradient(180deg, #1a1a1a 0%, #050505 100%)',
        'gradient-shine': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)',
      },
      animation: {
        'fade-in':  'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(24px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(255,255,255,0.06)',
        'glow':    '0 0 24px rgba(255,255,255,0.09)',
        'glow-lg': '0 0 48px rgba(255,255,255,0.12)',
      },
    },
  },
  plugins: [],
}
