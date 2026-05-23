/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04), 0 24px 48px -24px rgba(0,0,0,0.6)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
};
