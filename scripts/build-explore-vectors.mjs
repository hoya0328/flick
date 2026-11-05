// Lossless local Figma SVG manifest; do not normalize paths or intrinsic canvases.
import { readFileSync, writeFileSync } from 'node:fs';
const names = ['more', 'star', 'discovery-plus', 'search', 'send', 'filter', 'back', 'heart', 'comment', 'point', 'add', 'star-white', 'detail-toolbar', 'eye', 'nav-home', 'nav-search', 'nav-feed', 'nav-profile'];
const entries = names.map(name => {
  const xml = readFileSync(`assets/figma-explore/${name}.svg`, 'utf8');
  const root = xml.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const width = Number.parseFloat(root.match(/\bwidth="([^"]+)"/)?.[1] ?? '');
  const height = Number.parseFloat(root.match(/\bheight="([^"]+)"/)?.[1] ?? '');
  if (!(width > 0 && height > 0) || !xml.includes('</svg>')) throw new Error(`Invalid SVG: ${name}`);
  const key = 'explore' + name.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
  console.log(`${key}: ${width} x ${height}`);
  return `  ${JSON.stringify(key)}: ${JSON.stringify({ width, height, xml })},`;
});
const output = '// Generated losslessly by scripts/build-explore-vectors.mjs.\nexport const exploreVectorAssets = {\n' + entries.join('\n') + '\n} as const;\n';
const destination = 'src/features/design/explore-vector-assets.ts';
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') !== output) throw new Error('Explore SVG manifest mismatch');
} else writeFileSync(destination, output);
