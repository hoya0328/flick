begin;
set local lock_timeout='3s';
-- Reject shared/guest exhaustion before creating a per-user usage row. Otherwise
-- repeated rejected requests could grow the log without consuming the quota.
create or replace function public.reserve_project_ai(p_user uuid,p_feature text) returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.exhibition_settings; n integer; b integer; start_at timestamptz; reset_at timestamptz; g public.exhibition_guests; reservation uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('flick:project-ai',0));
 select * into s from public.exhibition_settings where id;
 if now()>=s.free_verified_until then return jsonb_build_object('allowed',false,'code','free_tier_not_verified','retry',0); end if;
 if exists(select 1 from auth.users where id=p_user and is_anonymous) or exists(select 1 from public.exhibition_guests where user_id=p_user) then
 select * into g from public.exhibition_guests where user_id=p_user;
 if not found or not g.adult_confirmed or not g.ai_consent or now()>=g.expires_at or not s.enabled or now()>=s.closes_at
 then return jsonb_build_object('allowed',false,'code','guest_consent_required','retry',0); end if;
 if p_feature='taste_analysis' or exists(select 1 from public.exhibition_records where user_id=p_user)
 or (select count(*) from public.ai_project_reservations where user_id=p_user)>=8 then return jsonb_build_object('allowed',false,'code','guest_limit','retry',0); end if;
 end if;
 start_at=date_trunc('day',now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';
 reset_at=(date_trunc('day',now() at time zone 'America/Los_Angeles')+interval '1 day') at time zone 'America/Los_Angeles';
 select count(*) into n from public.ai_project_reservations where created_at>=start_at;
 if n>=s.daily_limit then return jsonb_build_object('allowed',false,'code','project_daily_limit','retry',greatest(1,ceil(extract(epoch from reset_at-now()))::int)); end if;
 select count(*) into b from public.ai_project_reservations where created_at>now()-interval '1 minute';
 if b>=s.minute_limit then return jsonb_build_object('allowed',false,'code','project_burst_limit','retry',60); end if;
 insert into public.ai_project_reservations(user_id,feature) values(p_user,p_feature) returning id into reservation;
 return jsonb_build_object('allowed',true,'reservationId',reservation);
end $$;
create or replace function public.claim_ai_request(p_user_id uuid,p_feature text)
returns table(event_id uuid,allowed boolean,remaining integer,daily_limit integer,limit_kind text,retry_after_seconds integer)
language plpgsql security definer set search_path=public as $$
declare q record; g jsonb; maximum integer;
begin
 if p_feature='core_question' then maximum=20; elsif p_feature='core_review_draft' then maximum=5; else raise exception 'invalid_ai_feature'; end if;
 perform pg_advisory_xact_lock(hashtextextended('flick:project-ai',0));
 g=public.reserve_project_ai(p_user_id,p_feature);
 if not (g->>'allowed')::boolean then
 return query select null::uuid,false,0,maximum,regexp_replace(g->>'code','_limit$',''),coalesce((g->>'retry')::int,0); return;
 end if;
 select * into q from public.claim_ai_request_personal_v1(p_user_id,p_feature);
 if not q.allowed then
 -- This reservation has not reached the provider. Never refund provider errors.
 delete from public.ai_project_reservations where id=(g->>'reservationId')::uuid;
 end if;
 return query select q.event_id,q.allowed,q.remaining,q.daily_limit,q.limit_kind,q.retry_after_seconds;
end $$;
commit;
