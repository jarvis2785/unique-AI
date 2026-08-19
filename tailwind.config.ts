import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#080f1a',
        surface: '#131d33',
        elevated: '#22304f',
        primary: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        text: {
          DEFAULT: '#f8fafc',
          muted: '#94a3b8',
        },
        payment: {
          cash: '#22c55e',
          upi: '#3b82f6',
          card: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      spacing: {
        tap: '48px',
      },
      animation: {
        'slide-up': 'slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up-panel': 'slide-up 300ms ease',
        'fade-in': 'fade-in 0.15s ease-out',
        'toast-in': 'toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        shake: 'shake 0.4s ease-in-out',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-slow': 'pulse-slow 1.6s ease-in-out infinite',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'toast-in': {
          from: { transform: 'translateY(-16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        'pop-in': {
          from: { transform: 'scale(0.6)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
