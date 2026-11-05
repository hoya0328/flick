# Free exhibition contract — 2026-11-05

Approved: anonymous Auth, additive private guest storage and shared AI quota; no billing changes. Existing regular accounts, records and hosting project remain unchanged.

## Boundary

- QR `/exhibition`: dedicated Auth storage/client, cached movie selection, Light tags or Core answers, optional AI, editable summary, private guest save and explicit session end. No email required. No photos, publishing, social writes or admin access.
- Guest identity is verified from `auth.users.is_anonymous` or immutable server enrollment, never editable user metadata. Ordinary table mutations are denied by triggers even through old SECURITY DEFINER RPCs; guest records live separately with owner-only RLS.
- Exhibition catalogue is an operator-selected cached subset (`exhibition_movie_choices`), not the unmoderated full TMDB cache. Direct saves of unselected movie IDs are denied too. Selection is not a guarantee of suitability for every age; staff must review the actual audience/ratings.
- One saved film per guest; two-hour write/AI session. Session loss cannot be recovered by email. No automatic deletion is promised; operators must review retention after the exhibition.
- Adult confirmation and separate AI consent; under-18/nonconsenting visitors use non-AI recording. Google free input can be reviewed/used for improvement. Do not enter personal/sensitive information. This UI does not itself establish compliance with Google's age/audience terms.

## Free-only controls

- All three Gemini paths share atomic project reservations: 400/day (Pacific midnight), 12/rolling minute, guest 8 lifetime calls; existing per-user feature caps remain. Failed provider calls count; no automatic retry or paid fallback.
- Free/model verification expires seven days after rollout. Operators must recheck Google AI Studio Free status before extending. App quotas cannot detect an out-of-band billing upgrade or calls by other clients in the Google project.
- Anonymous signup hook: 150/day, 20/minute, 1,000/event; default Supabase IP cap is preserved. No CAPTCHA vendor is added; residual automated quota exhaustion and shared-WiFi signup limits remain.
- Exhibition switch/window and AI verification TTL are server controlled. Normal non-AI recording remains available when AI is closed. No optional semantic analysis for guests.

## Acceptance / rollback

Run synthetic isolated SQL, rollback-only production role tests, normal member positive controls, guest A/B/anon isolation, storage/public-write/admin guards, quota boundaries, full app checks and web build. Apply only the reviewed new migrations002→003→004 (no historical replay). Install the hook before enabling anonymous Auth. Existing beta alias only. Revert web to prior deployment; close exhibition and AI gates for immediate rollback without deleting records.003 rejects global/guest-limit attempts without adding usage rows; personal-denied reservations are removed before any provider request. Provider failures are never refunded.

## Operator runbook

- QR target: `https://flick-film-journal--beta.expo.app/exhibition`. Encourage personal phones and, on signup throttling, mobile data instead of the venue's shared IP. Never provide an admin/shared member account to visitors.
- Initial exhibition and free-verification expiry is **2026-11-12 19:15:14 KST**. This is a seven-day rehearsal window, not a claim about the actual exhibition dates. Before opening, verify the exact Google project is still Free and reapprove a short bounded window. The application cannot independently attest Google's billing configuration.
- Staff should rehearse Light/Core on actual phones, AI limit→manual fallback, refresh/resume and end-before-handoff. No AI input from minors or personal/sensitive text. Follow Google's audience terms; age checkboxes alone do not resolve eligibility.
- Daily cap400 permits at most66 fully AI-assisted Core sessions (6calls each), before failures/retries/regular-member use. Prefer Light for a crowded stand. This is not a100visitor all-Core guarantee.
- After the event, close admission, decide a concrete retention/deletion policy and obtain deletion authority. No silent cleanup job exists. A lost anonymous session cannot be restored by email; saved text can be copied before ending.
- Review Expo remaining monthly requests/storage in its usage dashboard; this was not available. Caps do not prevent all denial-of-service; no CAPTCHA configured. Supabase's default30 anonymous signups/hour/IP remains. Do not increase limits or add a vendor without review.

Emergency close (operator SQL only; no records deleted):

```sql
update public.exhibition_settings
set enabled=false, free_verified_until=now()
where id=true;
```

This closes guest admission/save and all Gemini calls, including member AI, while normal non-AI member recording remains available. Disable anonymous sign-ins in Auth providers if needed; preserve the before-user-created hook until admission is closed. Web rollback target before this release: deployment `11sk5uwt71`, source `077e9bf`. Do not drop guest tables or replay old migrations to roll back.

Reproducible checks:

```text
node scripts/test-exhibition-db.mjs
node scripts/prepare-exhibition-preflight.mjs
npx supabase@3.0.0 db query --remote=vthswebqroygpbmxpqaj --file tmp/exhibition-qa/preflight.sql --yes
npx supabase@3.0.0 db query --remote=vthswebqroygpbmxpqaj --file supabase/tests/exhibition.sql --yes
npx supabase@3.0.0 db query --remote=vthswebqroygpbmxpqaj --file supabase/tests/exhibition_postconditions.sql --yes
npm run check
npm run build:web
```

The preflight command is **only before this migration is installed**. For later regression runs, use exhibition.sql, not the migration composer. Local SQL runner uses the existing ignored PGlite0.5.15 installation under `tmp/feed-db-qa`; a fresh clone needs `npm install --prefix tmp/feed-db-qa --no-save @electric-sql/pglite@0.5.15`. Hosted postgres cannot impersonate Supabase AuthAdmin: production hook checks its ACL/body; the isolated local test exercises the actual AuthAdmin role. Other owner/guest/member/anon/service roles are exercised in production rollback transactions. No permanent QA Auth users, email or real provider calls were created by those tests.

Separate user-approved browser acceptance test: one retained anonymous guest + one private clearly-labelled example review, real Light Gemini draft once, edited keywords/text, save and session end all passed on beta. No existing member record changed. Core real-provider and simultaneous-load tests remain unexecuted. Approved test evidence is ignored local `tmp/exhibition-qa/beta-saved.png`.

Published web: `owipwwm4lx`, beta alias unchanged, source app `6b5e773`, CI42010756054 success. Server-only003/004 and test/runbook follow-up do not change the checked client bytes. `node scripts/check-exhibition-release.mjs` verifies beta status/public-key-only denials and exact client bundle hash without printing credentials.
