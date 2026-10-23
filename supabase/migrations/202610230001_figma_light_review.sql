-- Additive migration. Existing Core and legacy Light RPCs keep their contracts.
alter table public.reviews add column if not exists light_flow jsonb;
alter table public.reviews drop constraint if exists reviews_rating_check;
alter table public.reviews add constraint reviews_rating_check
  check (rating is null or (rating between 0.5 and 5 and rating * 2 = trunc(rating * 2)));
alter table public.reviews add constraint reviews_light_flow_check
  check (light_flow is null or jsonb_typeof(light_flow) = 'object');

create or replace function public.save_light_review(p_form jsonb, p_review_id uuid, p_complete boolean)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
  v_questions jsonb := p_form->'questions';
  v_tags jsonb;
  v_flow jsonb := p_form->'lightFlow';
  v_rating numeric := (p_form->>'rating')::numeric;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_form->>'mode' <> 'light' or v_flow->>'version' <> '1' then raise exception 'invalid_light_flow'; end if;
  if jsonb_typeof(v_questions) <> 'array' or jsonb_array_length(v_questions) <> 5 then raise exception 'five_questions_required'; end if;
  if v_rating is not null and (v_rating < 0.5 or v_rating > 5 or v_rating * 2 <> trunc(v_rating * 2)) then raise exception 'invalid_rating'; end if;
  if jsonb_typeof(v_flow->'responses') <> 'object' or jsonb_typeof(v_flow->'changed') <> 'array'
    or jsonb_typeof(v_flow->'aspects') <> 'array' or jsonb_typeof(v_flow->'representativeKeywords') <> 'array'
    then raise exception 'invalid_light_state'; end if;
  if jsonb_array_length(v_flow->'representativeKeywords') > 5 or jsonb_array_length(v_flow->'changed') > 5
    or jsonb_array_length(v_flow->'aspects') > 7 or octet_length(v_flow::text) > 12000 then raise exception 'invalid_light_state'; end if;
  if exists (select 1 from jsonb_array_elements_text(v_flow->'representativeKeywords') word where char_length(trim(word)) not between 1 and 30) then raise exception 'invalid_keyword'; end if;
  if jsonb_typeof(p_form->'questionTags') <> 'object' then raise exception 'invalid_tags'; end if;
  if exists (select 1 from jsonb_each(p_form->'questionTags') item where jsonb_typeof(item.value) <> 'array') then raise exception 'invalid_tags'; end if;
  if exists (select 1 from jsonb_each(p_form->'questionTags') item where jsonb_array_length(item.value) > 3) then raise exception 'too_many_question_tags'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('questionKey', q->>'key', 'tagId', tag.value, 'sortOrder', tag.ordinality)), '[]'::jsonb)
    into v_tags from jsonb_array_elements(v_questions) q
    cross join lateral jsonb_array_elements_text(coalesce(p_form->'questionTags'->(q->>'key'), '[]'::jsonb)) with ordinality tag(value, ordinality);
  if p_complete then
    if v_rating is null then raise exception 'rating_required'; end if;
    if exists (
      select 1 from jsonb_array_elements(v_questions) q where
        not coalesce((v_flow->'responses'->>(q->>'key') = 'skipped' and jsonb_array_length(coalesce(p_form->'questionTags'->(q->>'key'), '[]')) = 0)
        or (v_flow->'responses'->>(q->>'key') = 'answered' and jsonb_array_length(coalesce(p_form->'questionTags'->(q->>'key'), '[]')) between 1 and 3), false)
    ) then raise exception 'five_responses_required'; end if;
    if jsonb_array_length(v_tags) = 0 and char_length(trim(coalesce(p_form->>'body', ''))) = 0 then raise exception 'review_content_required'; end if;
    if char_length(coalesce(p_form->>'body', '')) > 500 then raise exception 'body_too_long'; end if;
  end if;
  -- Reuse the established owner-checked transactional writer as a draft. Its
  -- legacy minimum rating is 1; set the actual half-star value in this transaction.
  v_id := public.save_review_record(
    (p_form->>'movieId')::uuid, 'light', (p_form->>'watchedAt')::date,
    case when v_rating is null then null else greatest(1, v_rating) end,
    coalesce(p_form->>'body', ''), coalesce(p_form->>'oneLine', ''), coalesce((p_form->>'spoiler')::boolean, false),
    coalesce(p_form->>'visibility', 'private'), '{}'::jsonb, '{}'::text[], false, p_review_id, v_questions, v_tags
  );
  if p_complete and (select count(*) from public.review_answer_tags where review_id = v_id) <> jsonb_array_length(v_tags) then
    raise exception 'invalid_selected_tags';
  end if;
  update public.reviews set rating = v_rating, light_flow = v_flow,
    status = case when p_complete then 'completed' else 'draft' end,
    completed_at = case when p_complete then coalesce(completed_at, now()) else null end,
    updated_at = now() where id = v_id and user_id = auth.uid();
  return v_id;
end;
$$;
revoke all on function public.save_light_review(jsonb, uuid, boolean) from public, anon;
grant execute on function public.save_light_review(jsonb, uuid, boolean) to authenticated;
comment on column public.reviews.light_flow is 'Figma Light v1: explicit skipped/answered states, one-change flags, aspects and editable representative keywords. Existing owner RLS applies.';
-- Rollback UI to tag rollback/review-before-figma-2026-10-23. Keep this additive
-- column and RPC to preserve newly written records; do not drop user data.
