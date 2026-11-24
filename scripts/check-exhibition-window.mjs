// Read-only operator smoke check for the user-approved window through Nov 26.
// Not an uptime guarantee, provider-billing attestation, or load test.
// Never prints API keys, sessions, IDs, answers, or review content.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const inspect = process.argv.includes('--inspect');
const expectedEnd = Date.parse('2026-11-27T00:00:00+09:00');
if (!inspect) assert.ok(Date.now() < expectedEnd, 'The approved operating window has ended; do not extend automatically.');
const env = await readFile('.env.local', 'utf8');
const values = Object.fromEntries(env.split(/\r?\n/).flatMap(line => {
  const m = line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY))=(.*)$/);
  return m ? [[m[1], m[2].trim().replace(/^['"]|['"]$/g, '')]] : [];
}));
const base = values.EXPO_PUBLIC_SUPABASE_URL;
const key = values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || values.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert.equal(new URL(base).hostname, 'vthswebqroygpbmxpqaj.supabase.co');
assert.ok(key, 'Public Supabase client configuration required.');
const response = await fetch(`${base}/rest/v1/rpc/exhibition_status`, {
  method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
  body: '{}', signal: AbortSignal.timeout(15000),
});
assert.equal(response.status, 200);
const status = await response.json();
if (inspect) {
  console.log(JSON.stringify({ result: 'Read-only observed status (not an approval or extension)', ...status }));
} else {
assert.equal(status.open, true, 'Guest admission closed.');
assert.equal(status.aiAvailable, true, 'Free AI verification gate closed.');
assert.equal(Date.parse(status.closesAt), expectedEnd, 'Unexpected exhibition end.');
assert.equal(Date.parse(status.verifiedUntil), expectedEnd, 'Unexpected free-verification end.');
assert.ok(Number.isInteger(status.dailyRemaining) && status.dailyRemaining >= 0 && status.dailyRemaining <= 400);
assert.ok(Number.isInteger(status.minuteRemaining) && status.minuteRemaining >= 0 && status.minuteRemaining <= 12);
console.log(JSON.stringify({
  result: 'PASS approved exhibition window (public status only; no AI/Auth signup or writes)',
  endKst: '2026-11-27 00:00:00+09:00',
  guestAdmissionOpen: status.open, freeAiVerified: status.aiAvailable,
  dailyRemaining: status.dailyRemaining, minuteRemaining: status.minuteRemaining,
}));
}
