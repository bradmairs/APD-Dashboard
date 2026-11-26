/** @type {import('tailwindcss').Config} */
//
// The look (2.7): GVW brand colours, Inter, softer cards and motion. Most of
// it is done here, by re-tuning the colours and shapes every component
// already uses, so the whole app changes together:
//   - "blue" is GVW's water blue (#168bc1 in the logo), deepened at 600+ so
//     white text on buttons stays readable;
//   - "slate" leans towards GVW's navy (#022342), most visibly in dark mode;
//   - corners are rounder and shadows softer.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        blue: {
          50: "#eef8fc",
          100: "#d6eef8",
          200: "#afdcf0",
          300: "#78c3e4",
          400: "#3ea7d5",
          500: "#168bc1",
          600: "#12719e",
          700: "#0f5c82",
          800: "#0d4b6a",
          900: "#0b3d57",
          950: "#072638",
        },
        navy: {
          DEFAULT: "#022342",
          500: "#0b3a63",
          600: "#072d52",
          700: "#022342",
          800: "#011a33",
        },
        slate: {
          50: "#f6f8fb",
          100: "#eef2f7",
          200: "#e3e8ef",
          300: "#cbd3de",
          400: "#94a0b2",
          500: "#586679",
          600: "#4a5a70",
          700: "#2a3a52",
          800: "#15233b",
          900: "#0d182b",
          950: "#070f1d",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        sm: "0 1px 2px rgb(2 35 66 / 0.04), 0 1px 3px rgb(2 35 66 / 0.06)",
        DEFAULT: "0 2px 6px rgb(2 35 66 / 0.06), 0 1px 2px rgb(2 35 66 / 0.04)",
        lg: "0 10px 30px -6px rgb(2 35 66 / 0.18)",
        xl: "0 20px 45px -10px rgb(2 35 66 / 0.28)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        rise: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-in-right": "slide-in-right 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        "pop-in": "pop-in 140ms ease-out",
        rise: "rise 220ms ease-out both",
      },
    },
  },
  plugins: [],
};
