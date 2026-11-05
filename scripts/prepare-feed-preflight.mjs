// Deterministic temporary SQL artifact; never executes SQL or reads credentials.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const migration = await readFile('supabase/migrations/202611050001_feed_blocks.sql', 'utf8');
const tests = await readFile('supabase/tests/feed_blocks.sql', 'utf8');
if ((migration.match(/^begin;$/gmi) ?? []).length !== 1 || (migration.match(/^commit;$/gmi) ?? []).length !== 1 || !tests.includes('rollback;')) throw new Error('Transaction boundary changed; review before composing.');
const ddl = migration.replace(/^begin;\r?$/mi, '').replace(/^commit;\r?$/mi, '');
const fixture = tests.replace(/^begin;\r?$/mi, '');
await mkdir('tmp/figma-stage45-20261105', { recursive: true });
await writeFile('tmp/figma-stage45-20261105/feed-preflight.sql', `begin;\nset local statement_timeout='30s';\nset local lock_timeout='3s';\n${ddl}\n${fixture}`);
console.log('Prepared rollback-only migration + restricted-role fixture artifact. No DB connection.');
