import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const source = readFileSync('public/logo.svg');

const sizes = [
  { size: 192, out: 'public/icon-192.png' },
  { size: 512, out: 'public/icon-512.png' },
  { size: 180, out: 'public/apple-touch-icon.png' },
];

for (const { size, out } of sizes) {
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(out);
  console.log(`generated ${out} (${size}x${size})`);
}