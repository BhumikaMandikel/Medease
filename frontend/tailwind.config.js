/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          primary: '#1A6B5A',
          hover: '#155A4A',
          light: '#D1E8E2',
        },
        gold: '#C8952A',
        cream: '#FDFAF6',
        warning: {
          bg: '#FFF8E1',
          border: '#F59E0B',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}