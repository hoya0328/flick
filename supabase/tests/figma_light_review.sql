-- Run in the SQL editor as postgres. All QA writes are rolled back.
begin;
do $$
declare
  v_owner uuid;
  v_movie uuid;
  v_form jsonb;
  v_id uuid;
  v_count integer;
begin
  select id into v_owner from auth.users order by created_at limit 1;
  select id into v_movie from public.movies m where not exists (
    select 1 from public.reviews r where r.movie_id = m.id and r.user_id = v_owner and r.status = 'draft'
  ) limit 1;
  if v_owner is null or v_movie is null then raise exception 'QA_fixture_missing'; end if;
  select jsonb_build_object(
    'movieId', v_movie, 'mode', 'light', 'watchedAt', current_date::text, 'rating', 0.5,
    'body', '트랜잭션으로만 검증하는 QA 감상입니다.', 'oneLine', '', 'spoiler', false, 'visibility', 'private',
    'questions', jsonb_agg(jsonb_build_object('key', 'light_q' || n, 'text', 'QA 질문 ' || n, 'sourceRule', 'figma-light-v1', 'options', jsonb_build_array(jsonb_build_object('id', 'test', 'label', '몽환적인')))),
    'questionTags', '{}'::jsonb,
    'lightFlow', jsonb_build_object('version', 1, 'responses', jsonb_object_agg('light_q' || n, 'skipped'), 'changed', '[]'::jsonb, 'aspects', '[]'::jsonb, 'representativeKeywords', '[]'::jsonb, 'draftSource', 'manual')
  ) into v_form from generate_series(1, 5) n;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('role', 'authenticated', true);
  v_id := public.save_light_review(v_form, null, true);
  if not exists (select 1 from public.reviews where id = v_id and user_id = v_owner and rating = 0.5 and status = 'completed' and visibility = 'private' and light_flow->>'version' = '1') then raise exception 'QA_saved_state_failed'; end if;
  select count(*) into v_count from public.review_questions where review_id = v_id;
  if v_count <> 5 then raise exception 'QA_question_snapshot_failed'; end if;
  begin
    perform public.save_light_review(jsonb_set(v_form, '{rating}', '0.6'), v_id, true);
    raise exception 'QA_invalid_rating_accepted';
  exception when others then
    if sqlerrm <> 'invalid_rating' then raise; end if;
  end;
  begin
    perform public.save_light_review(jsonb_set(v_form, '{body}', '""'), v_id, true);
    raise exception 'QA_empty_review_accepted';
  exception when others then
    if sqlerrm <> 'review_content_required' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000099', true);
  if exists (select 1 from public.reviews where id = v_id) then raise exception 'QA_private_read_leak'; end if;
  begin
    perform public.save_light_review(v_form, v_id, true);
    raise exception 'QA_foreign_edit_accepted';
  exception when others then
    if sqlerrm <> 'review_not_found' then raise; end if;
  end;
  perform set_config('role', 'postgres', true);
end;
$$;
select 'PASS: half-star save, five skips, empty validation, invalid rating, owner RLS; all QA writes rolled back' as result;
rollback;
