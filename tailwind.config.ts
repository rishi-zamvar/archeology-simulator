/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{tsx,ts}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          50:  '#fdf8f0',
          100: '#f8edd8',
          200: '#f0d9b5',
          300: '#e8c48a',
          400: '#d4a96a',
          500: '#b8894a',
          600: '#8b6535',
          700: '#6b4c28',
          800: '#4a3319',
          900: '#2d1f0f',
        },
        sepia: {
          text: '#3d2b1f',
          muted: '#7a5c45',
          border: '#c4956a',
        },
      },
      fontFamily: {
        heading: ['Cinzel', 'Palatino Linotype', 'Georgia', 'serif'],
        body: ['Lora', 'Palatino Linotype', 'Georgia', 'serif'],
      },
      boxShadow: {
        parchment: 'inset 0 0 60px rgba(180, 140, 80, 0.3)',
      },
    },
  },
};
