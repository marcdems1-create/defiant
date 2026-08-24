/**
 * Generates PNG icons from public/icons/icon.svg for the PWA manifest.
 * Run: node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = join(root, 'public/icons/icon.svg');
const outDir = join(root, 'public/icons');

mkdirSync(outDir, { recursive: true });

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    const svg = readFileSync(svgPath);
    writeFileSync(join(outDir, 'icon-192.png'), svg);
    writeFileSync(join(outDir, 'icon-512.png'), svg);
    writeFileSync(join(outDir, 'icon-maskable-512.png'), svg);
    writeFileSync(join(outDir, 'apple-touch-icon.png'), svg);
    console.warn(
      'sharp not installed — wrote SVG placeholders. Run: npm i -D sharp && node scripts/generate-icons.mjs',
    );
    return;
  }

  const svg = readFileSync(svgPath);
  await sharp(svg).resize(192, 192).png().toFile(join(outDir, 'icon-192.png'));
  await sharp(svg).resize(512, 512).png().toFile(join(outDir, 'icon-512.png'));
  await sharp(svg).resize(180, 180).png().toFile(join(outDir, 'apple-touch-icon.png'));

  // Real ICO (PNG payloads). Diligence crawlers GET /favicon.ico and treat
  // an SVG rewrite as a broken site. 16 + 32 cover tab + shortcut probes.
  const icoImages = [];
  for (const size of [16, 32]) {
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    icoImages.push({ png, width: size, height: size });
  }
  const icoPath = join(root, 'public/favicon.ico');
  const ico = pngsIntoIco(icoImages);
  if (ico[0] !== 0 || ico[1] !== 0 || ico[2] !== 1 || ico[3] !== 0) {
    throw new Error('generated favicon.ico is missing the ICO magic header');
  }
  writeFileSync(icoPath, ico);

  // Adaptive-icon safe zone is the center ~80%. Full-bleed dark canvas so Android
  // masks (circle / squircle) don't clip the mark.
  const inner = await sharp(svg).resize(410, 410).png().toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 14, b: 17, alpha: 1 },
    },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(join(outDir, 'icon-maskable-512.png'));

  console.log(
    'Generated icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png, favicon.ico',
  );
}

/** Minimal ICO container with PNG images (Vista+ / Chromium / Safari / Edge). */
function pngsIntoIco(images) {
  const count = images.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);
  const parts = [header];
  images.forEach((image, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(image.width === 256 ? 0 : image.width, entry);
    header.writeUInt8(image.height === 256 ? 0 : image.height, entry + 1);
    header.writeUInt8(0, entry + 2); // palette
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4); // planes
    header.writeUInt16LE(32, entry + 6); // bit count
    header.writeUInt32LE(image.png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    parts.push(image.png);
    offset += image.png.length;
  });
  return Buffer.concat(parts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
