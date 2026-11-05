// Reviewed mitigation for GHSA-gcqx-w48m-w2h4 in Expo's CJS build dependency.
// Keep the original version/audit warning visible; never spoof a patched release.
import { createHash } from 'node:crypto';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const originalHash = '2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d';
const expressions = [
  'cloneUnlessOtherwiseSpecified(target[key], options)',
  'getMergeFunction(key, options)(target[key], source[key], options)',
  'cloneUnlessOtherwiseSpecified(source[key], options)',
];
const replacements = expressions.map(value => [
  `destination[key] = ${value};`,
  `Object.defineProperty(destination, key, { value: ${value}, enumerable: true, configurable: true, writable: true }); // FLICK: own data property, never invoke __proto__ setter`,
]);
export function hardenDeepmergeSource(source) {
  let original = source;
  for (const [before, after] of replacements) original = original.replace(after, before);
  if (createHash('sha256').update(original).digest('hex') !== originalHash) throw new Error('Deepmerge source differs from reviewed 4.3.1 CJS. Refusing to modify it.');
  let hardened = original;
  for (const [before, after] of replacements) {
    if (hardened.split(before).length !== 2) throw new Error('Unexpected deepmerge assignment count.');
    hardened = hardened.replace(before, after);
  }
  return hardened;
}
export async function verifyDeepmerge({ check = false } = {}) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const localRequire = createRequire(path.join(root, 'package.json'));
  const expoRequire = createRequire(localRequire.resolve('@expo/config/package.json'));
  const index = await realpath(expoRequire.resolve('deepmerge'));
  const modules = await realpath(path.join(root, 'node_modules'));
  const relative = path.relative(modules, index);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Refusing to patch outside workspace dependencies.');
  const metadata = JSON.parse(await readFile(expoRequire.resolve('deepmerge/package.json'), 'utf8'));
  if (metadata.name !== 'deepmerge' || metadata.version !== '4.3.1' || path.basename(index) !== 'cjs.js') throw new Error('Review deepmerge mitigation before changing its version or entry.');
  const source = await readFile(index, 'utf8'), hardened = hardenDeepmergeSource(source);
  if (source !== hardened) {
    if (check) throw new Error('Deepmerge mitigation missing. Run npm ci with install scripts enabled.');
    await writeFile(index, hardened);
  }
  const merge = expoRequire('deepmerge');
  const payload = Object.defineProperty({}, '__proto__', { value: { flickSecurityProbe: true }, enumerable: true });
  for (const target of [Object.create(null), Object.defineProperty({}, '__proto__', { value: {}, enumerable: true }), null]) {
    const result = merge(target, payload);
    if (Object.getPrototypeOf(result) !== Object.prototype || result.flickSecurityProbe !== undefined) throw new Error('Deepmerge own-property mitigation failed.');
  }
  if (merge({ values: [1], nested: { a: 1 } }, { values: [2], nested: { b: 2 } }).values.join(',') !== '1,2') throw new Error('Deepmerge compatibility failed.');
  console.log('Verified Expo deepmerge 4.3.1 CJS own-property mitigation. Registry advisory remains visible.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await verifyDeepmerge({ check: process.argv.includes('--check') });
