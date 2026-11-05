// Read-only public endpoints and byte comparison. Never prints credentials or user content.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = 'https://flick-film-journal--beta.expo.app';
for (const path of ['/exhibition','/welcome','/manifest.webmanifest','/sw.js']) {
 const response = await fetch(`${base}${path}`,{signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200,path); console.log(`PASS beta ${path} HTTP200`);
}
const bundle = (await readdir('dist/_expo/static/js/web')).find(x=>/^entry-.*\.js$/.test(x));
assert.ok(bundle);
const remote=await fetch(`${base}/_expo/static/js/web/${bundle}`,{signal:AbortSignal.timeout(20000)});
assert.equal(remote.status,200);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(Buffer.from(await remote.arrayBuffer())),hash(await readFile(`dist/_expo/static/js/web/${bundle}`)));
console.log(`PASS deployed bundle matches checked export: ${bundle}`);
const env = await readFile('.env.local','utf8');
const values = Object.fromEntries(env.split(/\r?\n/).flatMap(line=>{const m=line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY))=(.*)$/);return m?[[m[1],m[2].trim().replace(/^['"]|['"]$/g,'')]]:[];}));
const key=values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||values.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(key); const headers={apikey:key,'Content-Type':'application/json'};
const url=values.EXPO_PUBLIC_SUPABASE_URL;
const settings=await fetch(`${url}/auth/v1/settings`,{headers,signal:AbortSignal.timeout(10000)});
assert.equal(settings.status,200); const auth=await settings.json();
assert.equal(auth.external?.anonymous_users,true); assert.equal(auth.mailer_autoconfirm,false);
console.log('PASS anonymous Auth enabled; email confirmation remains required');
const status = await fetch(`${url}/rest/v1/rpc/exhibition_status`,{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(10000)});
assert.equal(status.status,200); assert.equal((await status.json()).open,true); console.log('PASS public coarse exhibition status');
for (const table of ['exhibition_records','exhibition_guests','exhibition_signup_slots','ai_project_reservations','exhibition_movie_choices']) {
 const r=await fetch(`${url}/rest/v1/${table}?select=*&limit=1`,{headers,signal:AbortSignal.timeout(10000)});
 const data=await r.json(); assert.ok((r.status===401||r.status===403)&&data.code==='42501',`${table}: expected permission denial`);
 console.log(`PASS public-key-only ${table} read denied`);
}
