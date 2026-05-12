import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const demoRoot = "./src/demo";
const demoOutDir = "../../site-dist";
const demoPort = 4173;

export default defineConfig({
  root: demoRoot,
  plugins: [wasm(), react()],
  resolve: {
    alias: {
      "@lib": resolve(__dirname, "src/lib"),
    },
  },
  build: {
    outDir: demoOutDir,
    emptyOutDir: true,
  },
  server: {
    port: demoPort,
    open: false,
  }
});
