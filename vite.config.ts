import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  root: ".",
  plugins: [wasm(), react()],
  build: {
    outDir: "site-dist",
    emptyOutDir: true
  },
  server: {
    port: 4173,
    open: false
  }
});
