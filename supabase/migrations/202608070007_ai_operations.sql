create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('core_question', 'core_review_draft')),
  status text not null check (status in ('started', 'succeeded', 'failed', 'blocked')),
  provider text not null default 'google',
  model text,
  error_code text,
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ai_usage_events_user_feature_created_idx
  on public.ai_usage_events(user_id, feature, created_at desc);

alter table public.ai_usage_events enable row level security;
revoke all on table public.ai_usage_events from public, anon, authenticated;
grant select on table public.ai_usage_events to authenticated;

drop policy if exists "ai_usage_events_select_own" on public.ai_usage_events;
create policy "ai_usage_events_select_own" on public.ai_usage_events
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.claim_ai_request(p_user_id uuid, p_feature text)
returns table(event_id uuid, allowed boolean, remaining integer, daily_limit integer, limit_kind text, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_daily_limit integer;
  v_burst_limit integer;
  v_daily_count integer;
  v_burst_count integer;
  v_event_id uuid;
  v_retry integer;
begin
  if p_feature = 'core_question' then
    v_daily_limit := 20;
    v_burst_limit := 6;
  elsif p_feature = 'core_review_draft' then
    v_daily_limit := 5;
    v_burst_limit := 2;
  else
    raise exception 'invalid_ai_feature';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_feature, 0));
  delete from public.ai_usage_events
    where user_id = p_user_id and created_at < now() - interval '30 days';

  select count(*) into v_daily_count
    from public.ai_usage_events
    where user_id = p_user_id and feature = p_feature
      and status <> 'blocked' and created_at >= date_trunc('day', now());

  if v_daily_count >= v_daily_limit then
    v_retry := greatest(1, ceil(extract(epoch from (date_trunc('day', now()) + interval '1 day' - now())))::integer);
    if not exists (
      select 1 from public.ai_usage_events where user_id = p_user_id and feature = p_feature
        and status = 'blocked' and error_code = 'daily_limit' and created_at >= now() - interval '5 minutes'
    ) then
      insert into public.ai_usage_events(user_id, feature, status, error_code, finished_at)
        values (p_user_id, p_feature, 'blocked', 'daily_limit', now());
    end if;
    return query select null::uuid, false, 0, v_daily_limit, 'daily'::text, v_retry;
    return;
  end if;

  select count(*) into v_burst_count
    from public.ai_usage_events
    where user_id = p_user_id and feature = p_feature
      and status <> 'blocked' and created_at >= now() - interval '1 minute';

  if v_burst_count >= v_burst_limit then
    if not exists (
      select 1 from public.ai_usage_events where user_id = p_user_id and feature = p_feature
        and status = 'blocked' and error_code = 'burst_limit' and created_at >= now() - interval '1 minute'
    ) then
      insert into public.ai_usage_events(user_id, feature, status, error_code, finished_at)
        values (p_user_id, p_feature, 'blocked', 'burst_limit', now());
    end if;
    return query select null::uuid, false, greatest(0, v_daily_limit - v_daily_count), v_daily_limit, 'burst'::text, 60;
    return;
  end if;

  insert into public.ai_usage_events(user_id, feature, status)
    values (p_user_id, p_feature, 'started') returning id into v_event_id;
  return query select v_event_id, true, greatest(0, v_daily_limit - v_daily_count - 1), v_daily_limit, null::text, 0;
end;
$$;

create or replace function public.finish_ai_request(
  p_event_id uuid,
  p_status text,
  p_error_code text,
  p_model text,
  p_prompt_tokens integer,
  p_output_tokens integer,
  p_total_tokens integer,
  p_duration_ms integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('succeeded', 'failed') then raise exception 'invalid_ai_status'; end if;
  update public.ai_usage_events set
    status = p_status,
    error_code = left(nullif(p_error_code, ''), 80),
    model = left(nullif(p_model, ''), 120),
    prompt_tokens = greatest(0, p_prompt_tokens),
    output_tokens = greatest(0, p_output_tokens),
    total_tokens = greatest(0, p_total_tokens),
    duration_ms = greatest(0, p_duration_ms),
    finished_at = now()
  where id = p_event_id and status = 'started';
end;
$$;

revoke all on function public.claim_ai_request(uuid, text) from public, anon, authenticated;
revoke all on function public.finish_ai_request(uuid, text, text, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_ai_request(uuid, text) to service_role;
grant execute on function public.finish_ai_request(uuid, text, text, text, integer, integer, integer, integer) to service_role;

comment on table public.ai_usage_events is
  'Content-free AI operations log. Keeps feature, status, model, errors and token counts; active users are pruned to 30 days.';
comment on function public.claim_ai_request(uuid, text) is
  'Atomic per-user free-tier quota claim: questions 20/day and 6/minute, drafts 5/day and 2/minute.';

-- Rollback: drop claim_ai_request/finish_ai_request first, then drop ai_usage_events.
