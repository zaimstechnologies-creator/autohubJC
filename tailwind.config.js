/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        alshaheen: {
          navy: '#18254c',
          navyDark: '#0e1730',
          navyDeep: '#080d1c',
          crimson: '#ba1825',
          crimsonHover: '#a1141f',
          gold: '#b8823b',
          goldLight: '#d4a359',
          amber: '#d97706',
          bg: '#070b14',
          card: '#0f172a',
        },
        navy: {
          950: '#070b14',
          900: '#0B1221',
          800: '#111d35',
          700: '#18254c',
          600: '#233966',
        },
        brand: {
          gold: '#b8823b',
          amber: '#d97706',
          red: '#ba1825',
          cyan: '#06b6d4',
          emerald: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        script: ['Brush Script MT', 'cursive'],
      }
    },
  },
  plugins: [],
}
