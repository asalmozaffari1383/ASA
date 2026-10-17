/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Vazirmatn", "Tahoma", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef7f2",
          500: "#0b7a4b",
          600: "#0b5e3b",
          700: "#084a2f",
        },
      },
    },
  },
  plugins: [],
};
