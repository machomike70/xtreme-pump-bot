import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent:      "#39FF14",
        "accent-dim":"#1a8c00",
        live:        "#ff1a1a",
        gold:        "#FFD700",
        fire:        "#ff6b00",
        bg:          "#080c08",
        panel:       "#0e160e",
        surface:     "#141e14",
        card:        "#1a261a",
        border:      "#1e2e1e",
        "border-hi": "#2a4a2a",
      },
    },
  },
  plugins: [],
} satisfies Config;
