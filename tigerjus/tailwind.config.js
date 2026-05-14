/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: '#D4A843',
        'gold-light': '#F0C96A',
        'gold-dark': '#A07820',
        orange: '#E8621A',
        'deep-black': '#050505',
        'app-black': '#0A0A0A',
        'app-gray': '#141414',
        'app-gray-mid': '#1E1E1E',
        'app-white': '#F5F0E8',
        success: '#4CAF7D',
        danger: '#E8421A',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
