/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'thai': ['Prompt', 'sans-serif'],
        'eng': ['Spline Sans Mono', 'monospace'],
        'concert': ['Concert One', 'cursive'],
        'sans': ['Prompt', 'sans-serif'], // Default for Thai content
      },
    },
  },
  plugins: [],
}