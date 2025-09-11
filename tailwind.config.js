/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'thai': ['Prompt', 'Noto Sans Thai', 'Sarabun', 'TH Sarabun New', 'Tahoma', 'sans-serif'],
        'eng': ['Spline Sans Mono', 'Courier New', 'monospace'],
        'concert': ['Concert One', 'cursive'],
        'sans': ['Prompt', 'Noto Sans Thai', 'Sarabun', 'TH Sarabun New', 'Tahoma', 'sans-serif'], // Default with comprehensive Thai fallback
      },
    },
  },
  plugins: [],
}