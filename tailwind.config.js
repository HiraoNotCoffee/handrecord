/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spade: '#1a1a2e',
        heart: '#e63946',
        diamond: '#4361ee',
        club: '#2d6a4f',
      },
    },
  },
  plugins: [],
}
