import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(packageRoot, "dist");
const themeDistRoot = path.join(distRoot, "themes");

async function readSourceCss(relativePath) {
  return fs.readFile(path.join(packageRoot, relativePath), "utf8");
}

const [coreCss, defaultThemeCss, rendererCss, darkThemeCss, minimalThemeCss] = await Promise.all([
  readSourceCss("src/lib/styles/core.css"),
  readSourceCss("src/lib/styles/themes/default.css"),
  readSourceCss("src/lib/styles/rich-text-renderer.css"),
  readSourceCss("src/lib/styles/themes/dark.css"),
  readSourceCss("src/lib/styles/themes/minimal.css"),
]);

await fs.mkdir(themeDistRoot, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(distRoot, "style.css"), [coreCss, defaultThemeCss, rendererCss].join("\n\n"), "utf8"),
  // Renderer-only styles for SSR consumers that import the "./renderer" entry.
  fs.writeFile(path.join(distRoot, "renderer.css"), rendererCss, "utf8"),
  fs.writeFile(path.join(themeDistRoot, "default.css"), defaultThemeCss, "utf8"),
  fs.writeFile(path.join(themeDistRoot, "dark.css"), darkThemeCss, "utf8"),
  fs.writeFile(path.join(themeDistRoot, "minimal.css"), minimalThemeCss, "utf8"),
]);
