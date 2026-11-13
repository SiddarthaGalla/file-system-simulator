/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#ECECEB',
          dark: '#121212'
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1C1C1E'
        },
        ink: {
          primary: '#181818',
          secondary: '#5B5B59',
          muted: '#C2C2B4',
          inverted: '#FFFFFF'
        },
        lime: {
          DEFAULT: '#8FED0E',
          hover: '#7ED80B',
          muted: '#D8F796'
        },
        subtle: {
          border: '#E1E1DE',
          darkBorder: '#2C2C2E'
        },
        earth: '#8C7E57'
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

