/**
 * One-off image pipeline: converts every PNG/JPG under img/ to WebP.
 *
 * Resizes anything wider than MAX_WIDTH, encodes at QUALITY, deletes the
 * original (a pristine copy already lives in img-original/), and writes
 * img/manifest.json mapping each file to its final intrinsic dimensions so
 * index.html can carry width/height attributes and avoid layout shift.
 *
 * Run with:  npx --yes -p sharp node tools/to-webp.mjs
 */
import { readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const IMG_DIR = "img";
const MAX_WIDTH = 1600;
const QUALITY = 82;
const SOURCE_EXT = new Set([".png", ".jpg", ".jpeg"]);

/** Recursively collect every convertible image path under `dir`. */
async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collect(full)));
    } else if (SOURCE_EXT.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }

  return files;
}

const sources = await collect(IMG_DIR);
const manifest = {};
let bytesBefore = 0;
let bytesAfter = 0;

for (const source of sources) {
  const target = source.replace(/\.(png|jpe?g)$/i, ".webp");

  const image = sharp(source);
  const { width } = await image.metadata();

  const info = await image
    .resize({ width: Math.min(width, MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(target);

  bytesBefore += (await stat(source)).size;
  bytesAfter += info.size;

  // Manifest keys use forward slashes so they match the HTML src attributes.
  manifest[target.split(path.sep).join("/")] = {
    width: info.width,
    height: info.height,
  };

  await unlink(source);
}

await writeFile(
  path.join(IMG_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
const saved = ((1 - bytesAfter / bytesBefore) * 100).toFixed(1);

console.log(
  `${sources.length} images: ${mb(bytesBefore)} MB -> ${mb(bytesAfter)} MB (${saved}% smaller)`
);
