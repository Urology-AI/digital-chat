/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      colors: {
        sinai: {
          50: "#e6f7fc",
          100: "#b3e8f7",
          200: "#80d9f2",
          300: "#4dc9ed",
          400: "#00AEEF",
          500: "#0099d6",
          600: "#007ab3",
          700: "#212070",
          800: "#1a1a5a",
          900: "#00002D",
          magenta: "#DC298D",
          violet: "#212070",
        },
      },
    },
  },
  plugins: [],
};
