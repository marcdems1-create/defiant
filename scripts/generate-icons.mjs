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
    // Fallback: copy SVG as placeholder if sharp isn't installed
    const svg = readFileSync(svgPath);
    writeFileSync(join(outDir, 'icon-192.png'), svg);
    writeFileSync(join(outDir, 'icon-512.png'), svg);
    console.warn('sharp not installed — wrote SVG placeholders. Run: npm i -D sharp && node scripts/generate-icons.mjs');
    return;
  }

  const svg = readFileSync(svgPath);
  await sharp(svg).resize(192, 192).png().toFile(join(outDir, 'icon-192.png'));
  await sharp(svg).resize(512, 512).png().toFile(join(outDir, 'icon-512.png'));
  console.log('Generated public/icons/icon-192.png and icon-512.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
