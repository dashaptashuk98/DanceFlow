/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0c1214',
          900: '#121a1d',
          800: '#1a262b',
          700: '#243338',
        },
        mist: {
          50: '#f4f7f6',
          100: '#e8efed',
          200: '#d0ddd9',
        },
        accent: {
          DEFAULT: '#c45c26',
          soft: '#e8a078',
          deep: '#8f3d12',
        },
        teal: {
          DEFAULT: '#1f6f6a',
          soft: '#3d9a93',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'system-ui', 'sans-serif'],
        body: ['"Manrope"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'studio-glow':
          'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(61,154,147,0.18), transparent), radial-gradient(ellipse 60% 50% at 90% 20%, rgba(196,92,38,0.14), transparent), linear-gradient(160deg, #0c1214 0%, #121a1d 45%, #1a262b 100%)',
      },
    },
  },
  plugins: [],
};
