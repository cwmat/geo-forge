/**
 * Copies gdal3.js WASM assets to public/gdal/ so they can be served as static files.
 * Runs automatically via the "postinstall" npm script.
 *
 * Required files:
 *   - gdal3WebAssembly.wasm (~27 MB) — the compiled GDAL WASM binary
 *   - gdal3WebAssembly.data (~11 MB) — PROJ database + GDAL data filesystem
 */
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "gdal3.js", "dist", "package");
const dest = join(root, "public", "gdal");

const files = ["gdal3WebAssembly.wasm", "gdal3WebAssembly.data", "gdal3.js"];

if (!existsSync(src)) {
  console.log("⏭  gdal3.js not installed yet — skipping asset copy");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

for (const file of files) {
  const from = join(src, file);
  const to = join(dest, file);
  if (!existsSync(from)) {
    console.warn(`⚠  Missing ${from}`);
    continue;
  }
  copyFileSync(from, to);
  console.log(`✓  ${file} → public/gdal/`);
}
