import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(packageRoot, "src/style.css");
const outputPath = path.join(packageRoot, "dist/style.css");

const css = await fs.readFile(inputPath, "utf8");
const result = await postcss([tailwindcss()]).process(css, {
  from: inputPath,
  to: outputPath,
});

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, result.css, "utf8");
