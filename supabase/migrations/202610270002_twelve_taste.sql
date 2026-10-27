-- Additive, private analysis cache. Existing review writes and AI quotas are untouched.
begin;
create table public.taste_analysis_preferences(
  user_id uuid primary key references auth.users(id) on delete cascade,
  consent boolean not null default false,updated_at timestamptz not null default now()
);
create table public.taste_review_analyses(
  review_id uuid primary key references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_hash text not null,extractor_version text not null default 'taste-evidence-v1',
  signals jsonb not null check(jsonb_typeof(signals)='array' and jsonb_array_length(signals)<=36 and octet_length(signals::text)<=24000),
  model text not null,analyzed_at timestamptz not null default now()
);
create index taste_analyses_owner_idx on public.taste_review_analyses(user_id);
create table public.taste_analysis_events(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete set null,
  status text not null check(status in('started','succeeded','failed')),
  error_code text,created_at timestamptz not null default now(),finished_at timestamptz
);
create index taste_events_time_idx on public.taste_analysis_events(created_at);
create index taste_events_owner_time_idx on public.taste_analysis_events(user_id,created_at);
alter table public.taste_analysis_preferences enable row level security;
alter table public.taste_review_analyses enable row level security;
alter table public.taste_analysis_events enable row level security;
create policy taste_preferences_owner on public.taste_analysis_preferences for select to authenticated using(user_id=auth.uid());
create policy taste_cache_owner on public.taste_review_analyses for select to authenticated using(user_id=auth.uid());
revoke all on public.taste_analysis_preferences,public.taste_review_analyses,public.taste_analysis_events from public,anon,authenticated;
grant all on public.taste_analysis_preferences,public.taste_review_analyses,public.taste_analysis_events to service_role;

create function public.taste_source_json(p_review uuid,p_user uuid) returns jsonb
language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('reviewId',r.id,'movieId',r.movie_id,'movieTitle',m.title,'turns',coalesce((
   select jsonb_agg(jsonb_build_object('key',q.question_key,'question',q.question_text,'answer',trim(a.answer)) order by q.sort_order,q.question_key)
   from public.review_questions q join public.review_answers a on a.review_id=q.review_id and a.question_key=q.question_key
   where q.review_id=r.id and length(trim(a.answer))>0
 ),'[]'::jsonb)) from public.reviews r join public.movies m on m.id=r.movie_id
 where r.id=p_review and r.user_id=p_user and r.mode='core' and r.status='completed'
$$;
revoke all on function public.taste_source_json(uuid,uuid) from public,anon,authenticated;
grant execute on function public.taste_source_json(uuid,uuid) to service_role;

