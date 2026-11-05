import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const entries = readdirSync('assets/figma-feed').filter(file => file.endsWith('.svg')).sort().map(file => {
  const xml = readFileSync(`assets/figma-feed/${file}`, 'utf8'), root = xml.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const width = parseFloat(root.match(/\bwidth="([^"]+)"/)?.[1] ?? ''), height = parseFloat(root.match(/\bheight="([^"]+)"/)?.[1] ?? '');
  if (!(width > 0 && height > 0) || !xml.includes('</svg>')) throw new Error(`Invalid SVG: ${file}`);
  const name = 'feed' + file.replace('.svg', '').split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
  console.log(`${name}: ${width} x ${height}`);
  return `  ${JSON.stringify(name)}: ${JSON.stringify({ width, height, xml })},`;
});
const result = '// Generated losslessly by scripts/build-feed-vectors.mjs.\nexport const feedVectorAssets = {\n' + entries.join('\n') + '\n} as const;\n', target = 'src/features/design/feed-vector-assets.ts';
if (process.argv.includes('--check')) { if (readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== result) throw new Error('Feed vector mismatch'); } else writeFileSync(target, result);
