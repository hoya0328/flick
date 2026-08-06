create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id),
  mode text not null check (mode in ('light', 'core')),
  watched_at date not null default (now() at time zone 'Asia/Seoul')::date,
  rating numeric(2, 1) check (rating is null or rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 10000),
  one_line text not null default '' check (char_length(one_line) <= 280),
  spoiler boolean not null default false,
  visibility text not null default 'private' check (visibility = 'private'),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_answers (
  review_id uuid not null references public.reviews(id) on delete cascade,
  question_key text not null check (char_length(question_key) between 1 and 80),
  answer text not null check (char_length(answer) between 1 and 2000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (review_id, question_key)
);

create table if not exists public.review_keywords (
  review_id uuid not null references public.reviews(id) on delete cascade,
  keyword_id text not null references public.keywords(id),
  source text not null default 'user' check (source in ('user', 'ai')),
  created_at timestamptz not null default now(),
  primary key (review_id, keyword_id)
);

create unique index if not exists reviews_one_draft_per_movie_idx
  on public.reviews(user_id, movie_id) where status = 'draft';
create index if not exists reviews_user_updated_idx
  on public.reviews(user_id, updated_at desc);
create index if not exists reviews_movie_idx on public.reviews(movie_id);

alter table public.reviews drop constraint if exists reviews_watched_at_check;
alter table public.reviews add constraint reviews_watched_at_check
  check (watched_at <= (now() at time zone 'Asia/Seoul')::date);

alter table public.reviews enable row level security;
alter table public.review_answers enable row level security;
alter table public.review_keywords enable row level security;

drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own" on public.reviews
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "review_answers_select_own" on public.review_answers;
create policy "review_answers_select_own" on public.review_answers
  for select to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_answers.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_answers_insert_own" on public.review_answers;
create policy "review_answers_insert_own" on public.review_answers
  for insert to authenticated with check (
    exists (select 1 from public.reviews where reviews.id = review_answers.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_answers_update_own" on public.review_answers;
create policy "review_answers_update_own" on public.review_answers
  for update to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_answers.review_id and reviews.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.reviews where reviews.id = review_answers.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_answers_delete_own" on public.review_answers;
create policy "review_answers_delete_own" on public.review_answers
  for delete to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_answers.review_id and reviews.user_id = auth.uid())
  );

drop policy if exists "review_keywords_select_own" on public.review_keywords;
create policy "review_keywords_select_own" on public.review_keywords
  for select to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_keywords.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_keywords_insert_own" on public.review_keywords;
create policy "review_keywords_insert_own" on public.review_keywords
  for insert to authenticated with check (
    exists (select 1 from public.reviews where reviews.id = review_keywords.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_keywords_delete_own" on public.review_keywords;
create policy "review_keywords_delete_own" on public.review_keywords
  for delete to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_keywords.review_id and reviews.user_id = auth.uid())
  );

grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.review_answers to authenticated;
grant select, insert, delete on public.review_keywords to authenticated;

create or replace function public.save_review_record(
  p_movie_id uuid,
  p_mode text,
  p_watched_at date,
  p_rating numeric,
  p_body text,
  p_one_line text,
  p_spoiler boolean,
  p_answers jsonb,
  p_keyword_ids text[],
  p_complete boolean,
  p_review_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_review_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_mode not in ('light', 'core') then
    raise exception 'invalid_mode';
  end if;
  if p_watched_at is null or p_watched_at > (now() at time zone 'Asia/Seoul')::date then
    raise exception 'invalid_watched_at';
  end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'invalid_rating';
  end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_answers';
  end if;

  if p_review_id is not null then
    select id into v_review_id
      from public.reviews
      where id = p_review_id and user_id = v_user_id
      for update;
    if v_review_id is null then raise exception 'review_not_found'; end if;
  else
    select id into v_review_id
      from public.reviews
      where user_id = v_user_id and movie_id = p_movie_id and status = 'draft'
      order by updated_at desc
      limit 1
      for update;
  end if;

  if v_review_id is null then
    insert into public.reviews (user_id, movie_id, mode, watched_at, rating, body, one_line, spoiler)
    values (
      v_user_id, p_movie_id, p_mode, p_watched_at, p_rating,
      left(coalesce(p_body, ''), 10000), left(coalesce(p_one_line, ''), 280), coalesce(p_spoiler, false)
    ) returning id into v_review_id;
  else
    update public.reviews
      set movie_id = p_movie_id,
          mode = p_mode,
          watched_at = p_watched_at,
          rating = p_rating,
          body = left(coalesce(p_body, ''), 10000),
          one_line = left(coalesce(p_one_line, ''), 280),
          spoiler = coalesce(p_spoiler, false),
          updated_at = now()
      where id = v_review_id and user_id = v_user_id;
  end if;

  delete from public.review_answers where review_id = v_review_id;
  insert into public.review_answers (review_id, question_key, answer, sort_order)
  select v_review_id, entry.key, left(entry.value, 2000), row_number() over (order by entry.key)::integer
  from jsonb_each_text(coalesce(p_answers, '{}'::jsonb)) as entry
  where length(trim(entry.value)) > 0;

  delete from public.review_keywords where review_id = v_review_id;
  insert into public.review_keywords (review_id, keyword_id, source)
  select v_review_id, selected.keyword_id, 'user'
  from unnest(coalesce(p_keyword_ids, '{}'::text[])) as selected(keyword_id)
  where exists (select 1 from public.keywords where keywords.id = selected.keyword_id)
  on conflict do nothing;

  update public.reviews
    set status = case when p_complete then 'completed' else 'draft' end,
        completed_at = case when p_complete then coalesce(completed_at, now()) else null end,
        updated_at = now()
    where id = v_review_id and user_id = v_user_id;

  return v_review_id;
end;
$$;

revoke all on function public.save_review_record(uuid, text, date, numeric, text, text, boolean, jsonb, text[], boolean, uuid) from public;
grant execute on function public.save_review_record(uuid, text, date, numeric, text, text, boolean, jsonb, text[], boolean, uuid) to authenticated;

comment on table public.reviews is
  'User-owned Light/Core movie records. Drafts autosave; completed records remain private in stage 3A/3B.';
comment on function public.save_review_record is
  'Atomically saves a review, answers, and user-selected keywords under the caller RLS context.';

-- Rollback note: never drop review tables after real user data exists. Export first, then remove child tables before reviews.
