/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0a0f',
          light: '#1a1a2e',
          accent: '#00ff9f',
          danger: '#ff0055',
          warning: '#fce83a',
          muted: '#4a4a6a',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
