/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand scale - attendance/school administrative palette.
        brand: {
          DEFAULT: "#2563EB",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        success: { DEFAULT: "#22C55E", 100: "#DCFCE7", 700: "#15803D" },
        warning: { DEFAULT: "#F59E0B", 100: "#FEF3C7", 700: "#B45309" },
        danger: { DEFAULT: "#EF4444", 100: "#FEE2E2", 700: "#B91C1C" },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
      },
      animation: {
        "scan-line": "scanline 2.2s linear infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        scanline: {
          "0%": { top: "0%", opacity: "0.8" },
          "50%": { top: "95%", opacity: "1" },
          "100%": { top: "0%", opacity: "0.8" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
  darkMode: "class",
};