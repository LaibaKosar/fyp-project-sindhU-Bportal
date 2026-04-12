/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        maxWidth: {
          /** Public landing shell: wider than `7xl` (1280px), capped for readability */
          landing: 'min(100%, 96rem)',
        },
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