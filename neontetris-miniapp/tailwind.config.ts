import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#05020a',
        panel: '#0b0715',
        panel2: '#120a24',
        neon: {
          cyan: '#00f6ff',
          magenta: '#ff2bd6',
          purple: '#8b2bff',
          yellow: '#f9f871',
          green: '#39ff8f',
          orange: '#ff7a1a',
          blue: '#2b6bff',
          red: '#ff2b4a',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'monospace'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 6px currentColor, 0 0 18px currentColor, 0 0 36px currentColor',
        'neon-sm': '0 0 4px currentColor, 0 0 10px currentColor',
      },
      animation: {
        flicker: 'flicker 2.4s infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'line-clear': 'lineClear 0.35s ease-out',
      },
      keyframes: {
        flicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.4' },
        },
        lineClear: {
          '0%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.2', filter: 'brightness(3)' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
