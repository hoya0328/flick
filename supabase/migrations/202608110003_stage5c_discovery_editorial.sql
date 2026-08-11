create table if not exists public.discovery_ranking_runs (
  id uuid primary key default gen_random_uuid(),
  period_days integer not null check (period_days between 1 and 31),
  period_start timestamptz not null,
  period_end timestamptz not null,
  sample_size integer not null default 0 check (sample_size >= 0),
  sufficient boolean not null default false,
  refreshed_by uuid references auth.users(id) on delete set null,
  refreshed_at timestamptz not null default now()
);

create table if not exists public.discovery_ranking_items (
  run_id uuid not null references public.discovery_ranking_runs(id) on delete cascade,
  kind text not null check (kind in ('movie', 'keyword')),
  rank integer not null check (rank between 1 and 20),
  movie_id uuid references public.movies(id),
  keyword_key text,
  label text not null check (char_length(label) between 1 and 120),
  score integer not null check (score > 0),
  primary key (run_id, kind, rank),
  check ((kind = 'movie' and movie_id is not null and keyword_key is null) or (kind = 'keyword' and movie_id is null and keyword_key is not null))
);

create table if not exists public.editorial_curations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('niche', 'expert')),
  title text not null check (char_length(trim(title)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  curator_name text not null default '' check (char_length(curator_name) <= 80),
  source_url text not null default '' check (char_length(source_url) <= 500),
  rights_confirmed boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editorial_curation_items (
  curation_id uuid not null references public.editorial_curations(id) on delete cascade,
  movie_id uuid not null references public.movies(id),
  note text not null default '' check (char_length(note) <= 500),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (curation_id, movie_id)
);

create index if not exists discovery_ranking_runs_refreshed_idx on public.discovery_ranking_runs(refreshed_at desc);
create index if not exists editorial_curations_published_idx on public.editorial_curations(published_at desc) where status = 'published';

alter table public.discovery_ranking_runs enable row level security;
alter table public.discovery_ranking_items enable row level security;
alter table public.editorial_curations enable row level security;
alter table public.editorial_curation_items enable row level security;

revoke all on public.discovery_ranking_runs from anon, authenticated;
revoke all on public.discovery_ranking_items from anon, authenticated;
revoke all on public.editorial_curations from anon, authenticated;
revoke all on public.editorial_curation_items from anon, authenticated;

create or replace function public.get_discovery_rankings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    else coalesce((
      select jsonb_build_object(
        'period_days', runs.period_days,
        'period_start', runs.period_start,
        'period_end', runs.period_end,
        'sample_size', runs.sample_size,
        'sufficient', runs.sufficient,
        'refreshed_at', runs.refreshed_at,
        'movies', coalesce((
          select jsonb_agg(jsonb_build_object(
            'rank', items.rank,
            'movie_id', items.movie_id,
            'title', items.label,
            'poster_path', movies.poster_path,
            'score', items.score
          ) order by items.rank)
          from public.discovery_ranking_items items
          join public.movies movies on movies.id = items.movie_id
          where items.run_id = runs.id and items.kind = 'movie'
        ), '[]'::jsonb),
        'keywords', coalesce((
          select jsonb_agg(jsonb_build_object(
            'rank', items.rank,
            'key', items.keyword_key,
            'label', items.label,
            'score', items.score
          ) order by items.rank)
          from public.discovery_ranking_items items
          where items.run_id = runs.id and items.kind = 'keyword'
        ), '[]'::jsonb)
      )
      from public.discovery_ranking_runs runs
      order by runs.refreshed_at desc
      limit 1
    ), jsonb_build_object(
      'period_days', 7,
      'period_start', now() - interval '7 days',
      'period_end', now(),
      'sample_size', 0,
      'sufficient', false,
      'refreshed_at', null,
      'movies', '[]'::jsonb,
      'keywords', '[]'::jsonb
    ))
  end
$$;

create or replace function public.admin_refresh_discovery_rankings(p_period_days integer default 7, p_min_reviews integer default 5)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_period_start timestamptz;
  v_sample_size integer;
  v_min_reviews integer;
begin
  if not exists (select 1 from public.admin_access where user_id = auth.uid() and role = 'super_admin') then raise exception 'admin_required'; end if;
  if p_period_days not between 1 and 31 then raise exception 'invalid_period_days'; end if;
  v_min_reviews := least(greatest(coalesce(p_min_reviews, 5), 5), 100);
  v_period_start := now() - make_interval(days => p_period_days);

  select count(*) into v_sample_size
  from public.reviews reviews
  where reviews.visibility = 'public' and reviews.status = 'completed'
    and coalesce(reviews.completed_at, reviews.updated_at) >= v_period_start;

  insert into public.discovery_ranking_runs (period_days, period_start, period_end, sample_size, sufficient, refreshed_by)
  values (p_period_days, v_period_start, now(), v_sample_size, v_sample_size >= v_min_reviews, auth.uid())
  returning id into v_run_id;

  if v_sample_size >= v_min_reviews then
    with ranked_movies as (
      select reviews.movie_id, movies.title, count(*)::integer as score
      from public.reviews reviews
      join public.movies movies on movies.id = reviews.movie_id
      where reviews.visibility = 'public' and reviews.status = 'completed'
        and coalesce(reviews.completed_at, reviews.updated_at) >= v_period_start
      group by reviews.movie_id, movies.title
    ), limited_movies as (
      select movie_id, title, score, row_number() over (order by score desc, title asc)::integer as rank
      from ranked_movies
      order by score desc, title asc
      limit 10
    )
    insert into public.discovery_ranking_items (run_id, kind, rank, movie_id, label, score)
    select v_run_id, 'movie', rank, movie_id, title, score from limited_movies;

    with keyword_values as (
      select review_keywords.keyword_id as keyword_key, keywords.label
      from public.review_keywords review_keywords
      join public.reviews reviews on reviews.id = review_keywords.review_id
      join public.keywords keywords on keywords.id = review_keywords.keyword_id
      where reviews.visibility = 'public' and reviews.status = 'completed'
        and coalesce(reviews.completed_at, reviews.updated_at) >= v_period_start
      union all
      select answer_tags.tag_id,
             coalesce(tag_option.label, answer_tags.tag_id)
      from public.review_answer_tags answer_tags
      join public.reviews reviews on reviews.id = answer_tags.review_id
      join public.review_questions questions on questions.review_id = answer_tags.review_id and questions.question_key = answer_tags.question_key
      left join lateral (
        select option ->> 'label' as label
        from jsonb_array_elements(questions.options) option
        where option ->> 'id' = answer_tags.tag_id
        limit 1
      ) tag_option on true
      where reviews.visibility = 'public' and reviews.status = 'completed'
        and coalesce(reviews.completed_at, reviews.updated_at) >= v_period_start
    ), ranked_keywords as (
      select keyword_key, min(label) as label, count(*)::integer as score
      from keyword_values
      group by keyword_key
    ), limited_keywords as (
      select keyword_key, label, score, row_number() over (order by score desc, label asc)::integer as rank
      from ranked_keywords
      order by score desc, label asc
      limit 10
    )
    insert into public.discovery_ranking_items (run_id, kind, rank, keyword_key, label, score)
    select v_run_id, 'keyword', rank, keyword_key, label, score from limited_keywords;
  end if;

  delete from public.discovery_ranking_runs
  where id in (select id from public.discovery_ranking_runs order by refreshed_at desc offset 12);

  insert into public.admin_audit_events (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'discovery_rankings_refreshed', 'discovery_ranking_run', v_run_id::text,
          jsonb_build_object('period_days', p_period_days, 'sample_size', v_sample_size, 'sufficient', v_sample_size >= v_min_reviews));
  return v_run_id;
end;
$$;

create or replace function public.list_published_curations(p_limit integer default 10)
returns table (
  curation_id uuid,
  kind text,
  title text,
  description text,
  curator_name text,
  source_url text,
  movie_count bigint,
  poster_paths text[],
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select curations.id, curations.kind, curations.title, curations.description,
         curations.curator_name, curations.source_url,
         count(items.movie_id),
         coalesce((array_agg(movies.poster_path order by items.sort_order) filter (where movies.poster_path is not null))[1:4], '{}'::text[]),
         curations.published_at
  from public.editorial_curations curations
  left join public.editorial_curation_items items on items.curation_id = curations.id
  left join public.movies movies on movies.id = items.movie_id
  where auth.uid() is not null and curations.status = 'published'
  group by curations.id
  order by curations.published_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 30)
$$;

create or replace function public.get_published_curation(p_curation_id uuid)
returns table (
  curation_id uuid,
  kind text,
  title text,
  description text,
  curator_name text,
  source_url text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select curations.id, curations.kind, curations.title, curations.description,
         curations.curator_name, curations.source_url, curations.published_at
  from public.editorial_curations curations
  where auth.uid() is not null and curations.id = p_curation_id and curations.status = 'published'
$$;

create or replace function public.list_published_curation_items(p_curation_id uuid)
returns table (
  movie_id uuid,
  title text,
  original_title text,
  overview text,
  poster_path text,
  release_date date,
  runtime integer,
  genres text[],
  recommendation_keywords text[],
  vote_average numeric,
  note text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select movies.id, movies.title, movies.original_title, movies.overview, movies.poster_path,
         movies.release_date, movies.runtime, movies.genres, movies.recommendation_keywords,
         movies.vote_average, items.note, items.sort_order
  from public.editorial_curation_items items
  join public.editorial_curations curations on curations.id = items.curation_id
  join public.movies movies on movies.id = items.movie_id
  where auth.uid() is not null and curations.id = p_curation_id and curations.status = 'published'
  order by items.sort_order, items.created_at
$$;

create or replace function public.admin_list_editorial_curations()
returns table (
  curation_id uuid,
  kind text,
  title text,
  description text,
  curator_name text,
  source_url text,
  rights_confirmed boolean,
  status text,
  movie_count bigint,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_access where user_id = auth.uid() and role = 'super_admin') then raise exception 'admin_required'; end if;
  return query
  select curations.id, curations.kind, curations.title, curations.description, curations.curator_name,
         curations.source_url, curations.rights_confirmed, curations.status, count(items.movie_id), curations.updated_at
  from public.editorial_curations curations
  left join public.editorial_curation_items items on items.curation_id = curations.id
  group by curations.id
  order by curations.updated_at desc;
end;
$$;

create or replace function public.admin_list_editorial_curation_items(p_curation_id uuid)
returns table (
  movie_id uuid,
  title text,
  original_title text,
  overview text,
  poster_path text,
  release_date date,
  runtime integer,
  genres text[],
  recommendation_keywords text[],
  vote_average numeric,
  note text,
  sort_order integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_access where user_id = auth.uid() and role = 'super_admin') then raise exception 'admin_required'; end if;
  return query
  select movies.id, movies.title, movies.original_title, movies.overview, movies.poster_path,
         movies.release_date, movies.runtime, movies.genres, movies.recommendation_keywords,
         movies.vote_average, items.note, items.sort_order
  from public.editorial_curation_items items
  join public.movies movies on movies.id = items.movie_id
  where items.curation_id = p_curation_id
  order by items.sort_order, items.created_at;
end;
$$;

create or replace function public.admin_save_editorial_curation(
  p_curation_id uuid,
  p_kind text,
  p_title text,
  p_description text,
  p_curator_name text,
  p_source_url text,
  p_rights_confirmed boolean,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.admin_access where user_id = auth.uid() and role = 'super_admin') then raise exception 'admin_required'; end if;
  if p_kind not in ('niche', 'expert') then raise exception 'invalid_curation_kind'; end if;
  if char_length(trim(coalesce(p_title, ''))) not between 2 and 80 then raise exception 'invalid_curation_title'; end if;
  if char_length(coalesce(p_description, '')) > 1000 then raise exception 'invalid_curation_description'; end if;
  if p_status not in ('draft', 'published') then raise exception 'invalid_curation_status'; end if;
  if p_status = 'published' and p_curation_id is null then raise exception 'add_movies_before_publish'; end if;
  if p_status = 'published' and not exists (select 1 from public.editorial_curation_items where curation_id = p_curation_id) then raise exception 'add_movies_before_publish'; end if;
  if p_status = 'published' and p_kind = 'expert' and (
    char_length(trim(coalesce(p_curator_name, ''))) < 2 or
    coalesce(p_source_url, '') !~ '^https?://' or
    not coalesce(p_rights_confirmed, false)
  ) then raise exception 'expert_rights_required'; end if;

  if p_curation_id is null then
    insert into public.editorial_curations (created_by, kind, title, description, curator_name, source_url, rights_confirmed, status)
    values (auth.uid(), p_kind, trim(p_title), trim(coalesce(p_description, '')), trim(coalesce(p_curator_name, '')),
            trim(coalesce(p_source_url, '')), coalesce(p_rights_confirmed, false), 'draft')
    returning id into v_id;
  else
    update public.editorial_curations
    set kind = p_kind, title = trim(p_title), description = trim(coalesce(p_description, '')),
        curator_name = trim(coalesce(p_curator_name, '')), source_url = trim(coalesce(p_source_url, '')),
        rights_confirmed = coalesce(p_rights_confirmed, false), status = p_status,
        published_at = case when p_status = 'published' then coalesce(published_at, now()) else null end,
        updated_at = now()
    where id = p_curation_id
    returning id into v_id;
    if v_id is null then raise exception 'curation_not_found'; end if;
  end if;

  insert into public.admin_audit_events (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'editorial_curation_saved', 'editorial_curation', v_id::text, jsonb_build_object('kind', p_kind, 'status', coalesce(p_status, 'draft')));
  return v_id;
end;
$$;

create or replace function public.admin_add_editorial_curation_movie(p_curation_id uuid, p_movie_id uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_next_order integer;
begin
  if not exists (select 1 from public.admin_access where user_id = auth.uid() and role = 'super_admin') then raise exception 'admin_required'; end if;
  if not exists (select 1 from public.editorial_curations where id = p_curation_id) then raise exception 'curation_not_found'; end if;
  if not exists (select 1 from public.movies where id = p_movie_id) then raise exception 'movie_not_found'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'invalid_curation_note'; end if;
  if (select count(*) from public.editorial_curation_items where curation_id = p_curation_id) >= 30 then raise exception 'curation_full'; end if;
  select coalesce(max(sort_order), -1) + 1 into v_next_order from public.editorial_curation_items where curation_id = p_curation_id;
  insert into public.editorial_curation_items (curation_id, movie_id, note, sort_order)
  values (p_curation_id, p_movie_id, trim(coalesce(p_note, '')), v_next_order)
  on conflict (curation_id, movie_id) do update set note = excluded.note;
  update public.editorial_curations set updated_at = now() where id = p_curation_id;
  insert into public.admin_audit_events (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'editorial_curation_movie_added', 'editorial_curation', p_curation_id::text, jsonb_build_object('movie_id', p_movie_id));
end;
$$;

create or replace function public.admin_remove_editorial_curation_movie(p_curation_id uuid, p_movie_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_access where user_id = auth.uid() and role = 'super_admin') then raise exception 'admin_required'; end if;
  delete from public.editorial_curation_items where curation_id = p_curation_id and movie_id = p_movie_id;
  if not found then raise exception 'curation_item_not_found'; end if;
  update public.editorial_curations set status = 'draft', published_at = null, updated_at = now() where id = p_curation_id;
  insert into public.admin_audit_events (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'editorial_curation_movie_removed', 'editorial_curation', p_curation_id::text, jsonb_build_object('movie_id', p_movie_id));
end;
$$;

create or replace function public.admin_delete_editorial_curation(p_curation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_access where user_id = auth.uid() and role = 'super_admin') then raise exception 'admin_required'; end if;
  delete from public.editorial_curations where id = p_curation_id;
  if not found then raise exception 'curation_not_found'; end if;
  insert into public.admin_audit_events (admin_user_id, action, target_type, target_id)
  values (auth.uid(), 'editorial_curation_deleted', 'editorial_curation', p_curation_id::text);
end;
$$;

revoke all on function public.get_discovery_rankings() from public;
revoke all on function public.admin_refresh_discovery_rankings(integer, integer) from public;
revoke all on function public.list_published_curations(integer) from public;
revoke all on function public.get_published_curation(uuid) from public;
revoke all on function public.list_published_curation_items(uuid) from public;
revoke all on function public.admin_list_editorial_curations() from public;
revoke all on function public.admin_list_editorial_curation_items(uuid) from public;
revoke all on function public.admin_save_editorial_curation(uuid, text, text, text, text, text, boolean, text) from public;
revoke all on function public.admin_add_editorial_curation_movie(uuid, uuid, text) from public;
revoke all on function public.admin_remove_editorial_curation_movie(uuid, uuid) from public;
revoke all on function public.admin_delete_editorial_curation(uuid) from public;

grant execute on function public.get_discovery_rankings() to authenticated;
grant execute on function public.admin_refresh_discovery_rankings(integer, integer) to authenticated;
grant execute on function public.list_published_curations(integer) to authenticated;
grant execute on function public.get_published_curation(uuid) to authenticated;
grant execute on function public.list_published_curation_items(uuid) to authenticated;
grant execute on function public.admin_list_editorial_curations() to authenticated;
grant execute on function public.admin_list_editorial_curation_items(uuid) to authenticated;
grant execute on function public.admin_save_editorial_curation(uuid, text, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.admin_add_editorial_curation_movie(uuid, uuid, text) to authenticated;
grant execute on function public.admin_remove_editorial_curation_movie(uuid, uuid) to authenticated;
grant execute on function public.admin_delete_editorial_curation(uuid) to authenticated;

comment on table public.discovery_ranking_runs is 'Manual beta snapshots for explainable recent public-review rankings with a minimum sample guard.';
comment on table public.editorial_curations is 'Admin-authored niche or rights-verified expert movie curation metadata.';
comment on table public.editorial_curation_items is 'Ordered movies and editorial reasons for a published curation.';

-- Rollback: unpublish curations and export editorial data before dropping tables. Ranking snapshots are derived and can be rebuilt.
