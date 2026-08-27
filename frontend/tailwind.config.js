/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0B1B33",
          800: "#12243F",
          700: "#1A3054",
        },
        brand: {
          800: "#1E3A5F",
          900: "#172554",
        },
        action: {
          DEFAULT: "#315CF6",
          hover: "#2548D4",
        },
        accent: "#0F9F8F",
        success: "#0F766E",
        warning: "#B45309",
        danger: "#B91C1C",
        canvas: "#F7F9FC",
        surface: "#FFFFFF",
        line: "#E2E8F0",
        ink: {
          900: "#0F172A",
          700: "#334155",
          500: "#64748B",
        },
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)",
        lift: "0 2px 4px rgba(15, 23, 42, 0.05), 0 12px 28px rgba(15, 23, 42, 0.06)",
      },
      maxWidth: {
        shell: "88rem",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
