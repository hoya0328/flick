create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  locale text not null default 'ko-KR',
  onboarding_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.keywords (
  id text primary key,
  label text not null,
  category text not null check (category in ('mood', 'tone', 'experience')),
  color text not null default '#F2233C',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_keywords (
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword_id text not null references public.keywords(id) on delete cascade,
  weight integer not null default 1 check (weight between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, keyword_id)
);

alter table public.profiles enable row level security;
alter table public.keywords enable row level security;
alter table public.user_keywords enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "keywords_read_authenticated" on public.keywords for select to authenticated using (true);

create policy "user_keywords_select_own" on public.user_keywords for select using (auth.uid() = user_id);
create policy "user_keywords_insert_own" on public.user_keywords for insert with check (auth.uid() = user_id);
create policy "user_keywords_update_own" on public.user_keywords for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_keywords_delete_own" on public.user_keywords for delete using (auth.uid() = user_id);

insert into public.keywords (id, label, category, sort_order)
values
  ('immersive', '몰입감 있는', 'experience', 10),
  ('romantic', '낭만적인', 'mood', 20),
  ('warm', '따뜻한', 'mood', 30),
  ('moving', '뭉클한', 'mood', 40),
  ('witty', '재치 있는', 'tone', 50),
  ('tense', '긴장감 있는', 'experience', 60),
  ('mysterious', '미장센이 좋은', 'experience', 70),
  ('comforting', '위로가 되는', 'mood', 80),
  ('thoughtful', '생각이 깊어지는', 'experience', 90),
  ('refreshing', '산뜻한', 'tone', 100),
  ('unusual', '독특한', 'tone', 110),
  ('nostalgic', '여운이 긴', 'experience', 120)
on conflict (id) do update
set label = excluded.label,
    category = excluded.category,
    sort_order = excluded.sort_order;
