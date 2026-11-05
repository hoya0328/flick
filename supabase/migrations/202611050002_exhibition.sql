begin;
set local lock_timeout = '3s';

create table public.exhibition_settings (
 id boolean primary key default true check(id), enabled boolean not null default true,
 closes_at timestamptz not null default now()+interval '7 days',
 free_verified_until timestamptz not null default now()+interval '7 days',
 daily_limit integer not null default 400 check(daily_limit between 0 and 400),
 minute_limit integer not null default 12 check(minute_limit between 0 and 12)
);
insert into public.exhibition_settings(id) values(true);
create table public.exhibition_signup_slots(id uuid primary key,created_at timestamptz not null default now());
create index on public.exhibition_signup_slots(created_at);
create table public.exhibition_guests (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '2 hours',
 adult_confirmed boolean not null, ai_consent boolean not null,
 check(not ai_consent or adult_confirmed)
);
create table public.exhibition_records (
 user_id uuid primary key references public.exhibition_guests(user_id) on delete cascade,
 movie_id uuid not null references public.movies(id), mode text not null check(mode in('light','core')),
 rating numeric not null check(rating between 0.5 and 5 and rating*2=trunc(rating*2)),
 body text not null check(length(body) between 1 and 1000),
 keywords text[] not null default '{}' check(cardinality(keywords)<=15),
 responses jsonb not null check(jsonb_typeof(responses)='array' and jsonb_array_length(responses) between 1 and 5 and octet_length(responses::text)<=16000),
 created_at timestamptz not null default now()
);
create table public.ai_project_reservations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 feature text not null, created_at timestamptz not null default now()
);
create index on public.ai_project_reservations(created_at);
create index on public.ai_project_reservations(user_id);
-- Account for requests made before rollout (conservative; provider failures also count).
insert into public.ai_project_reservations(user_id,feature,created_at)
 select user_id,feature,created_at from public.ai_usage_events where status<>'blocked' and created_at>now()-interval '2 days';
insert into public.ai_project_reservations(user_id,feature,created_at)
 select user_id,'taste_analysis',created_at from public.taste_analysis_events where created_at>now()-interval '2 days';

alter table public.exhibition_settings enable row level security;
alter table public.exhibition_signup_slots enable row level security;
alter table public.exhibition_guests enable row level security;
alter table public.exhibition_records enable row level security;
alter table public.ai_project_reservations enable row level security;
revoke all on public.exhibition_settings,public.exhibition_signup_slots,public.exhibition_guests,public.exhibition_records,public.ai_project_reservations from public,anon,authenticated;
grant select on public.exhibition_guests,public.exhibition_records to authenticated;
create policy exhibition_guest_own on public.exhibition_guests for select to authenticated using(user_id=auth.uid());
create policy exhibition_record_own on public.exhibition_records for select to authenticated using(user_id=auth.uid());

create function public.is_exhibition_guest() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from auth.users where id=auth.uid() and is_anonymous)
 or exists(select 1 from public.exhibition_guests where user_id=auth.uid())
$$;
revoke all on function public.is_exhibition_guest() from public,anon;
grant execute on function public.is_exhibition_guest() to authenticated;
create function public.guard_exhibition_member_write() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if public.is_exhibition_guest() then raise exception using errcode='42501',message='exhibition_member_required'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function public.guard_exhibition_member_write() from public,anon,authenticated;
-- Definer RPCs bypass RLS, but cannot bypass these table-level guards.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename not in
 ('exhibition_settings','exhibition_signup_slots','exhibition_guests','exhibition_records','ai_project_reservations') loop
 execute format('create trigger exhibition_member_write before insert or update or delete on public.%I for each row execute function public.guard_exhibition_member_write()',t.tablename);
 end loop;
end $$;
create policy exhibition_no_storage on storage.objects as restrictive for all to authenticated
 using(not public.is_exhibition_guest()) with check(not public.is_exhibition_guest());

