/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        bounce: 'bounce 1s infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      colors: {
        solana: {
          purple: '#9333ea',
          'purple-light': '#a855f7',
          'purple-dark': '#7c3aed',
          gradient: {
            start: '#818cf8',
            end: '#9333ea',
          },
          bg: '#f0f0ff',
          'bg-light': '#e8e5ff',
          'bg-dark': '#ddd6fe',
        },
      },
      backgroundImage: {
        'solana-gradient': 'linear-gradient(135deg, #818cf8, #9333ea)',
        'solana-gradient-hover': 'linear-gradient(135deg, #a855f7, #9333ea)',
      },
    },
  },
  plugins: [],
} 