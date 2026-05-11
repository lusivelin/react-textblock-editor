import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: ".",
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "./src/index.ts",
      name: "RaveRichTextEditor",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs")
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"]
    }
  }
});
