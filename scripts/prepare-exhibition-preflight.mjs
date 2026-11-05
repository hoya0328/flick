// Produces an ignored rollback-only artifact. No credentials or DB connection.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const migration = await readFile('supabase/migrations/202611050002_exhibition.sql', 'utf8');
const test = await readFile('supabase/tests/exhibition.sql', 'utf8');
if ((migration.match(/^begin;$/gmi) ?? []).length !== 1 || (migration.match(/^commit;$/gmi) ?? []).length !== 1 || !test.includes('rollback;')) throw new Error('Review transaction boundaries');
await mkdir('tmp/exhibition-qa', { recursive: true });
await writeFile('tmp/exhibition-qa/preflight.sql', `begin;\n${migration.replace(/^begin;\r?$/mi, '').replace(/^commit;\r?$/mi, '')}\n${test.replace(/^begin;\r?$/mi, '')}`);
console.log('Prepared additive migration + rollback-only role tests (no connection).');
