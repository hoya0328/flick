create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'tmdb',
  provider_id text not null,
  title text not null,
  original_title text,
  overview text not null default '',
  poster_path text,
  release_date date,
  runtime integer check (runtime is null or runtime > 0),
  genres text[] not null default '{}',
  recommendation_keywords text[] not null default '{}',
  vote_average numeric(3, 1) check (vote_average is null or vote_average between 0 and 10),
  metadata jsonb not null default '{}'::jsonb,
  cached_at timestamptz not null default now(),
  unique (provider, provider_id)
);

create table if not exists public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  status text not null default 'want_to_watch' check (status in ('want_to_watch', 'watched')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

alter table public.movies enable row level security;
alter table public.watchlist enable row level security;

create policy "movies_read_authenticated" on public.movies
  for select to authenticated using (true);

create policy "watchlist_select_own" on public.watchlist
  for select to authenticated using (auth.uid() = user_id);
create policy "watchlist_insert_own" on public.watchlist
  for insert to authenticated with check (auth.uid() = user_id);
create policy "watchlist_update_own" on public.watchlist
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "watchlist_delete_own" on public.watchlist
  for delete to authenticated using (auth.uid() = user_id);

grant select on public.movies to authenticated;
grant select, insert, update, delete on public.watchlist to authenticated;

insert into public.movies (
  id, provider, provider_id, title, original_title, overview, release_date, runtime,
  genres, recommendation_keywords, vote_average, metadata
)
values
  ('10000000-0000-4000-8000-000000000001', 'tmdb', '27205', '인셉션', 'Inception',
   '타인의 꿈에 들어가 생각을 훔치는 특수 보안 요원이 마지막 임무에서 생각을 심는 불가능한 도전에 나선다.',
   '2010-07-15', 148, array['SF', '스릴러'], array['immersive', 'thoughtful', 'tense', 'mysterious'], 8.4, '{"seed": true}'),
  ('10000000-0000-4000-8000-000000000002', 'tmdb', '313369', '라라랜드', 'La La Land',
   '꿈을 좇는 재즈 피아니스트와 배우 지망생이 사랑과 선택의 순간을 함께 통과한다.',
   '2016-12-09', 129, array['로맨스', '드라마'], array['romantic', 'moving', 'nostalgic'], 7.9, '{"seed": true}'),
  ('10000000-0000-4000-8000-000000000003', 'tmdb', '452166', '리틀 포레스트', 'Little Forest',
   '도시 생활에 지친 혜원이 고향으로 돌아와 사계절의 음식과 오래된 관계 속에서 자신을 회복한다.',
   '2018-02-28', 103, array['드라마'], array['warm', 'comforting', 'nostalgic'], 7.7, '{"seed": true}'),
  ('10000000-0000-4000-8000-000000000004', 'tmdb', '496243', '기생충', 'Parasite',
   '서로 다른 환경에 사는 두 가족이 예상하지 못한 방식으로 얽히며 균열이 시작된다.',
   '2019-05-30', 132, array['드라마', '스릴러'], array['tense', 'thoughtful', 'unusual'], 8.5, '{"seed": true}'),
  ('10000000-0000-4000-8000-000000000005', 'tmdb', '666277', '패스트 라이브즈', 'Past Lives',
   '어린 시절 헤어진 두 사람이 오랜 시간이 지나 뉴욕에서 다시 만나 삶의 인연과 선택을 돌아본다.',
   '2023-06-02', 106, array['드라마', '로맨스'], array['romantic', 'thoughtful', 'nostalgic'], 7.8, '{"seed": true}'),
  ('10000000-0000-4000-8000-000000000006', 'tmdb', '120467', '그랜드 부다페스트 호텔', 'The Grand Budapest Hotel',
   '전설적인 호텔 지배인과 로비 보이가 그림 도난과 유산 분쟁에 휘말리는 기묘하고 우아한 모험.',
   '2014-02-26', 100, array['코미디', '모험'], array['witty', 'mysterious', 'unusual'], 8.0, '{"seed": true}'),
  ('10000000-0000-4000-8000-000000000007', 'tmdb', '244786', '위플래쉬', 'Whiplash',
   '최고의 드러머를 꿈꾸는 학생이 완벽을 강요하는 지휘자와 극한의 긴장 속에서 맞선다.',
   '2014-10-10', 107, array['드라마', '음악'], array['immersive', 'tense', 'thoughtful'], 8.4, '{"seed": true}'),
  ('10000000-0000-4000-8000-000000000008', 'tmdb', '545611', '에브리씽 에브리웨어 올 앳 원스', 'Everything Everywhere All at Once',
   '평범한 세탁소 주인이 다중 우주를 넘나들며 가족과 삶의 의미를 다시 선택한다.',
   '2022-03-24', 140, array['SF', '코미디'], array['unusual', 'moving', 'witty', 'thoughtful'], 7.7, '{"seed": true}')
on conflict (provider, provider_id) do update
set title = excluded.title,
    original_title = excluded.original_title,
    overview = excluded.overview,
    release_date = excluded.release_date,
    runtime = excluded.runtime,
    genres = excluded.genres,
    recommendation_keywords = excluded.recommendation_keywords,
    vote_average = excluded.vote_average,
    metadata = public.movies.metadata || excluded.metadata,
    cached_at = now();

-- Rollback note: drop watchlist first, then movies. Preserve these tables once real user data exists.
