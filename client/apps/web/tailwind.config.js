/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FFFFFF',
        secondary: '#F6F8F5',
        cta: '#14532D',
        'cta-light': '#22C55E',
        background: '#F3F6F2',
        'text-base': '#0B1720',
        surface: '#FFFFFF',
        'surface-2': '#F6F8F5',
        border: '#E3E9E1',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.07)',
        lg: '0 10px 15px rgba(0,0,0,0.07)',
        xl: '0 20px 25px rgba(0,0,0,0.08)',
        card: '0 14px 36px rgba(15, 23, 42, 0.07)',
        'card-hover': '0 18px 44px rgba(20, 83, 45, 0.14)',
        shell: '0 18px 50px rgba(15, 23, 42, 0.08)',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      maxWidth: {
        dashboard: '1580px',
      },
      gridTemplateColumns: {
        12: 'repeat(12, minmax(0, 1fr))',
      },
      borderRadius: {
        card: '18px',
        xl: '16px',
      },
      transitionDuration: {
        200: '200ms',
      },
    },
  },
  plugins: [],
}
