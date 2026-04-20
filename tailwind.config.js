/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "primary": "#262A56",
        "accent": "#ec5b13",
        "background-light": "#F8F9FE",
        "background-dark": "#0f172a",
        "card-light": "#FFFFFF",
      },
      fontFamily: {
        "sans": ["Inter", "system-ui", "-apple-system", "sans-serif"]
      },
    },
  },
  plugins: [],
}

