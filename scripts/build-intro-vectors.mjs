// Mechanical, lossless manifest generation; never redraw or normalize Figma SVGs.
import { readFileSync, writeFileSync } from 'node:fs';
const files = ['brand-small', 'brand-splash', 'replace-light', 'replace-core', 'mic', 'arrow-light', 'arrow-core'];
const entries = files.map(name => {
  const xml = readFileSync(`assets/figma-intro/${name}.svg`, 'utf8');
  const root = xml.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const width = Number.parseFloat(root.match(/\bwidth="([^"]+)"/)?.[1] ?? '');
  const height = Number.parseFloat(root.match(/\bheight="([^"]+)"/)?.[1] ?? '');
  if (!(width > 0 && height > 0) || !xml.includes('</svg>')) throw new Error(`Invalid original SVG: ${name}`);
  console.log(`${name}: ${width} x ${height}`);
  return `  ${JSON.stringify(name)}: ${JSON.stringify({ width, height, xml })},`;
});
const output = '// Generated losslessly from assets/figma-intro by scripts/build-intro-vectors.mjs.\nexport const introVectors = {\n' + entries.join('\n') + '\n} as const;\n';
const destination = 'src/features/onboarding/intro-vectors.ts';
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') !== output) throw new Error('Intro vector manifest differs from original assets.');
} else writeFileSync(destination, output);
