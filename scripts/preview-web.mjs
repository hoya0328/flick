// Local-only, no-cache preview of the checked static export. Never serves source/env.
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
const root = await realpath('dist');
const port = Number(process.argv[2] ?? 8083);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
createServer(async (request, response) => {
  const reply = (status, body = '') => { response.writeHead(status, { 'Cache-Control': 'no-store' }); response.end(body); };
  if (request.method !== 'GET' && request.method !== 'HEAD') return reply(405);
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) return reply(403);
    let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!path.extname(relative)) {
      const dynamic = relative.match(/^(movie|review|post|people|collection|curation)\/[^/]+$/);
      relative = dynamic ? `${dynamic[1]}/[id].html` : `${relative}.html`;
    }
    const file = await realpath(path.resolve(root, relative));
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) return reply(403);
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { reply(404, 'Not found'); }
}).listen(port, 'localhost', () => console.log(`Checked static preview: http://localhost:${port} (loopback only)`));
