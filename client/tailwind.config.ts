import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#00ff88",
        bg: "#0d0d0d",
        surface: "#1a1a1a",
        border: "#2a2a2a",
      },
    },
  },
  plugins: [],
} satisfies Config;
