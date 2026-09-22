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
        brand: {
          yellow: '#F59E0B',
          yellowLight: '#FEF3C7',
          orange: '#F97316',
          orangeDark: '#C2410C',
          dark: '#0F172A',
          darkCard: '#1E293B',
          darkBorder: '#334155',
          lightSky: '#F0F9FF',
          skyAccent: '#0EA5E9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
