create table if not exists public.review_questions (
  review_id uuid not null references public.reviews(id) on delete cascade,
  question_key text not null check (char_length(question_key) between 1 and 80),
  question_text text not null check (char_length(question_text) between 1 and 400),
  source_rule text not null check (char_length(source_rule) between 1 and 80),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (review_id, question_key)
);

create table if not exists public.review_answer_tags (
  review_id uuid not null references public.reviews(id) on delete cascade,
  question_key text not null,
  tag_id text not null check (char_length(tag_id) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (review_id, question_key, tag_id),
  foreign key (review_id, question_key)
    references public.review_questions(review_id, question_key) on delete cascade
);

alter table public.review_questions enable row level security;
alter table public.review_answer_tags enable row level security;

drop policy if exists "review_questions_select_own" on public.review_questions;
create policy "review_questions_select_own" on public.review_questions
  for select to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_questions.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_questions_insert_own" on public.review_questions;
create policy "review_questions_insert_own" on public.review_questions
  for insert to authenticated with check (
    exists (select 1 from public.reviews where reviews.id = review_questions.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_questions_update_own" on public.review_questions;
create policy "review_questions_update_own" on public.review_questions
  for update to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_questions.review_id and reviews.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.reviews where reviews.id = review_questions.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_questions_delete_own" on public.review_questions;
create policy "review_questions_delete_own" on public.review_questions
  for delete to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_questions.review_id and reviews.user_id = auth.uid())
  );

drop policy if exists "review_answer_tags_select_own" on public.review_answer_tags;
create policy "review_answer_tags_select_own" on public.review_answer_tags
  for select to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_answer_tags.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_answer_tags_insert_own" on public.review_answer_tags;
create policy "review_answer_tags_insert_own" on public.review_answer_tags
  for insert to authenticated with check (
    exists (select 1 from public.reviews where reviews.id = review_answer_tags.review_id and reviews.user_id = auth.uid())
  );
drop policy if exists "review_answer_tags_delete_own" on public.review_answer_tags;
create policy "review_answer_tags_delete_own" on public.review_answer_tags
  for delete to authenticated using (
    exists (select 1 from public.reviews where reviews.id = review_answer_tags.review_id and reviews.user_id = auth.uid())
  );

grant select, insert, update, delete on public.review_questions to authenticated;
grant select, insert, delete on public.review_answer_tags to authenticated;

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
  p_review_id uuid,
  p_questions jsonb,
  p_question_tags jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_review_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_mode not in ('light', 'core') then raise exception 'invalid_mode'; end if;
  if p_watched_at is null or p_watched_at > (now() at time zone 'Asia/Seoul')::date then raise exception 'invalid_watched_at'; end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then raise exception 'invalid_rating'; end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then raise exception 'invalid_answers'; end if;
  if jsonb_typeof(coalesce(p_questions, '[]'::jsonb)) <> 'array' then raise exception 'invalid_questions'; end if;
  if jsonb_typeof(coalesce(p_question_tags, '[]'::jsonb)) <> 'array' then raise exception 'invalid_question_tags'; end if;
  if jsonb_array_length(coalesce(p_questions, '[]'::jsonb)) > 5 then raise exception 'too_many_questions'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_question_tags, '[]'::jsonb)) tag
    group by tag->>'questionKey' having count(*) > 3
  ) then raise exception 'too_many_question_tags'; end if;
  if p_complete and p_mode = 'light' then
    if jsonb_array_length(coalesce(p_questions, '[]'::jsonb)) <> 5 then raise exception 'five_questions_required'; end if;
    if (select count(distinct tag->>'questionKey') from jsonb_array_elements(coalesce(p_question_tags, '[]'::jsonb)) tag where length(trim(tag->>'tagId')) > 0) < 3 then
      raise exception 'three_tagged_questions_required';
    end if;
  end if;

  if p_review_id is not null then
    select id into v_review_id from public.reviews
      where id = p_review_id and user_id = v_user_id for update;
    if v_review_id is null then raise exception 'review_not_found'; end if;
  else
    select id into v_review_id from public.reviews
      where user_id = v_user_id and movie_id = p_movie_id and status = 'draft'
      order by updated_at desc limit 1 for update;
  end if;

  if v_review_id is null then
    insert into public.reviews (user_id, movie_id, mode, watched_at, rating, body, one_line, spoiler)
    values (v_user_id, p_movie_id, p_mode, p_watched_at, p_rating, left(coalesce(p_body, ''), 10000), left(coalesce(p_one_line, ''), 280), coalesce(p_spoiler, false))
    returning id into v_review_id;
  else
    update public.reviews set
      movie_id = p_movie_id, mode = p_mode, watched_at = p_watched_at, rating = p_rating,
      body = left(coalesce(p_body, ''), 10000), one_line = left(coalesce(p_one_line, ''), 280),
      spoiler = coalesce(p_spoiler, false), updated_at = now()
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

  delete from public.review_questions where review_id = v_review_id;
  insert into public.review_questions (review_id, question_key, question_text, source_rule, options, sort_order)
  select
    v_review_id,
    left(question.value->>'key', 80),
    left(question.value->>'text', 400),
    left(coalesce(question.value->>'sourceRule', 'metadata-v1'), 80),
    coalesce(question.value->'options', '[]'::jsonb),
    coalesce((question.value->>'sortOrder')::integer, question.ordinality::integer)
  from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) with ordinality as question(value, ordinality)
  where length(trim(question.value->>'key')) > 0
    and length(trim(question.value->>'text')) > 0
    and jsonb_typeof(coalesce(question.value->'options', '[]'::jsonb)) = 'array';

  insert into public.review_answer_tags (review_id, question_key, tag_id, sort_order)
  select
    v_review_id,
    left(tag.value->>'questionKey', 80),
    left(tag.value->>'tagId', 80),
    coalesce((tag.value->>'sortOrder')::integer, tag.ordinality::integer)
  from jsonb_array_elements(coalesce(p_question_tags, '[]'::jsonb)) with ordinality as tag(value, ordinality)
  join public.review_questions question
    on question.review_id = v_review_id and question.question_key = tag.value->>'questionKey'
  where length(trim(tag.value->>'tagId')) > 0
    and exists (
      select 1 from jsonb_array_elements(question.options) option
      where option->>'id' = tag.value->>'tagId'
    )
  on conflict do nothing;

  if p_complete and p_mode = 'light' then
    if (select count(*) from public.review_questions where review_id = v_review_id) <> 5 then
      raise exception 'five_valid_questions_required';
    end if;
    if (select count(distinct question_key) from public.review_answer_tags where review_id = v_review_id) < 3 then
      raise exception 'three_valid_tagged_questions_required';
    end if;
  end if;

  update public.reviews set
    status = case when p_complete then 'completed' else 'draft' end,
    completed_at = case when p_complete then coalesce(completed_at, now()) else null end,
    updated_at = now()
  where id = v_review_id and user_id = v_user_id;

  return v_review_id;
end;
$$;

revoke all on function public.save_review_record(uuid, text, date, numeric, text, text, boolean, jsonb, text[], boolean, uuid, jsonb, jsonb) from public;
grant execute on function public.save_review_record(uuid, text, date, numeric, text, text, boolean, jsonb, text[], boolean, uuid, jsonb, jsonb) to authenticated;

comment on table public.review_questions is 'Snapshot of five deterministic, movie-aware Light questions and their available tag options.';
comment on table public.review_answer_tags is 'User-selected feeling tags for each Light question; maximum three is enforced by the save RPC and client.';
comment on function public.save_review_record(uuid, text, date, numeric, text, text, boolean, jsonb, text[], boolean, uuid, jsonb, jsonb) is
  'Atomically saves a review, text answers, keywords, deterministic Light questions, and selected per-question tags.';

-- Backward-compatible note: the stage 3A/3B RPC overload remains available until older Preview clients are retired.
-- Rollback note: preserve and export user tag selections before removing these tables or the new RPC overload.
