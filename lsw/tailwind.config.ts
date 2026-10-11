import type { Config } from 'tailwindcss';
// One brand palette shared by every portal (root, agency, exam, admin).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0F172A', 800: '#1E293B' },
        brand: '#2563EB',
        gold: '#D4A537',
        ember: '#F26522',
        paper: '#F6F8FC',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
