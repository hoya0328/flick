// Read-only smoke test. No login, AI requests, production writes or secret output.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

const base = process.argv[2] ?? 'https://flick-film-journal--beta.expo.app';
const url = new URL(base);
assert.ok((url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) ||
  (url.protocol === 'https:' && /^flick-film-journal--[a-z0-9-]+\.expo\.app$/.test(url.hostname)));
const routes = ['/', '/welcome', '/intro', '/search', '/explore-list', '/profile', '/profile-edit',
  '/archive', '/record', '/light-record', '/core-record', '/taste-insights', '/taste-details',
  '/feed', '/post-edit', '/people', '/connections', '/notifications', '/collections',
  '/collection-picker', '/community-settings', '/account-settings', '/install', '/emoji-quiz',
  '/post-trash', '/exhibition', '/credits', '/manifest.webmanifest', '/sw.js', '/review?id=00000000-0000-4000-8000-000000000001'];
for (let start = 0; start < routes.length; start += 4) {
  await Promise.all(routes.slice(start, start + 4).map(async route => {
    const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, `${route}: expected HTTP200`);
  }));
}
console.log(`PASS ${routes.length} routes HTTP200`);
const entry = (await readdir('dist/_expo/static/js/web')).find(name => /^entry-.*\.js$/.test(name));
assert.ok(entry);
const root = await fetch(new URL('/', base), { signal: AbortSignal.timeout(15000) });
assert.ok((await root.text()).includes(entry), 'Root document must reference the checked bundle');
const response = await fetch(new URL(`/_expo/static/js/web/${entry}`, base), { signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200);
const hash = data => createHash('sha256').update(data).digest('hex');
assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(await readFile(`dist/_expo/static/js/web/${entry}`)));
console.log(`PASS root entry and bundle bytes match: ${entry}`);
