/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef7f3',
          100: '#d6ebe1',
          200: '#aed6c2',
          300: '#7fbc9d',
          400: '#4f9e76',
          500: '#2d6a4f',
          600: '#245540',
          700: '#1c4232',
          800: '#152f24',
          900: '#0d1d17',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
