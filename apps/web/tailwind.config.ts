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
    },
  },
  plugins: [],
};

export default config;
