import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-tt-hoves-pro)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        cuub: {
          bg: "#000000",
          panel: "#0a0a0a",
          border: "#1a1a1a",
          line: "#262626",
          line2: "#333333",
          line3: "#404040",
          muted2: "#525252",
          muted: "#737373",
          subtle: "#a3a3a3",
          fg2: "#d4d4d4",
          fg: "#e5e5e5",
          accent: "#0099FF",
          "accent-hover": "#008ae6",
          success: "#22c55e",
          danger: "#ef4444",
          "danger-soft": "#fca5a5",
          "danger-bg": "#3C1C1D",
          "danger-fg": "#FF6467",
          warning: "#f59e0b",
          "delete-bg": "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
