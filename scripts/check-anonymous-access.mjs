// Bounded anonymous HTTP probes; save RPCs use invalid payloads and must reject anon.
// Never print keys, JWTs, record IDs, response bodies, or user content.
import { readFileSync } from 'node:fs';
import { isPublicSupabaseKey } from './secrets-guard.mjs';

try {
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
  const url = new URL(env.EXPO_PUBLIC_SUPABASE_URL);
  if (url.protocol !== 'https:' || url.hostname !== 'vthswebqroygpbmxpqaj.supabase.co' || url.username || url.password) throw new Error();
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!isPublicSupabaseKey(key ?? '')) throw new Error();
  const cases = [
    ...['profiles', 'reviews'].map(name => [name, `/rest/v1/${name}?select=id&limit=1`]),
    ...['review_answers', 'review_questions', 'review_keywords', 'review_answer_tags'].map(name => [name, `/rest/v1/${name}?select=review_id&limit=1`]),
    ['admin_access', '/rest/v1/admin_access?select=user_id&limit=1'],
    ['social_posts', '/rest/v1/social_posts?select=id&limit=1'],
    ['save_light_review', '/rest/v1/rpc/save_light_review', { p_form: {}, p_review_id: null, p_complete: false }],
    ['save_core_review', '/rest/v1/rpc/save_core_review', { p_form: {}, p_review_id: null, p_complete: false }],
    ['admin_list_reviews', '/rest/v1/rpc/admin_list_reviews', { p_limit: 1 }],
    ['get_my_taste_source', '/rest/v1/rpc/get_my_taste_source', { p_review_id: '00000000-0000-4000-8000-000000000000' }],
  ];
  let failed = false;
  for (const [name, route, body] of cases) {
    const response = await fetch(new URL(route, url), {
      method: body ? 'POST' : 'GET',
      headers: { apikey: key, 'Content-Type': 'application/json', ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json();
    const adminGuardDenied = name === 'admin_list_reviews' && response.status === 400 &&
      payload?.code === 'P0001' && payload?.message === 'admin_view_reviews_required';
    const denied = response.status === 401 || response.status === 403 || adminGuardDenied;
    const empty = !body && response.ok && Array.isArray(payload) && payload.length === 0;
    const passed = denied || empty;
    console.log(JSON.stringify({ check: name, status: response.status, result: adminGuardDenied ? 'admin-guard-denied' : denied ? 'denied' : empty ? 'RLS-empty' : 'FAIL' }));
    failed ||= !passed;
  }
  if (failed) process.exitCode = 1;
} catch {
  console.error('Anonymous access probe incomplete. Stop and investigate without printing credentials or response data.');
  process.exitCode = 1;
}
