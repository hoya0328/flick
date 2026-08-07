alter table public.reviews drop constraint if exists reviews_visibility_check;
alter table public.reviews add constraint reviews_visibility_check
  check (visibility in ('private', 'public'));

create index if not exists reviews_public_completed_idx
  on public.reviews(updated_at desc) where visibility = 'public' and status = 'completed';

drop policy if exists "reviews_select_own" on public.reviews;
drop policy if exists "reviews_select_visible" on public.reviews;
create policy "reviews_select_visible" on public.reviews
  for select to authenticated using (
    auth.uid() = user_id or (visibility = 'public' and status = 'completed')
  );

drop policy if exists "review_answers_select_own" on public.review_answers;
drop policy if exists "review_answers_select_visible" on public.review_answers;
create policy "review_answers_select_visible" on public.review_answers
  for select to authenticated using (
    exists (
      select 1 from public.reviews
      where reviews.id = review_answers.review_id
        and (reviews.user_id = auth.uid() or (reviews.visibility = 'public' and reviews.status = 'completed'))
    )
  );

drop policy if exists "review_keywords_select_own" on public.review_keywords;
drop policy if exists "review_keywords_select_visible" on public.review_keywords;
create policy "review_keywords_select_visible" on public.review_keywords
  for select to authenticated using (
    exists (
      select 1 from public.reviews
      where reviews.id = review_keywords.review_id
        and (reviews.user_id = auth.uid() or (reviews.visibility = 'public' and reviews.status = 'completed'))
    )
  );

drop policy if exists "review_questions_select_own" on public.review_questions;
drop policy if exists "review_questions_select_visible" on public.review_questions;
create policy "review_questions_select_visible" on public.review_questions
  for select to authenticated using (
    exists (
      select 1 from public.reviews
      where reviews.id = review_questions.review_id
        and (reviews.user_id = auth.uid() or (reviews.visibility = 'public' and reviews.status = 'completed'))
    )
  );

drop policy if exists "review_answer_tags_select_own" on public.review_answer_tags;
drop policy if exists "review_answer_tags_select_visible" on public.review_answer_tags;
create policy "review_answer_tags_select_visible" on public.review_answer_tags
  for select to authenticated using (
    exists (
      select 1 from public.reviews
      where reviews.id = review_answer_tags.review_id
        and (reviews.user_id = auth.uid() or (reviews.visibility = 'public' and reviews.status = 'completed'))
    )
  );

create or replace function public.save_review_record(
  p_movie_id uuid,
  p_mode text,
  p_watched_at date,
  p_rating numeric,
  p_body text,
  p_one_line text,
  p_spoiler boolean,
  p_visibility text,
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
  v_review_id uuid;
begin
  if p_visibility not in ('private', 'public') then raise exception 'invalid_visibility'; end if;

  v_review_id := public.save_review_record(
    p_movie_id, p_mode, p_watched_at, p_rating, p_body, p_one_line, p_spoiler,
    p_answers, p_keyword_ids, p_complete, p_review_id, p_questions, p_question_tags
  );

  if p_complete and p_mode = 'core' then
    if (select count(*) from public.review_questions where review_id = v_review_id and question_key like 'core_q%') <> 5 then
      raise exception 'five_core_questions_required';
    end if;
    if (
      select count(*) from public.review_answers answer
      join public.review_questions question
        on question.review_id = answer.review_id and question.question_key = answer.question_key
      where answer.review_id = v_review_id
        and question.question_key like 'core_q%'
        and char_length(trim(answer.answer)) >= 20
    ) <> 5 then
      raise exception 'five_core_answers_required';
    end if;
  end if;

  update public.reviews
    set visibility = p_visibility, updated_at = now()
    where id = v_review_id and user_id = auth.uid();

  return v_review_id;
end;
$$;

revoke all on function public.save_review_record(uuid, text, date, numeric, text, text, boolean, text, jsonb, text[], boolean, uuid, jsonb, jsonb) from public;
grant execute on function public.save_review_record(uuid, text, date, numeric, text, text, boolean, text, jsonb, text[], boolean, uuid, jsonb, jsonb) to authenticated;

comment on column public.reviews.visibility is
  'private is owner-only; public is readable by authenticated Flick users only after completion. Drafts remain effectively private.';
comment on function public.save_review_record(uuid, text, date, numeric, text, text, boolean, text, jsonb, text[], boolean, uuid, jsonb, jsonb) is
  'Stage 3C test save contract with private/public visibility and five validated Core question answers.';

-- Backward compatibility: prior RPC overloads remain private by default for deployed older clients.
-- Rollback: restore owner-only SELECT policies before narrowing visibility values back to private.
