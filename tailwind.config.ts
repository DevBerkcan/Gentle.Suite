import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface:    "rgb(var(--color-surface) / <alpha-value>)",
        text:       "rgb(var(--color-text) / <alpha-value>)",
        muted:      "rgb(var(--color-muted) / <alpha-value>)",
        border:     "rgb(var(--color-border) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          hover:   "rgb(var(--color-primary-hover) / <alpha-value>)",
        },
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        // Fixed brand colours from gentlegroup.de — stay the same in dark mode (header, sidebar)
        navy: "#010A30",
        secondary: "#A97AFF",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger:  "rgb(var(--color-danger) / <alpha-value>)",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], display: ["Clash Display", "Inter", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
