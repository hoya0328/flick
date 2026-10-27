// Generates an ignored transaction-only QA artifact; never edits application source.
import { mkdir,readFile,writeFile } from 'node:fs/promises';
const test=await readFile('supabase/tests/free_community.sql','utf8');
let sql=test;
if(process.argv.includes('--with-migration')){
  const migration=await readFile('supabase/migrations/202610270003_free_community.sql','utf8');
  sql=migration.replace(/commit;\s*$/,'')+test.replace(/^begin;\s*/,'');
}
await mkdir('tmp',{recursive:true});
await writeFile('tmp/free-community-qa.sql',sql);
console.log('Prepared transaction-only tmp/free-community-qa.sql');
