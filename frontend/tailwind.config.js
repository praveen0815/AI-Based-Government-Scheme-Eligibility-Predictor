/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A2E24",
          900: "#0F4D3A",
          800: "#145C46",
          700: "#176B52",
          600: "#1E7D61",
        },
        brand: {
          800: "#176B52",
          900: "#0F4D3A",
        },
        action: {
          DEFAULT: "#176B52",
          hover: "#0F4D3A",
        },
        accent: "#C49A4A",
        sage: "#E8F1EC",
        success: "#1B7A4A",
        warning: "#B45309",
        danger: "#B91C1C",
        canvas: "#F7F6F1",
        surface: "#FFFFFF",
        line: "#DDE3DE",
        ink: {
          900: "#26332E",
          700: "#3F4D47",
          500: "#66736D",
        },
        admin: {
          canvas: "#E8EDF4",
          sidebar: "#0B1220",
          accent: "#1D4ED8",
        },
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "Segoe UI", "system-ui", "sans-serif"],
        display: ["Manrope", "Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(38, 51, 46, 0.04), 0 10px 30px rgba(15, 77, 58, 0.06)",
        lift: "0 8px 20px rgba(15, 77, 58, 0.07), 0 20px 44px rgba(38, 51, 46, 0.07)",
        inset: "inset 0 0 0 1px rgba(221, 227, 222, 0.95)",
      },
      maxWidth: {
        shell: "90rem",
      },
      borderRadius: {
        card: "18px",
      },
    },
  },
  plugins: [],
};
