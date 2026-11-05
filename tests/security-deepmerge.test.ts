import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { hardenDeepmergeSource } from '../scripts/security-deepmerge.mjs';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('@expo/config/package.json'));
const entry = expoRequire.resolve('deepmerge');
const installed = readFileSync(entry, 'utf8');
const original = installed.replace(/Object\.defineProperty\(destination, key, \{ value: (.+), enumerable: true, configurable: true, writable: true \}\); \/\/ FLICK: own data property, never invoke __proto__ setter/g, 'destination[key] = $1;');
const payload = () => JSON.parse('{"__proto__":{"flickSecurityProbe":true}}');
const ownProto = () => Object.defineProperty({}, '__proto__', { value: { preserved: 1 }, enumerable: true });
function compile(source: string) { const module = { exports: undefined as unknown }; runInNewContext(source, { module }); return module.exports as typeof import('deepmerge'); }

describe('reviewed deepmerge CJS own-data-property mitigation', () => {
  it('reproduces returned-object poisoning in the original release, without polluting Object.prototype', () => {
    const unsafe = compile(original);
    expect((unsafe(Object.create(null), payload()) as Record<string, unknown>).flickSecurityProbe).toBe(true);
    expect(({} as Record<string, unknown>).flickSecurityProbe).toBeUndefined();
  });
  it.each([
    ['null prototype target', () => Object.create(null), false],
    ['own __proto__ target', ownProto, false],
    ['null placeholder', () => ({ session: null }), true],
    ['undefined placeholder', () => ({ session: undefined }), true],
    ['primitive placeholder', () => ({ session: 0 }), true],
    ['target copy branch', () => payload(), false],
  ] as const)('blocks %s through the real Expo consumer', (_name, target, nested) => {
    const merge = expoRequire('deepmerge');
    const result = merge(target(), nested ? { session: payload() } : payload());
    const checked = nested ? result.session : result;
    expect(Object.getPrototypeOf(checked)).toBe(Object.prototype);
    expect(checked.flickSecurityProbe).toBeUndefined();
    // Preserve explicit JSON data rather than interpreting it as inheritance.
    expect(Object.hasOwn(checked, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });
  it('keeps normal nested config, arrays, symbols, cloning and custom arrayMerge behavior', () => {
    const merge = expoRequire('deepmerge'), symbol = Symbol('fixture');
    const before = { ios: { supportsTablet: true }, plugins: ['first'], [symbol]: 'value' };
    const result = merge(before, { ios: { bundleIdentifier: 'qa.example' }, plugins: ['second'] });
    expect(result.ios).toEqual({ supportsTablet: true, bundleIdentifier: 'qa.example' });
    expect(result.plugins).toEqual(['first', 'second']);
    expect(result[symbol]).toBe('value');
    expect(result.ios).not.toBe(before.ios);
    expect(merge({ a: [1] }, { a: [2] }, { arrayMerge: (_a: unknown[], b: unknown[]) => b }).a).toEqual([2]);
    expect(merge.all([{ a: 1 }, { b: 2 }])).toEqual({ a: 1, b: 2 });
  });
  it('is deterministic and fails closed if the reviewed source changes', () => {
    expect(hardenDeepmergeSource(original)).toBe(installed);
    expect(hardenDeepmergeSource(installed)).toBe(installed);
    expect(() => hardenDeepmergeSource(original + '\n// unexpected')).toThrow('differs from reviewed');
  });
  it('checks without modifying the actual dependency', () => {
    expect(execFileSync(process.execPath, ['scripts/security-deepmerge.mjs', '--check'], { encoding: 'utf8' })).toContain('mitigation');
    expect(readFileSync(entry, 'utf8')).toBe(installed);
  });
  it('rejects a missing patch during check and recreates it during a normal install hook', () => {
    const base = path.resolve('tmp/deepmerge-security-fixtures'); mkdirSync(base, { recursive: true });
    const fixture = mkdtempSync(path.join(base, 'case-'));
    const scriptDir = path.join(fixture, 'scripts'), configDir = path.join(fixture, 'node_modules/@expo/config'), dependency = path.join(fixture, 'node_modules/deepmerge');
    for (const directory of [scriptDir, configDir, path.join(dependency, 'dist')]) mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(fixture, 'package.json'), '{}');
    writeFileSync(path.join(configDir, 'package.json'), '{"name":"@expo/config"}');
    writeFileSync(path.join(dependency, 'package.json'), '{"name":"deepmerge","version":"4.3.1","main":"dist/cjs.js"}');
    const target = path.join(dependency, 'dist/cjs.js'), script = path.join(scriptDir, 'security-deepmerge.mjs');
    writeFileSync(target, original); writeFileSync(script, readFileSync('scripts/security-deepmerge.mjs'));
    const missing = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8', timeout: 5000 });
    expect(missing.status).not.toBe(0); expect(missing.stderr).toContain('mitigation missing');
    expect(readFileSync(target, 'utf8')).toBe(original);
    execFileSync(process.execPath, [script], { timeout: 5000 });
    expect(readFileSync(target, 'utf8')).toBe(installed);
    writeFileSync(target, original + '\n// changed');
    expect(spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 5000 }).status).not.toBe(0);
    expect(readFileSync(target, 'utf8')).toBe(original + '\n// changed');
  });
  it('keeps all local and CI build entry points fail-closed without suppressing audit', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    for (const name of ['prestart', 'preweb', 'check', 'build:web']) expect(pkg.scripts[name]).toContain('security-deepmerge.mjs --check');
    expect(pkg.scripts.postinstall).toContain('node scripts/security-deepmerge.mjs');
    expect(pkg.scripts['security:audit']).toBe('npm audit --audit-level=moderate');
  });
});
