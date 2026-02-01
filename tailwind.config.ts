import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Custom colors for participant badges
        'badge-rosa': '#ec4899',
        'badge-preto': '#1f2937',
        'badge-azul-claro': '#38bdf8',
        'badge-dourado': '#fbbf24',
        'badge-laranja': '#f97316',
        // Qualification colors
        'qual-super': '#86efac',
        'qual-medio': '#93c5fd',
        'qual-baixo': '#fca5a5',
      },
    },
  },
  plugins: [],
}
export default config
