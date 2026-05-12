import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const libraryEntry = "./src/lib/index.ts";
const libraryOutDir = "dist";
const libraryExternal = ["react", "react-dom", "react/jsx-runtime", "@automerge/automerge"];

export default defineConfig({
  root: ".",
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: {
      "@lib": resolve(__dirname, "src/lib"),
    },
  },
  build: {
    outDir: libraryOutDir,
    emptyOutDir: true,
    lib: {
      entry: libraryEntry,
      name: "RaveRichTextEditor",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs")
    },
    rollupOptions: {
      external: libraryExternal
    }
  }
});