create function public.exhibition_before_user_created(event jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.exhibition_settings; uid uuid;
begin
 if coalesce((event->'user'->>'is_anonymous')::boolean,false)=false then return '{}'::jsonb; end if;
 perform pg_advisory_xact_lock(hashtextextended('flick:exhibition-signup',0));
 select * into s from public.exhibition_settings where id;
 if not s.enabled or now()>=s.closes_at then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','exhibition_closed')); end if;
 if (select count(*) from public.exhibition_signup_slots)>=1000
 or (select count(*) from public.exhibition_signup_slots where created_at>=date_trunc('day',now()))>=150
 or (select count(*) from public.exhibition_signup_slots where created_at>now()-interval '1 minute')>=20
 then return jsonb_build_object('error',jsonb_build_object('http_code',429,'message','exhibition_signup_limit')); end if;
 uid=(event->'user'->>'id')::uuid;
 insert into public.exhibition_signup_slots(id) values(uid) on conflict do nothing;
 return '{}'::jsonb;
end $$;
revoke all on function public.exhibition_before_user_created(jsonb) from public,anon,authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.exhibition_before_user_created(jsonb) to supabase_auth_admin;

create function public.join_exhibition(p_adult boolean,p_ai boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare g public.exhibition_guests;
begin
 if not exists(select 1 from auth.users where id=auth.uid() and is_anonymous) then raise exception 'anonymous_session_required'; end if;
 if not exists(select 1 from public.exhibition_settings where id and enabled and now()<closes_at) then raise exception 'exhibition_closed'; end if;
 if p_adult is null or p_ai is null or (p_ai and not p_adult) then raise exception 'invalid_consent'; end if;
 -- The pre-signup hook must have admitted this Auth ID; direct API calls cannot skip admission.
 if not exists(select 1 from public.exhibition_signup_slots where id=auth.uid()) then raise exception 'exhibition_admission_required'; end if;
 insert into public.exhibition_guests(user_id,adult_confirmed,ai_consent) values(auth.uid(),p_adult,p_ai)
 on conflict(user_id) do nothing;
 select * into g from public.exhibition_guests where user_id=auth.uid();
 return to_jsonb(g);
end $$;
create function public.exhibition_movies(p_search text default '') returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from (
 select id,title,original_title,overview,poster_path,release_date,genres,provider_id from public.movies
 where exists(select 1 from public.exhibition_guests where user_id=auth.uid() and now()<expires_at)
 and (coalesce(p_search,'')='' or strpos(lower(title),lower(left(p_search,80)))>0)
 order by vote_average desc nulls last,id limit 12) m
$$;
create function public.save_exhibition_record(p_movie uuid,p_mode text,p_rating numeric,p_body text,p_keywords text[],p_responses jsonb) returns void language plpgsql security definer set search_path=public as $$
declare item jsonb; word text;
begin
 if not exists(select 1 from public.exhibition_guests where user_id=auth.uid() and now()<expires_at)
 or not exists(select 1 from public.exhibition_settings where id and enabled and now()<closes_at) then raise exception 'exhibition_session_expired'; end if;
 if p_body is null or length(trim(p_body)) not between 1 and 1000 or p_keywords is null or cardinality(p_keywords)>15
 or p_responses is null or jsonb_typeof(p_responses)<>'array' or jsonb_array_length(p_responses) not between 1 and 5
 or octet_length(p_responses::text)>16000 then raise exception 'invalid_record'; end if;
 foreach word in array p_keywords loop if word is null or length(word) not between 1 and 40 then raise exception 'invalid_keywords'; end if; end loop;
 for item in select value from jsonb_array_elements(p_responses) loop
 if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'question') is distinct from 'string'
 or length(item->>'question') not between 1 and 500 or jsonb_typeof(item->'answer') is distinct from 'string'
 or length(item->>'answer')>1000 then raise exception 'invalid_responses'; end if;
 end loop;
 -- No owner parameter, visibility field, media path or arbitrary JSON survives this contract.
 insert into public.exhibition_records(user_id,movie_id,mode,rating,body,keywords,responses)
 values(auth.uid(),p_movie,p_mode,p_rating,trim(p_body),p_keywords,p_responses);
end $$;
revoke all on function public.join_exhibition(boolean,boolean),public.exhibition_movies(text),public.save_exhibition_record(uuid,text,numeric,text,text[],jsonb) from public,anon;
grant execute on function public.join_exhibition(boolean,boolean),public.exhibition_movies(text),public.save_exhibition_record(uuid,text,numeric,text,text[],jsonb) to authenticated;

create function public.reserve_project_ai(p_user uuid,p_feature text) returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.exhibition_settings; n integer; b integer; start_at timestamptz; reset_at timestamptz; g public.exhibition_guests;
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
 insert into public.ai_project_reservations(user_id,feature) values(p_user,p_feature);
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function public.reserve_project_ai(uuid,text) from public,anon,authenticated;

alter function public.claim_ai_request(uuid,text) rename to claim_ai_request_personal_v1;
revoke all on function public.claim_ai_request_personal_v1(uuid,text) from service_role;
create function public.claim_ai_request(p_user_id uuid,p_feature text)
returns table(event_id uuid,allowed boolean,remaining integer,daily_limit integer,limit_kind text,retry_after_seconds integer)
language plpgsql security definer set search_path=public as $$
declare q record; g jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('flick:project-ai',0));
 select * into q from public.claim_ai_request_personal_v1(p_user_id,p_feature);
 if not q.allowed then return query select q.event_id,q.allowed,q.remaining,q.daily_limit,q.limit_kind,q.retry_after_seconds; return; end if;
 g=public.reserve_project_ai(p_user_id,p_feature);
 if not (g->>'allowed')::boolean then
 update public.ai_usage_events set status='blocked',error_code=g->>'code',finished_at=now() where id=q.event_id;
 return query select null::uuid,false,0,q.daily_limit,regexp_replace(g->>'code','_limit$',''),coalesce((g->>'retry')::int,0); return;
 end if;
 return query select q.event_id,true,q.remaining,q.daily_limit,null::text,0;
