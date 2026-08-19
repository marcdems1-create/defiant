import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#0b0e11',
        ink: '#f2f4f7',
        border: '#1e232b',
        accent: '#3ecf8e',
        accentDim: '#1f7a54',
        warn: '#e0a83e',
        danger: '#e0544d',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'plane-fly': {
          '0%': {
            transform: 'translateX(0) translateY(1px) rotate(-9deg)',
            opacity: '0.85',
          },
          '50%': {
            transform: 'translateX(160px) translateY(-3px) rotate(2deg)',
            opacity: '1',
          },
          '100%': {
            transform: 'translateX(320px) translateY(1px) rotate(8deg)',
            opacity: '0.85',
          },
        },
      },
      animation: {
        'plane-fly': 'plane-fly 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
