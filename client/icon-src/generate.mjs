import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(dir, "egg-icon.svg");
const outDir = path.join(dir, "..", "public");

const targets = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "favicon-32.png", size: 32 },
];

for (const t of targets) {
  await sharp(src, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(outDir, t.name));
  console.log("wrote", t.name);
}
