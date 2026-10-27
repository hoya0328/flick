import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertPublicSupabaseKey, isPublicSupabaseKey } from '../src/lib/public-config';

// Import the real CLI implementation, rather than a test-only regex copy.
import { forbiddenPath, publicEnvRules, secretRules, runGuard, isPublicSupabaseKey as guardPublicKey } from '../scripts/secrets-guard.mjs';

const fakeJwt = (role: string) => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'synthetic_signature'].join('.');
const fakeGoogleKey = () => 'AI' + 'za' + 'X'.repeat(35);

describe('credential publication boundary', () => {
  it.each(['.env', '.env.local', '.env.production', '.env.backup', '.env-old', '.env_copy', 'local.env', 'local.env.bak', 'supabase/functions/.env', '.envrc', '.dev.vars.preview', 'secrets/server.json', 'service-account-test.json', 'test.p12', 'id.key'])('blocks sensitive path %s', file => {
    expect(forbiddenPath(file)).toBe(true);
    expect(execFileSync('git', ['check-ignore', file], { encoding: 'utf8' }).trim()).toBe(file);
  });
  it('keeps a blank public template trackable', () => {
    expect(forbiddenPath('.env.example')).toBe(false);
    expect(forbiddenPath('supabase/.env.example')).toBe(false);
    expect(publicEnvRules(readFileSync('.env.example', 'utf8'))).toEqual([]);
  });
  it('detects synthetic provider secrets without returning values', () => {
    const cases = [
      fakeGoogleKey(),
      'sb_' + 'secret_' + 'x'.repeat(24),
      'sb' + 'p_' + 'x'.repeat(40),
      'gh' + 'p_' + 'x'.repeat(40),
      'sk-' + 'proj-' + 'x'.repeat(30),
      '-----BEGIN ' + 'PRIVATE KEY-----',
      fakeJwt('service_role'),
      fakeJwt('authenticated'),
    ];
    for (const value of cases) {
      const rules = secretRules(value);
      expect(rules.length).toBeGreaterThan(0);
      expect(JSON.stringify(rules)).not.toContain(value);
    }
  });
  it('blocks opaque secrets assigned to known server variable names', () => {
    expect(secretRules('TMDB_API_TOKEN=' + 'x'.repeat(40))).toContain('secret-literal-assignment');
    expect(secretRules("const key = Deno.env.get('GEMINI_API_KEY');")).toEqual([]);
  });
  it('rejects unknown public env names and private keys in public names', () => {
    expect(publicEnvRules('EXPO_PUBLIC_GEMINI_API_KEY=' + fakeGoogleKey())).toContain('unapproved-public-env');
    expect(publicEnvRules('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' + fakeJwt('service_role'))).toContain('private-or-invalid-public-key');
    expect(publicEnvRules('EXPO_PUBLIC_SUPABASE_ANON_KEY=' + fakeJwt('authenticated'))).toContain('private-or-invalid-public-key');
  });
  it('allows only the intended public key types in both guard and runtime', () => {
    for (const key of ['sb_publishable_' + 'example', fakeJwt('anon')]) {
      expect(isPublicSupabaseKey(key)).toBe(true);
      expect(guardPublicKey(key)).toBe(true);
      expect(secretRules(key)).toEqual([]);
      expect(() => assertPublicSupabaseKey(key)).not.toThrow();
    }
    for (const key of [fakeJwt('service_role'), fakeGoogleKey(), 'sb_' + 'secret_' + 'x'.repeat(24), 'invalid']) {
      expect(isPublicSupabaseKey(key)).toBe(false);
      expect(guardPublicKey(key)).toBe(false);
      expect(() => assertPublicSupabaseKey(key)).toThrow(/공개용/);
      try { assertPublicSupabaseKey(key); } catch (error) { expect(String(error)).not.toContain(key); }
    }
    expect(() => assertPublicSupabaseKey(undefined)).not.toThrow();
  });
  it('keeps server credential access outside client code', () => {
    const client = readFileSync('src/lib/supabase.ts', 'utf8');
    expect(client).not.toContain('SERVICE_ROLE');
    expect(client).toContain('assertPublicSupabaseKey(supabasePublishableKey)');
    for (const name of ['movies-discovery', 'generate-core-question', 'generate-core-review-draft', 'analyze-taste-review']) {
      const server = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
      expect(server).toMatch(/Deno\.env\.get\('(TMDB_API_TOKEN|GEMINI_API_KEY)'\)/);
    }
  });
  it('checks staged contents, untracked sources, local env policy, and actual build output', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'flick-secrets-test-'));
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
    try {
      git('init', '--quiet');
      writeFileSync(path.join(root, 'test.ts'), `export const key = '${fakeGoogleKey()}';`);
      expect(runGuard({ root }).findings).toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'google-api-key' })]));
      git('add', 'test.ts');
      writeFileSync(path.join(root, 'test.ts'), 'export const safe = true;');
      expect(runGuard({ root, staged: true }).findings.length).toBeGreaterThan(0);
      const blocked = spawnSync(process.execPath, [path.resolve('scripts/secrets-guard.mjs'), '--staged'], { cwd: root, encoding: 'utf8' });
      expect(blocked.status).toBe(1);
      expect(blocked.stderr).toContain('google-api-key');
      expect(blocked.stdout + blocked.stderr).not.toContain(fakeGoogleKey());
      git('add', 'test.ts');
      expect(runGuard({ root, staged: true }).findings).toEqual([]);
      writeFileSync(path.join(root, '.env.local'), 'EXPO_PUBLIC_GEMINI_API_KEY=' + fakeGoogleKey());
      expect(runGuard({ root }).findings).toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'unapproved-public-env' })]));
      git('add', '-f', '.env.local');
      expect(runGuard({ root, staged: true }).findings).toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'sensitive-file-tracked' })]));
      mkdirSync(path.join(root, 'dist'));
      writeFileSync(path.join(root, 'dist', 'entry.js'), `const key='${fakeGoogleKey()}';`);
      expect(runGuard({ root, build: true }).findings).toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'google-api-key' })]));
    } finally {
      // Remove only this exact synthetic fixture, never a workspace or user folder.
      if (path.dirname(root) === path.resolve(tmpdir()) && path.basename(root).startsWith('flick-secrets-test-')) rmSync(root, { recursive: true, force: true });
    }
  });
});
