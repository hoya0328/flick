alter table public.movies
  add column if not exists is_active boolean not null default true,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists details_status text not null default 'summary'
    check (details_status in ('summary', 'complete', 'source_incomplete', 'failed')),
  add column if not exists details_fetched_at timestamptz;

create table if not exists public.movie_details (
  movie_id uuid primary key references public.movies(id) on delete cascade,
  tagline text,
  backdrop_path text,
  publication_status text,
  original_language text,
  homepage text,
  imdb_id text,
  budget bigint check (budget is null or budget >= 0),
  revenue bigint check (revenue is null or revenue >= 0),
  belongs_to_collection jsonb,
  production_companies jsonb not null default '[]'::jsonb,
  production_countries jsonb not null default '[]'::jsonb,
  spoken_languages jsonb not null default '[]'::jsonb,
  credits jsonb not null default '{"cast":[],"crew":[]}'::jsonb,
  images jsonb not null default '{"backdrops":[],"logos":[],"posters":[]}'::jsonb,
  videos jsonb not null default '{"results":[]}'::jsonb,
  keywords jsonb not null default '{"keywords":[]}'::jsonb,
  alternative_titles jsonb not null default '{"titles":[]}'::jsonb,
  translations jsonb not null default '{"translations":[]}'::jsonb,
  release_dates jsonb not null default '{"results":[]}'::jsonb,
  external_ids jsonb not null default '{}'::jsonb,
  watch_providers jsonb not null default '{"results":{}}'::jsonb,
  recommendations jsonb not null default '{"results":[]}'::jsonb,
  similar_movies jsonb not null default '{"results":[]}'::jsonb,
  completeness jsonb not null default '{}'::jsonb,
  provider_payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  last_error text
);

create table if not exists public.tmdb_catalog (
  tmdb_id bigint primary key,
  original_title text not null,
  popularity real not null default 0,
  adult boolean not null default false,
  video boolean not null default false,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  indexed_at timestamptz not null default now()
);

create index if not exists movies_details_status_idx on public.movies(details_status);
create index if not exists movies_last_seen_at_idx on public.movies(last_seen_at desc);
create index if not exists movie_details_expires_at_idx on public.movie_details(expires_at);
create index if not exists tmdb_catalog_original_title_idx on public.tmdb_catalog using gin (to_tsvector('simple', original_title));

alter table public.movie_details enable row level security;
alter table public.tmdb_catalog enable row level security;

drop policy if exists "movie_details_read_authenticated" on public.movie_details;
create policy "movie_details_read_authenticated" on public.movie_details
  for select to authenticated using (true);
drop policy if exists "tmdb_catalog_read_authenticated" on public.tmdb_catalog;
create policy "tmdb_catalog_read_authenticated" on public.tmdb_catalog
  for select to authenticated using (adult = false and video = false and is_active = true);

grant select on public.movie_details to authenticated;
grant select on public.tmdb_catalog to authenticated;

comment on table public.tmdb_catalog is
  'Lightweight TMDB ID index. Do not bulk import on the Free plan until projected database size is approved.';
comment on table public.movie_details is
  'Provider-owned detail cache. User reviews and watchlist rows continue to reference public.movies.id.';

-- Rollback note: preserve public.movies and user-owned references. movie_details may be dropped only after export.
