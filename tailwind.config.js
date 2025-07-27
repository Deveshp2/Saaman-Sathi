/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFECFE',
          100: '#FF2B67',
          200: '#FF2D49',
          300: '#FF4861',
          400: '#FF4A7D',
          500: '#F24475',
          600: '#91183A',
        },
        secondary: {
          50: '#F5F5F5',
          100: '#F0F1F3',
          200: '#EADCE3',
          300: '#D7CFD0',
          400: '#ACA6A7',
          500: '#9D858C',
          600: '#856672',
          700: '#795D65',
          800: '#7C636F',
          900: '#49383F',
          950: '#37121B',
        },
        success: {
          50: '#EBFFED',
          100: '#4DFF88',
          200: '#58D365',
        },
        warning: {
          50: '#FFEEDB',
          100: '#FFB835',
          200: '#DBA362',
        },
        info: {
          50: '#E8F1FD',
          100: '#629FF4',
          200: '#009ED8',
          300: '#24B8F1',
        },
        purple: {
          50: '#ECEAFF',
          100: '#817AF3',
          200: '#967EFF',
        },
        gray: {
          50: '#FFFFFF',
          100: '#F0F1F3',
          200: '#EEEEEE',
          300: '#C4C4C4',
          400: '#AEAEAE',
          500: '#9D858C',
          600: '#856672',
          700: '#795D65',
          800: '#666666',
          900: '#444444',
        }
      },
      fontFamily: {
        'manrope': ['Manrope', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
        'urbanist': ['Urbanist', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF2B67 0%, #91183A 100%)',
        'gradient-secondary': 'linear-gradient(180deg, #FFFFFF 0%, #FFECFE 100%)',
      }
    },
  },
  plugins: [],
} 