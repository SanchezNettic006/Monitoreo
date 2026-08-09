/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'nettic': {
          'yellow': '#94C120',    // Verde claro/amarillo
          'orange': '#F0A400',    // Naranja
          'green': '#2B8A3E',     // Verde oscuro principal
          'green-dark': '#1a5a2a', // Verde más oscuro
          'white': '#FFFFFF',     // Blanco
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(43, 138, 62, 0.3)',
      }
    },
  },
  plugins: [],
}

