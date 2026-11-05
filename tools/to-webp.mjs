/**
 * Converts JPEG/PNG images to WebP (quality 80) next to the originals.
 *
 *   npm run images:webp -- images/journals/pages/my-zine
 *   npm run images:webp -- --replace images/journals
 *
 * Arguments are files or folders (folders are searched recursively).
 * --replace deletes each original after its .webp is written; without it the
 * originals are kept so you can compare first. Remember to point
 * js/journal-data.js at the new .webp paths.
 */
import { readdir, stat, unlink } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

const QUALITY = 80;
const SOURCE_TYPES = new Set([".jpg", ".jpeg", ".png"]);

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const targets = args.filter((arg) => arg !== "--replace");

if (!targets.length) {
  console.error("Usage: npm run images:webp -- [--replace] <file|folder>...");
  process.exit(1);
}

async function* imagesIn(path) {
  if ((await stat(path)).isDirectory()) {
    for (const entry of await readdir(path)) yield* imagesIn(join(path, entry));
  } else if (SOURCE_TYPES.has(extname(path).toLowerCase())) {
    yield path;
  }
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
let before = 0;
let after = 0;

for (const target of targets) {
  for await (const source of imagesIn(target)) {
    const output = source.slice(0, -extname(source).length) + ".webp";
    const info = await sharp(source).webp({ quality: QUALITY }).toFile(output);
    const original = (await stat(source)).size;
    before += original;
    after += info.size;
    console.log(`${source} → ${output} (${kb(original)} → ${kb(info.size)})`);
    if (replace) await unlink(source);
  }
}

console.log(`Total: ${kb(before)} → ${kb(after)}`);
