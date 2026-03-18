/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'scout-bg': '#0a0e17',
        'scout-panel': '#111827',
        'scout-border': '#1e2a3a',
        'scout-green': '#39ff14',
        'scout-amber': '#ffbf00',
        'scout-red': '#ff3b3b',
        'scout-blue': '#00bfff',
        'scout-muted': '#6b7280',
        'scout-text': '#e5e7eb',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'Consolas', 'monospace'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(57, 255, 20, 0)' },
          '50%': { boxShadow: '0 0 12px 2px rgba(57, 255, 20, 0.3)' },
        },
        scan: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
      },
    },
  },
  plugins: [],
};
