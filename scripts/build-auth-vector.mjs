// Lossless transport of the original Figma 51:464 SVG into React Native.
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync('assets/figma-auth/login-brand.svg', 'utf8').trim();
const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
const width = Number(root.match(/\bwidth="([\d.]+)"/)?.[1]), height = Number(root.match(/\bheight="([\d.]+)"/)?.[1]);
if (!(width > 0 && height > 0) || !svg.endsWith('</svg>')) throw new Error('Invalid original Figma auth SVG.');
const output = '// Figma 51:464. Original SVG canvas and path geometry are preserved.\n' +
  `export const authBrandAsset = { width: ${width}, height: ${height}, xml: ${JSON.stringify(svg)} } as const;\n`;
const target = 'src/features/session/auth-brand-asset.ts';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== output) throw new Error('Auth logo differs from the original Figma SVG.');
} else writeFileSync(target, output);
console.log(`auth-brand: ${width} x ${height} (Figma 51:464)`);
