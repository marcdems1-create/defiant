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
    'Generated icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
