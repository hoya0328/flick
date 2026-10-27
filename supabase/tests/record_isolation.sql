-- Production-safe scope: random synthetic fixtures, real DB roles, all in ROLLBACK.
-- Never use an existing user's record or a service_role request as proof of RLS.
begin;
set local statement_timeout = '20s';
set local lock_timeout = '3s';
create function pg_temp.isolation_expect_error(command text, expected text) returns void language plpgsql as $$
begin
  begin
    execute command;
  exception when others then
    if sqlerrm = expected or sqlstate = expected then return; end if;
    raise;
  end;
  raise exception 'QA_expected_error_missing: %', expected;
end $$;

do $$
declare
  a uuid = gen_random_uuid(); b uuid = gen_random_uuid(); movie uuid;
  private_id uuid; public_id uuid; draft_id uuid; core_id uuid; delete_id uuid;
  light_form jsonb; core_form jsonb; count_changed integer;
  photo text; keyword text;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (a,a||'@rls-check.invalid','{"display_name":"Isolation QA A"}'),
    (b,b||'@rls-check.invalid','{"display_name":"Isolation QA B"}');
  insert into public.movies(provider,provider_id,title) values
    ('qa','record-isolation-'||gen_random_uuid(),'Synthetic authorization test') returning id into movie;
  select id into keyword from public.keywords limit 1;
  if keyword is null then raise exception 'QA_keyword_fixture_missing'; end if;
  light_form = jsonb_build_object(
    'movieId',movie,'mode','light','watchedAt',current_date,'rating',4,
    'body','Synthetic private review','oneLine','','spoiler',false,'visibility','private',
    'questions',(select jsonb_agg(jsonb_build_object('key','light_q'||n,'text','Synthetic question '||n,'sourceRule','figma-light-v1','options','[]'::jsonb)) from generate_series(1,5)n),
    'questionTags','{}'::jsonb,
    'lightFlow',jsonb_build_object('version',1,'responses',(select jsonb_object_agg('light_q'||n,'skipped')from generate_series(1,5)n),'changed','[]'::jsonb,'aspects','[]'::jsonb,'representativeKeywords','[]'::jsonb,'draftSource','manual')
  );
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform set_config('role','authenticated',true);
  if current_user <> 'authenticated' or auth.uid() <> a then raise exception 'QA_not_actual_member_role'; end if;
  private_id = public.save_light_review(light_form,null,true);
  public_id = public.save_light_review(jsonb_set(light_form,'{visibility}','"public"'),null,true);
  insert into public.review_answers(review_id,question_key,answer) values(private_id,'private_answer','Synthetic private answer');
  insert into public.review_keywords(review_id,keyword_id) values(private_id,keyword);
  insert into public.review_answer_tags(review_id,question_key,tag_id) values(private_id,'light_q1','synthetic-tag');
  update public.reviews set body='Owner update works' where id=private_id;
  get diagnostics count_changed = row_count;
  if count_changed <> 1 then raise exception 'QA_owner_update_failed'; end if;
  perform pg_temp.isolation_expect_error(format('update public.reviews set user_id=%L where id=%L',b,private_id),'42501');
  delete_id = public.save_light_review(light_form,null,true);
  delete from public.reviews where id=delete_id;
  get diagnostics count_changed = row_count;
  if count_changed <> 1 then raise exception 'QA_owner_delete_failed'; end if;
  photo = a::text||'/'||gen_random_uuid()::text||'.jpg';
  insert into storage.objects(bucket_id,name,owner_id,metadata) values('core-photos',photo,a::text,'{"size":100,"mimetype":"image/jpeg"}');
  core_form = jsonb_build_object(
    'movieId',movie,'mode','core','watchedAt',current_date,'rating',4,
    'body','Synthetic core private review','oneLine','Synthetic core','visibility','private','spoiler',false,
    'questions',jsonb_build_array(jsonb_build_object('key','core_q1','text','What scene stayed with you in this movie?','sourceRule','core-flow-v1','options','[]'::jsonb)),
    'answers',jsonb_build_object('core_q1','Synthetic answer with enough characters'),
    'coreFlow',jsonb_build_object('version',1,'stage','summary','index',0,'changed','[]'::jsonb,'feedback','{}'::jsonb,'nextQuestions','{}'::jsonb,'keywords','[]'::jsonb,'cover',photo,'source','manual','title','Synthetic core',
      'blocks',jsonb_build_array(jsonb_build_object('id','p1','text','Synthetic core private review','bold',false,'italic',false,'size',15,'kind','paragraph')))
  );
  core_id = public.save_core_review(core_form,null,true);
  -- Make the draft last: Core intentionally resumes an existing draft for a movie.
  draft_id = public.save_light_review(jsonb_set(light_form,'{visibility}','"public"'),null,false);

  perform set_config('request.jwt.claim.sub',b::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  if auth.uid() <> b or current_user <> 'authenticated' then raise exception 'QA_wrong_other_role'; end if;
  if exists(select 1 from public.reviews where id in(private_id,core_id,draft_id)) then raise exception 'QA_private_or_draft_leaked'; end if;
  if not exists(select 1 from public.reviews where id=public_id) then raise exception 'QA_intended_public_read_failed'; end if;
  if exists(select 1 from public.profiles where id=a) then raise exception 'QA_foreign_profile_leaked'; end if;
  if exists(select 1 from public.review_answers where review_id=private_id)
    or exists(select 1 from public.review_questions where review_id=private_id)
    or exists(select 1 from public.review_keywords where review_id=private_id)
    or exists(select 1 from public.review_answer_tags where review_id=private_id)
    then raise exception 'QA_private_child_leaked'; end if;
  update public.reviews set body='Forbidden' where id in(private_id,public_id,core_id,draft_id);
  get diagnostics count_changed = row_count;
  if count_changed <> 0 then raise exception 'QA_foreign_update_succeeded'; end if;
  delete from public.reviews where id in(private_id,public_id,core_id,draft_id);
  get diagnostics count_changed = row_count;
  if count_changed <> 0 then raise exception 'QA_foreign_delete_succeeded'; end if;
  perform pg_temp.isolation_expect_error(format('insert into public.reviews(user_id,movie_id,mode) values(%L,%L,''light'')',a,movie),'42501');
  perform pg_temp.isolation_expect_error(format('insert into public.review_answers(review_id,question_key,answer) values(%L,''forged'',''forged answer'')',private_id),'42501');
  update public.review_answers set answer='Forbidden' where review_id=private_id;
  get diagnostics count_changed = row_count;
  if count_changed <> 0 then raise exception 'QA_foreign_child_update'; end if;
  perform pg_temp.isolation_expect_error(format('select public.save_light_review(%L::jsonb,%L,true)',light_form,private_id),'review_not_found');
  -- Clear A's photo to ensure this RPC reaches the owner check, not photo validation.
  perform pg_temp.isolation_expect_error(format('select public.save_core_review(%L::jsonb,%L,true)',jsonb_set(core_form,'{coreFlow,cover}','null'),core_id),'review_not_found');
  perform pg_temp.isolation_expect_error('select public.admin_list_reviews(1)','admin_view_reviews_required');
  perform pg_temp.isolation_expect_error('select public.admin_set_my_permissions(true,true,true,true)','admin_required');
  if exists(select 1 from storage.objects where bucket_id='core-photos'and name=photo) then raise exception 'QA_private_photo_leaked'; end if;
  perform pg_temp.isolation_expect_error(format('insert into storage.objects(bucket_id,name,owner_id) values(''core-photos'',%L,%L)',a::text||'/'||gen_random_uuid()::text||'.jpg',a::text),'42501');

  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform set_config('role','anon',true);
  if current_user <> 'anon' or auth.uid() is not null then raise exception 'QA_not_actual_anon_role'; end if;
  if exists(select 1 from public.reviews where id in(private_id,public_id,core_id,draft_id)) then raise exception 'QA_anon_review_leaked'; end if;
  if exists(select 1 from public.review_answers where review_id=private_id)
    or exists(select 1 from public.review_questions where review_id=private_id)
    or exists(select 1 from public.review_keywords where review_id=private_id)
    or exists(select 1 from public.review_answer_tags where review_id=private_id)
    then raise exception 'QA_anon_child_leaked'; end if;
  perform pg_temp.isolation_expect_error(format('select public.save_light_review(%L::jsonb,%L,true)',light_form,private_id),'42501');
  perform pg_temp.isolation_expect_error(format('select public.save_core_review(%L::jsonb,%L,true)',jsonb_set(core_form,'{coreFlow,cover}','null'),core_id),'42501');
  perform pg_temp.isolation_expect_error('select public.admin_list_reviews(1)','admin_view_reviews_required');

  perform set_config('role','postgres',true);
  if (select body from public.reviews where id=private_id) <> 'Owner update works' then raise exception 'QA_private_changed'; end if;
  if (select count(*) from public.reviews where id in(private_id,public_id,core_id,draft_id)) <> 4 then raise exception 'QA_record_removed'; end if;
end $$;
select 'PASS: real anon/member DB roles, owner success, private/draft/child/photo isolation, foreign write/delete/spoof/RPC/admin denial, intended public read; all synthetic writes rolled back' as result;
rollback;
