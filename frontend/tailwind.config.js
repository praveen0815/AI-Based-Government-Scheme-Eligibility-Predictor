/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#071225",
          900: "#0B1B33",
          800: "#12243F",
          700: "#1A3054",
          600: "#243E68",
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
        canvas: "#F4F6FB",
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
        display: ["Manrope", "Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 27, 51, 0.04), 0 10px 28px rgba(11, 27, 51, 0.06)",
        lift: "0 4px 8px rgba(11, 27, 51, 0.06), 0 16px 36px rgba(11, 27, 51, 0.08)",
        inset: "inset 0 0 0 1px rgba(226, 232, 240, 0.9)",
      },
      maxWidth: {
        shell: "88rem",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};
