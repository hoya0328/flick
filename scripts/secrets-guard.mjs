import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const publicNames = new Set([
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
]);

function jwtRole(value) {
  try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role; }
  catch { return undefined; }
}

export function isPublicSupabaseKey(value) {
  return /^sb_publishable_[A-Za-z0-9_-]+$/.test(value) ||
    (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) && jwtRole(value) === 'anon');
}

export function secretRules(text) {
  const rules = new Set();
  const patterns = [
    ['google-api-key', /AIza[0-9A-Za-z_-]{35}/],
    ['supabase-secret-key', /sb_secret_[A-Za-z0-9_-]{12,}/],
    ['supabase-access-token', /sbp_[A-Za-z0-9]{30,}/],
    ['github-token', /(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
    ['openai-secret-key', /sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}/],
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
    ['aws-access-key', /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ];
  for (const [rule, pattern] of patterns) if (pattern.test(text)) rules.add(rule);
  for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    if (jwtRole(token) !== 'anon') rules.add('non-public-jwt');
  }
  // Also catch opaque provider keys assigned as literals, not env.get references.
  const assignment = /["']?((?:EXPO_PUBLIC_)?(?:GEMINI_API_KEY|TMDB_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_ACCESS_TOKEN|OPENAI_API_KEY|EXPO_TOKEN|AWS_SECRET_ACCESS_KEY))["']?\s*[:=]\s*["']?([A-Za-z0-9_./+=-]{20,})/g;
  for (const match of text.matchAll(assignment)) {
    if (!/^(?:your[_-]|example[_-]|placeholder|replace[_-]|process\.|Deno\.)/i.test(match[2])) rules.add('secret-literal-assignment');
  }
  return [...rules];
}

export function forbiddenPath(file) {
  const parts = file.replaceAll('\\', '/').split('/');
  const name = parts.at(-1);
  if (name === '.env.example') return parts.includes('secrets');
  return parts.includes('secrets') ||
    (name !== '.env.example' && /^(?:\.env(?:$|[._-])|\.dev\.vars(?:$|\.)|\.envrc$)/.test(name)) ||
    /\.(?:env(?:\..*)?|pem|key|p12|pfx|keystore)$/i.test(name) ||
    /^(?:service-account.*|.*-service-account)\.json$/i.test(name);
}

export function publicEnvRules(text) {
  const rules = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || !match[1].startsWith('EXPO_PUBLIC_')) continue;
    const name = match[1];
    const value = match[2].replace(/\s+#.*$/, '').replace(/^(['"])(.*)\1$/, '$2');
    if (!publicNames.has(name)) rules.push('unapproved-public-env');
    else if (value && name !== 'EXPO_PUBLIC_SUPABASE_URL' && !isPublicSupabaseKey(value)) rules.push('private-or-invalid-public-key');
  }
  return [...new Set(rules)];
}

function git(args, options = {}) {
  return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024, ...options });
}

function localEnvFiles(root) {
  // Expo reads these root env files. Do not read or print CLI credential stores.
  return readdirSync(root).filter(name => /^\.env(?:$|\.)/.test(name) && name !== '.env.example');
}

function walk(root, relative = '') {
  return readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const file = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symlinks are not supported in deployment output.');
    return entry.isDirectory() ? walk(root, file) : [file];
  });
}

export function runGuard({ root = process.cwd(), staged = false, history = false, build = false } = {}) {
  const findings = [];
  const add = (file, rules) => { for (const rule of rules) findings.push({ file, rule }); };
  let scanned = 0;
  const inspect = (file, data, client = false) => {
    scanned += 1;
    const text = data.toString('utf8');
    if (data.includes(0)) return; // Binary assets are not a substitute for an artifact review.
    add(file, secretRules(text));
    if (client) {
      const names = text.match(/\bEXPO_PUBLIC_[A-Z0-9_]+\b/g) ?? [];
      if (names.some(name => !publicNames.has(name))) add(file, ['unapproved-client-env']);
      if (/\b(?:GEMINI_API_KEY|TMDB_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_ACCESS_TOKEN|OPENAI_API_KEY|EXPO_TOKEN)\b/.test(text)) add(file, ['server-env-in-client']);
    }
  };

  if (history) {
    const objects = git(['rev-list', '--objects', '--all'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
    const byHash = new Map();
    for (const line of objects) {
      const space = line.indexOf(' ');
      if (space < 0) continue;
      const hash = line.slice(0, space), file = line.slice(space + 1);
      if (forbiddenPath(file)) add(file, ['sensitive-file-in-history']);
      byHash.set(hash, file);
    }
    // --batch reads blobs without showing their contents in terminal output.
    const output = git(['cat-file', '--batch'], { cwd: root, input: [...byHash.keys()].join('\n') + '\n' });
    let offset = 0;
    while (offset < output.length) {
      const end = output.indexOf(10, offset);
      if (end < 0) throw new Error('Invalid Git object response.');
      const [hash, type, rawSize] = output.subarray(offset, end).toString().split(' ');
      const size = Number(rawSize);
      if (!Number.isSafeInteger(size)) throw new Error('Invalid Git object size.');
      const start = end + 1;
      if (type === 'blob') inspect(byHash.get(hash), output.subarray(start, start + size));
      offset = start + size + 1;
    }
  } else if (build) {
    const outputRoot = path.join(root, 'dist');
    if (!existsSync(outputRoot)) throw new Error('Build output is missing. Run build:web first.');
    for (const file of walk(outputRoot)) {
      if (forbiddenPath(file)) add(`dist/${file}`, ['sensitive-file-in-build']);
      inspect(`dist/${file}`, readFileSync(path.join(outputRoot, file)));
    }
  } else {
    const files = git(staged
      ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
      : ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    for (const file of files) {
      if (forbiddenPath(file)) add(file, ['sensitive-file-tracked']);
      if (!staged && !existsSync(path.join(root, file))) continue;
      const content = staged ? git(['show', `:${file}`], { cwd: root }) : readFileSync(path.join(root, file));
      inspect(file, content, /^(?:src\/|app\.config\.|app\.json$|public\/)/.test(file));
      if (file.endsWith('.env.example')) add(file, publicEnvRules(content.toString()));
    }
    if (!staged) {
      for (const file of localEnvFiles(root)) add(file, publicEnvRules(readFileSync(path.join(root, file), 'utf8')));
      const inherited = Object.entries(process.env).filter(([name]) => name.startsWith('EXPO_PUBLIC_')).map(([name, value]) => `${name}=${value}`).join('\n');
      add('process environment', publicEnvRules(inherited));
    }
  }
  return { scanned, findings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = runGuard({ staged: process.argv.includes('--staged'), history: process.argv.includes('--history'), build: process.argv.includes('--build') });
    if (result.findings.length) {
      console.error('Secret guard blocked publication. Values are never printed.');
      for (const item of result.findings) console.error(`${item.file}: ${item.rule}`);
      process.exitCode = 1;
    } else console.log(`Secret guard passed (${result.scanned} files/objects checked; no values printed).`);
  } catch {
    console.error('Secret guard could not complete. Publication must stop; inspect configuration without printing credentials.');
    process.exitCode = 1;
  }
}
