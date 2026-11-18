/// <reference types="node" />
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('clean hosting index route', () => {
  it('publishes concrete people and review documents without changing protected contents', () => {
    const taskRoot = mkdtempSync(path.join(tmpdir(), 'flick-hosting-index-'));
    try {
      const dist = path.join(taskRoot, 'dist');
      mkdirSync(path.join(dist, '_expo/static/js/web'), { recursive: true });
      mkdirSync(path.join(dist, 'people'), { recursive: true });
      mkdirSync(path.join(dist, 'review'), { recursive: true });
      mkdirSync(path.join(dist, 'icons'), { recursive: true });
      writeFileSync(path.join(dist, 'people/index.html'), '<html>protected people entry</html>');
      writeFileSync(path.join(dist, 'review/index.html'), '<html>session-gated review reader</html>');
      writeFileSync(path.join(dist, '_expo/static/js/web/entry-test.js'), '');
      writeFileSync(path.join(dist, 'sw.js'), 'cache-__BUILD_ID__');
      for (const file of ['icons/flick-192.png', 'icons/flick-512.png', 'icons/apple-touch-icon.png', 'manifest.webmanifest', 'offline.html']) writeFileSync(path.join(dist, file), 'fixture');
      execFileSync(process.execPath, [path.resolve('scripts/build-pwa.mjs')], { cwd: taskRoot });
      expect(readFileSync(path.join(dist, 'people.html'), 'utf8')).toBe(readFileSync(path.join(dist, 'people/index.html'), 'utf8'));
      expect(readFileSync(path.join(dist, 'review.html'), 'utf8')).toBe(readFileSync(path.join(dist, 'review/index.html'), 'utf8'));
      expect(readFileSync(path.join(dist, 'sw.js'), 'utf8')).not.toContain('__BUILD_ID__');
    } finally {
      // Only this validated mkdtemp fixture is removed, never the real dist.
      expect(path.resolve(taskRoot).startsWith(path.resolve(tmpdir()) + path.sep + 'flick-hosting-index-')).toBe(true);
      rmSync(taskRoot, { recursive: true, force: true });
    }
  });
});
