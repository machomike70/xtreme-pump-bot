import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    target: "esnext",
  },
  server: {
    proxy: {
      "/pump-alpha/feed": "http://localhost:8000",
    },
  },
});
