import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const rendererCss = await fs.readFile(
  path.join(packageRoot, "src/lib/styles/rich-text-renderer.css"),
  "utf8"
);

await fs.mkdir(path.join(packageRoot, "dist"), { recursive: true });
await fs.writeFile(path.join(packageRoot, "dist/style.css"), rendererCss, "utf8");
