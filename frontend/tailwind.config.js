/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "rgb(var(--sw-navy-950) / <alpha-value>)",
          900: "rgb(var(--sw-navy-900) / <alpha-value>)",
          800: "rgb(var(--sw-navy-800) / <alpha-value>)",
          700: "rgb(var(--sw-navy-700) / <alpha-value>)",
          600: "rgb(var(--sw-navy-600) / <alpha-value>)",
        },
        brand: {
          800: "rgb(var(--sw-navy-700) / <alpha-value>)",
          900: "rgb(var(--sw-navy-900) / <alpha-value>)",
        },
        action: {
          DEFAULT: "rgb(var(--sw-action) / <alpha-value>)",
          hover: "rgb(var(--sw-action-hover) / <alpha-value>)",
        },
        accent: "rgb(var(--sw-accent) / <alpha-value>)",
        sage: "rgb(var(--sw-sage) / <alpha-value>)",
        success: "rgb(var(--sw-success) / <alpha-value>)",
        warning: "rgb(var(--sw-warning) / <alpha-value>)",
        danger: "rgb(var(--sw-danger) / <alpha-value>)",
        canvas: "rgb(var(--sw-canvas) / <alpha-value>)",
        surface: "rgb(var(--sw-surface) / <alpha-value>)",
        line: "rgb(var(--sw-line) / <alpha-value>)",
        ink: {
          900: "rgb(var(--sw-ink-900) / <alpha-value>)",
          700: "rgb(var(--sw-ink-700) / <alpha-value>)",
          500: "rgb(var(--sw-ink-500) / <alpha-value>)",
        },
        admin: {
          canvas: "var(--admin-soft)",
          sidebar: "var(--admin-sidebar)",
          accent: "var(--admin-accent)",
        },
        neuron: {
          bg: "#0a0a0c",
          card: "#111113",
          accent: "#8b7cf7",
          glow: "#c4b5fd",
          gold: "#d4af5a",
        },
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "Segoe UI", "system-ui", "sans-serif"],
        display: ["Manrope", "Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--sw-shadow-card)",
        lift: "var(--sw-shadow-lift)",
        inset: "var(--sw-shadow-inset)",
      },
      maxWidth: {
        shell: "90rem",
      },
      borderRadius: {
        card: "18px",
        panel: "22px",
        hero: "24px",
      },
    },
  },
  plugins: [],
};
