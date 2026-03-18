/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "primary": "#272756",
        "accent": "#ec5b13",
        "background-light": "#f8f9fb",
        "background-dark": "#0f172a",
      },
      fontFamily: {
        "sans": ["Inter", "system-ui", "-apple-system", "sans-serif"]
      },
    },
  },
  plugins: [],
}

