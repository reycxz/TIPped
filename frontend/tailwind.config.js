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
        midnight: '#0F172A',
        mist: '#F8FAFC',
        amber: {
          DEFAULT: '#F59E0B',
          500: '#F59E0B',
        },
        slate: {
          brand: '#647488',
        },
        honey: '#FDE68A',
        ember: '#D97706',
        background: 'var(--bg-primary)',
        text: 'var(--text-primary)',
        surface: 'var(--bg-surface)',
        primary: '#F59E0B',
        muted: '#647488',
        pending: '#F59E0B',
        inProgress: '#38BDF8',
        'in-progress': '#38BDF8',
        resolved: '#10B981',
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", 'sans-serif'],
        sans: ["'DM Sans'", 'sans-serif'],
        text: ["'DM Sans'", 'sans-serif'],
      },
    },
  },
  plugins: [],
}
