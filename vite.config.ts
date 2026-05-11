import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: ".",
  plugins: [react()],
  build: {
    outDir: "site-dist",
    emptyOutDir: true
  },
  server: {
    port: 4173,
    open: false
  }
});