create function public.set_my_taste_consent(p_consent boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_consent is null then raise exception 'invalid_consent'; end if;
 insert into public.taste_analysis_preferences(user_id,consent) values(auth.uid(),p_consent)
 on conflict(user_id) do update set consent=excluded.consent,updated_at=now();
 if not p_consent then delete from public.taste_review_analyses where user_id=auth.uid(); end if;
end $$;
create function public.get_my_taste_analysis_state() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare enabled boolean; result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select coalesce((select consent from public.taste_analysis_preferences where user_id=auth.uid()),false) into enabled;
 select jsonb_build_object('consent',enabled,'analyses',coalesce((
   select jsonb_agg(jsonb_build_object('reviewId',a.review_id,'signals',a.signals,'analyzedAt',a.analyzed_at,'source',s.source))
   from public.taste_review_analyses a cross join lateral(select public.taste_source_json(a.review_id,auth.uid()) source) s
   where enabled and a.user_id=auth.uid() and a.extractor_version='taste-evidence-v1' and s.source is not null
     and a.source_hash=md5(s.source::text||':taste-evidence-v1')
 ),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.get_my_taste_source(p_review_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare source jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 source=public.taste_source_json(p_review_id,auth.uid());
 if source is null then raise exception 'review_not_found'; end if;
 return jsonb_build_object('source',source,'hash',md5(source::text||':taste-evidence-v1'),
   'consent',coalesce((select consent from public.taste_analysis_preferences where user_id=auth.uid()),false));
end $$;

create function public.claim_taste_analysis(p_user uuid,p_review uuid,p_hash text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare source jsonb; event uuid;
begin
 -- Serialize the global allowance too: two accounts cannot race the project cap.
 perform pg_advisory_xact_lock(hashtextextended('flick:taste-analysis',0));
 if not coalesce((select consent from public.taste_analysis_preferences where user_id=p_user),false) then return jsonb_build_object('allowed',false,'code','consent_required'); end if;
 source=public.taste_source_json(p_review,p_user);
 if source is null or md5(source::text||':taste-evidence-v1') is distinct from p_hash then return jsonb_build_object('allowed',false,'code','source_changed'); end if;
 if exists(select 1 from public.taste_review_analyses where review_id=p_review and user_id=p_user and source_hash=p_hash and extractor_version='taste-evidence-v1') then return jsonb_build_object('allowed',false,'code','cached'); end if;
 delete from public.taste_analysis_events where created_at<now()-interval '30 days';
 if exists(select 1 from public.taste_analysis_events where user_id=p_user and review_id=p_review and status='started' and created_at>now()-interval '45 seconds') then return jsonb_build_object('allowed',false,'code','analysis_busy'); end if;
 if (select count(*) from public.taste_analysis_events where user_id=p_user and created_at>=date_trunc('day',now()))>=5 then return jsonb_build_object('allowed',false,'code','daily_limit'); end if;
 if (select count(*) from public.taste_analysis_events where created_at>=date_trunc('day',now()))>=30 then return jsonb_build_object('allowed',false,'code','project_daily_limit'); end if;
 if (select count(*) from public.taste_analysis_events where user_id=p_user and created_at>now()-interval '1 minute')>=2 then return jsonb_build_object('allowed',false,'code','burst_limit'); end if;
 insert into public.taste_analysis_events(user_id,review_id,status) values(p_user,p_review,'started') returning id into event;
 return jsonb_build_object('allowed',true,'eventId',event);
end $$;
create function public.commit_taste_analysis(p_user uuid,p_review uuid,p_hash text,p_signals jsonb,p_model text) returns boolean
language plpgsql security definer set search_path=public as $$
declare source jsonb; signal jsonb;
begin
 -- Lock consent against withdrawal while committing, and the source review against edits.
 perform 1 from public.taste_analysis_preferences where user_id=p_user and consent for update;
 if not found then return false; end if;
 perform 1 from public.reviews where id=p_review and user_id=p_user for update;
 source=public.taste_source_json(p_review,p_user);
 if source is null or md5(source::text||':taste-evidence-v1') is distinct from p_hash then return false; end if;
 if jsonb_typeof(p_signals) is distinct from 'array' or jsonb_array_length(p_signals)>36 then raise exception 'invalid_signals'; end if;
 for signal in select value from jsonb_array_elements(p_signals) loop
   if jsonb_typeof(signal) is distinct from 'object' or signal->>'type' is null
     or signal->>'type' not in('scene','afterglow','music','interpretation','character','narrative','immersion','comfort','aftereffect','nostalgia','everyday','novelty')
     or signal->>'stance' is null or signal->>'stance' not in('positive','neutral','mixed','negative')
     or jsonb_typeof(signal->'strength') is distinct from 'number' or (signal->>'strength')::numeric not between 0.000001 and 1
     or jsonb_typeof(signal->'evidence') is distinct from 'string' or length(signal->>'evidence') not between 4 and 400
     or not exists(select 1 from jsonb_array_elements(source->'turns') t where t->>'key'=signal->>'questionKey' and strpos(t->>'answer',signal->>'evidence')>0)
   then raise exception 'invalid_signals'; end if;
 end loop;
 insert into public.taste_review_analyses(review_id,user_id,source_hash,signals,model) values(p_review,p_user,p_hash,p_signals,left(p_model,100))
 on conflict(review_id) do update set user_id=excluded.user_id,source_hash=excluded.source_hash,signals=excluded.signals,model=excluded.model,extractor_version='taste-evidence-v1',analyzed_at=now();
 return true;
end $$;
revoke all on function public.set_my_taste_consent(boolean),public.get_my_taste_analysis_state(),public.get_my_taste_source(uuid) from public,anon;
grant execute on function public.set_my_taste_consent(boolean),public.get_my_taste_analysis_state(),public.get_my_taste_source(uuid) to authenticated;
revoke all on function public.claim_taste_analysis(uuid,uuid,text),public.commit_taste_analysis(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_taste_analysis(uuid,uuid,text),public.commit_taste_analysis(uuid,uuid,text,jsonb,text) to service_role;
comment on table public.taste_review_analyses is 'Private user-answer-only evidence. Source hash excludes rating/AI magazine; reads hide stale/withdrawn/deleted sources. No paid AI fallback.';
commit;
