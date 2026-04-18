/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx}"],
  mode: "jit",
  theme: {
    fontFamily: {
      Roboto: ["Roboto", "sans-serif"],
      Poppins: ["Poppins", "sans-serif"],
    },
    extend: {
      screens: {
        "1000px": "1050px",
        "1100px": "1110px",
        "800px": "800px",
        "1300px": "1300px",
        "400px": "400px",
      },
      colors: {
        // Primary Structure
        'primary-dark': '#1E293B',
        'primary-light': '#334155',
        
        // Brand Orange
        'brand-orange': '#F97316',
        'orange-hover': '#EA580C',
        'soft-orange': '#FB923C',
        'orange-bg': '#FFF7ED',
        
        // Accents
        'success': '#22C55E',
        'info': '#3B82F6',
        
        // Neutrals
        'background': '#F8FAFC',
        'card': '#FFFFFF',
        'border-gray': '#E5E7EB',
        
        // Text
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'light-text': '#FFFFFF',
      },
    },
  },
  plugins: [],
};