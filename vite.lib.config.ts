import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const libraryEntry = {
  index: "./src/lib/index.ts",
  // SSR-safe, ProseMirror-free entry — see src/lib/renderer.ts
  renderer: "./src/lib/renderer.ts",
};
const libraryOutDir = "dist";
const libraryExternalPackages = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
];

function isLibraryExternal(id: string) {
  return libraryExternalPackages.some((packageName) => id === packageName || id.startsWith(`${packageName}/`));
}

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
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`
    },
    rollupOptions: {
      external: isLibraryExternal
    }
  }
});
