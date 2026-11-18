-- Operator-only, user-approved on 2026-11-18. NOT a schema migration.
-- Run only after checking Google Klick / klick-504806 is still on Free tier,
-- plus the existing Supabase and Expo free-plan usage. No billing change.
-- End: 2026-11-24 00:00 Asia/Seoul, exclusive. Open early for final rehearsal.
-- Existing signup, per-user, daily/minute AI and privacy guards are unchanged.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '10s';
do $$
declare s public.exhibition_settings;
begin
  if current_database() <> 'postgres' then raise exception 'unexpected_database'; end if;
  select * into strict s from public.exhibition_settings where id = true for update;
  if now() >= timestamptz '2026-11-24 00:00:00+09' then raise exception 'approved_window_ended'; end if;
  if timestamptz '2026-11-24 00:00:00+09' > now()+interval '7 days' then raise exception 'verification_ttl_too_long'; end if;
  if s.daily_limit <> 400 or s.minute_limit <> 12 then raise exception 'unexpected_existing_limits'; end if;
  if (select count(*) from public.exhibition_signup_slots) >= 1000 then raise exception 'event_signup_budget_exhausted'; end if;
  update public.exhibition_settings
    set enabled = true,
        closes_at = timestamptz '2026-11-24 00:00:00+09',
        free_verified_until = timestamptz '2026-11-24 00:00:00+09'
    where id = true;
end $$;
commit;
select enabled, closes_at, free_verified_until, daily_limit, minute_limit
from public.exhibition_settings where id = true;
