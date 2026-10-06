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
        background: '#0F172A',
        surface: '#1E293B',
        primary: '#F59E0B',
        text: '#F8FAFC',
        muted: '#94A3B8',
        pending: '#F59E0B',
        inProgress: '#38BDF8',
        'in-progress': '#38BDF8',
        resolved: '#10B981',
      },
    },
  },
  plugins: [],
}
