/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          emerald: {
            800: '#166534', // Sindh Govt Green
          },
          slate: {
            950: '#0a0f1a', // Deep Slate
          },
          border: "hsl(var(--color-border))",
        },
        backdropBlur: {
          xs: '2px',
        }
      },
    },
    plugins: [],
  }