end $$;
revoke all on function public.claim_ai_request(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_ai_request(uuid,text) to service_role;

alter function public.claim_taste_analysis(uuid,uuid,text) rename to claim_taste_analysis_personal_v1;
revoke all on function public.claim_taste_analysis_personal_v1(uuid,uuid,text) from service_role;
create function public.claim_taste_analysis(p_user uuid,p_review uuid,p_hash text) returns jsonb language plpgsql security definer set search_path=public as $$
declare q jsonb; g jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('flick:project-ai',0));
 q=public.claim_taste_analysis_personal_v1(p_user,p_review,p_hash);
 if not (q->>'allowed')::boolean then return q; end if;
 g=public.reserve_project_ai(p_user,'taste_analysis');
 if not (g->>'allowed')::boolean then delete from public.taste_analysis_events where id=(q->>'eventId')::uuid; return g; end if;
 return q;
end $$;
revoke all on function public.claim_taste_analysis(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_taste_analysis(uuid,uuid,text) to service_role;

create function public.exhibition_status() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('open',s.enabled and now()<s.closes_at,'closesAt',s.closes_at,
 'aiAvailable',now()<s.free_verified_until,'verifiedUntil',s.free_verified_until,
 'dailyRemaining',greatest(0,s.daily_limit-(select count(*) from public.ai_project_reservations where created_at>=date_trunc('day',now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles')),
 'minuteRemaining',greatest(0,s.minute_limit-(select count(*) from public.ai_project_reservations where created_at>now()-interval '1 minute')),
 'guestRemaining',greatest(0,8-(select count(*) from public.ai_project_reservations where user_id=auth.uid())))
 from public.exhibition_settings s where id
$$;
revoke all on function public.exhibition_status() from public;
grant execute on function public.exhibition_status() to anon,authenticated;
comment on table public.exhibition_records is 'Private exhibition-only records; one per anonymous guest. No automatic retention cleanup; operator review after event required.';
commit;
