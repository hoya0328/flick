// Narrow fail-closed mitigation, not an upstream fixed release or audit suppression.
// Repeated extglobs may only contain prefix-free literal alternatives.
import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const expected = {
  '2.3.2': '3a91656f440069aa8f8e15c9d695b9f6b2209df1eab2be8127c72cbcca45ff5f',
  '4.0.7': '4e1e05447668aa1e94366c5516a2bcd8f5fff800cc92b1d0cd7d77703b8618c4',
};
export const repeatedExtglobGuard = `
    // FLICK: reject unbounded wildcard/nested/ambiguous repeated extglobs.
    if (token.type === 'plus' || token.type === 'star') {
      const flickBody = input.slice(token.startIndex + 2, state.index);
      const flickBranches = flickBody.split('|');
      const flickInsensitive = Boolean(opts.nocase) || String(opts.flags || '').includes('i');
      const flickCompared = flickInsensitive ? flickBranches.map(branch => branch.toLowerCase()) : flickBranches;
      if (flickBody.length > 4096 || flickBranches.length > 32 ||
          /[^\\p{L}\\p{N}_./ |\\-]/u.test(flickBody) ||
          flickBranches.some(branch => branch.length === 0) ||
          (flickInsensitive && flickBranches.length > 1 && /[^\\x00-\\x7f]/.test(flickBody)) ||
          flickCompared.some((branch, index) => flickCompared.some((other, otherIndex) => index !== otherIndex && other.startsWith(branch)))) {
        const flickError = new SyntaxError('Unsupported repeated extglob. Use literal alternatives without overlapping prefixes.');
        flickError.code = 'FLICK_UNSAFE_REPEATED_EXTGLOB';
        throw flickError;
      }
    }
`;

export function hardenPicomatchSource(source, version) {
  if (!Object.hasOwn(expected, version)) throw new Error('Review this picomatch release before installation.');
  const original = source.includes(repeatedExtglobGuard) ? source.replace(repeatedExtglobGuard, '') : source;
  if (createHash('sha256').update(original).digest('hex') !== expected[version]) throw new Error('Picomatch source differs from the reviewed registry release.');
  const anchor = '  const extglobClose = token => {\n';
  // Releases use two-space function indentation in both supported versions.
  if (!original.includes(anchor) || original.split(anchor).length !== 2) throw new Error('Repeated-extglob boundary changed.');
  return original.replace(anchor, anchor + repeatedExtglobGuard);
}

export async function verifyOrApplyPicomatch({ check = false } = {}) {
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  const modules = await realpath(path.join(root, 'node_modules'));
  const packages = Object.entries(lock.packages).filter(([name]) => name.endsWith('/picomatch'));
  if (!packages.length) throw new Error('No reviewed picomatch installation found.');
  for (const [relative, metadata] of packages) {
    const file = await realpath(path.join(root, relative, 'lib/parse.js'));
    const within = path.relative(modules, file);
    if (within.startsWith('..') || path.isAbsolute(within)) throw new Error('Dependency path escapes this workspace.');
    const actual = JSON.parse(await readFile(path.join(path.dirname(file), '../package.json'), 'utf8'));
    if (actual.version !== metadata.version) throw new Error('Installed dependency and lockfile disagree.');
    const source = await readFile(file, 'utf8');
    const hardened = hardenPicomatchSource(source, actual.version);
    if (source !== hardened) {
      if (check) throw new Error('Picomatch mitigation missing. Install dependencies with postinstall enabled.');
      await writeFile(file, hardened);
    }
  }
  console.log(`Verified repeated-extglob fail-closed mitigation in ${packages.length} picomatch installations. Registry HIGH advisory remains visible.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifyOrApplyPicomatch({check:process.argv.includes('--check')});
