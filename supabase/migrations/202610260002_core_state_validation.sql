-- Harden untrusted JSON types and check ownership before examining attachments.
-- Additive RPC replacement; no rows, columns, permissions or policies removed.
create or replace function public.save_core_review(p_form jsonb, p_review_id uuid, p_complete boolean)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
  v_flow jsonb := p_form->'coreFlow';
  v_questions jsonb := p_form->'questions';
  v_answers jsonb := p_form->'answers';
  v_rating numeric := (p_form->>'rating')::numeric;
  v_body text;
  v_title text := coalesce(v_flow->>'title', '');
  v_photos text[];
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_review_id is not null and not exists(select 1 from public.reviews where id=p_review_id and user_id=auth.uid()) then raise exception 'review_not_found'; end if;
  if p_complete is null or p_form->>'mode' is distinct from 'core' or v_flow->>'version' is distinct from '1'
    or jsonb_typeof(v_questions) is distinct from 'array' or jsonb_typeof(v_answers) is distinct from 'object'
    or jsonb_typeof(v_flow->'blocks') is distinct from 'array'
    or jsonb_typeof(v_flow->'changed') is distinct from 'array'
    or jsonb_typeof(v_flow->'keywords') is distinct from 'array'
    or jsonb_typeof(v_flow->'feedback') is distinct from 'object'
    or jsonb_typeof(v_flow->'nextQuestions') is distinct from 'object'
    or jsonb_typeof(v_flow->'title') is distinct from 'string'
    or jsonb_typeof(v_flow->'index') is distinct from 'number'
    or jsonb_typeof(v_flow->'stage') is distinct from 'string'
    or jsonb_typeof(v_flow->'source') is distinct from 'string'
    then raise exception 'invalid_core_state'; end if;
  if jsonb_array_length(v_questions) not between 1 and 5
    or jsonb_array_length(v_flow->'blocks') > 20 or jsonb_array_length(v_flow->'changed') > 5
    or jsonb_array_length(v_flow->'keywords') > 5 or octet_length(v_flow::text) > 24000
    or (v_flow->>'index')::numeric <> trunc((v_flow->>'index')::numeric)
    or (v_flow->>'index')::int not between 0 and jsonb_array_length(v_questions)-1
    or v_flow->>'stage' not in ('question', 'feedback', 'summary')
    or v_flow->>'source' not in ('manual', 'gemini')
    then raise exception 'invalid_core_state'; end if;
  if exists (select 1 from jsonb_array_elements(v_questions) with ordinality q(value,n)
    where q.value->>'key' is distinct from 'core_q' || q.n::text or jsonb_typeof(q.value->'text') is distinct from 'string' or char_length(q.value->>'text') not between 10 and 400)
    or exists (select 1 from jsonb_each_text(v_answers) a where a.key !~ '^core_q[1-5]$' or char_length(a.value) > 1000)
    or exists (select 1 from jsonb_array_elements_text(v_flow->'changed') k where k !~ '^core_q[1-5]$')
    or exists (select 1 from jsonb_array_elements_text(v_flow->'keywords') k where char_length(trim(k)) not between 1 and 40)
    then raise exception 'invalid_core_answers'; end if;
  if exists (select 1 from jsonb_array_elements(v_flow->'blocks') b
    where jsonb_typeof(b->'text') is distinct from 'string' or char_length(b->>'text') > 1000
      or coalesce(b->>'kind','') not in ('paragraph','list','quote') or coalesce(b->>'size','') not in ('15','18','20')
      or jsonb_typeof(b->'id') is distinct from 'string' or char_length(b->>'id') not between 1 and 80
      or jsonb_typeof(b->'bold') is distinct from 'boolean' or jsonb_typeof(b->'italic') is distinct from 'boolean')
    then raise exception 'invalid_magazine_blocks'; end if;
  select coalesce(string_agg(btrim(b.value->>'text', E' \t\n\r'), E'\n\n' order by b.n) filter (where btrim(b.value->>'text', E' \t\n\r') <> ''),'')
    into v_body from jsonb_array_elements(v_flow->'blocks') with ordinality b(value,n);
  if coalesce(p_form->>'body','') <> v_body or coalesce(p_form->>'oneLine','') <> v_title
    or char_length(v_title) > 80 or char_length(concat_ws(E'\n\n',nullif(trim(v_title),''),nullif(v_body,''))) > 1000
    then raise exception 'invalid_magazine_length'; end if;
  select array_agg(path) into v_photos from (
    select v_flow->>'cover' as path union all
    select b->>'photo' from jsonb_array_elements(v_flow->'blocks') b
  ) x where path is not null;
  if coalesce(array_length(v_photos,1),0) > 4 or exists (
    select 1 from unnest(v_photos) path where path !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.jpg$')
      or not exists (select 1 from storage.objects o where o.bucket_id='core-photos' and o.name=path and o.owner_id=auth.uid()::text)
  ) then raise exception 'invalid_owned_photo'; end if;
  if v_rating is not null and (v_rating not between 0.5 and 5 or v_rating*2 <> trunc(v_rating*2)) then raise exception 'invalid_rating'; end if;
  if p_complete then
    if v_rating is null or trim(v_title)='' or v_body='' then raise exception 'review_content_required'; end if;
    if exists (select 1 from jsonb_array_elements(v_questions) q
      where char_length(trim(coalesce(v_answers->>(q->>'key'),''))) < 10) then raise exception 'answer_required'; end if;
  end if;
  v_id := public.save_review_record(
    (p_form->>'movieId')::uuid, 'core', (p_form->>'watchedAt')::date,
    case when v_rating is null then null else greatest(1,v_rating) end,
    v_body, v_title, coalesce((p_form->>'spoiler')::boolean,false),
    coalesce(p_form->>'visibility','private'), v_answers, '{}'::text[], false, p_review_id, v_questions, '[]'::jsonb
  );
  update public.reviews set rating=v_rating, core_flow=v_flow, light_flow=null,
    status=case when p_complete then 'completed' else 'draft' end,
    completed_at=case when p_complete then coalesce(completed_at,now()) else null end,
    updated_at=now() where id=v_id and user_id=auth.uid();
  return v_id;
end $$;
