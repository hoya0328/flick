-- All writes below are rolled back. Run as postgres after additive migration.
begin;
do $$
declare owner_id uuid; movie_id uuid; form jsonb; record_id uuid; other_id uuid; photo_path text;
begin
  select id into owner_id from auth.users order by created_at limit 1;
  select id into other_id from auth.users where id<>owner_id order by created_at limit 1;
  select id into movie_id from public.movies m where not exists(select 1 from public.reviews r where r.movie_id=m.id and r.user_id=owner_id and r.status='draft') limit 1;
  if owner_id is null or movie_id is null or other_id is null then raise exception 'QA_fixture_missing'; end if;
  form=jsonb_build_object('movieId',movie_id,'mode','core','watchedAt',current_date,'rating',0.5,
    'body','도시의 빛과 인물의 외로운 선택이 오래 기억에 남았어요.','oneLine','나의 영화 감상', 'visibility','private','spoiler',false,
    'questions',jsonb_build_array(jsonb_build_object('key','core_q1','text','이 영화에서 가장 인상 깊은 장면은 무엇이었나요?','sourceRule','core-flow-v1','options','[]'::jsonb)),
    'answers',jsonb_build_object('core_q1','도시의 빛과 인물의 외로운 선택이 오래 기억에 남았어요.'),
    'coreFlow',jsonb_build_object('version',1,'stage','summary','index',0,'changed','[]'::jsonb,'feedback','{}'::jsonb,'nextQuestions','{}'::jsonb,'keywords','[]'::jsonb,'cover',null,'source','manual','title','나의 영화 감상',
    'blocks',jsonb_build_array(jsonb_build_object('id','p1','text','도시의 빛과 인물의 외로운 선택이 오래 기억에 남았어요.','bold',false,'italic',false,'size',15,'kind','paragraph'))));
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('role','authenticated',true);
  photo_path=owner_id::text || '/00000000-0000-4000-8000-000000000001.jpg';
  insert into storage.objects(bucket_id,name,owner_id,metadata) values('core-photos',photo_path,owner_id::text,'{"size":100,"mimetype":"image/jpeg"}');
  form=jsonb_set(form,'{coreFlow,cover}',to_jsonb(photo_path));
  record_id=public.save_core_review(form,null,true);
  begin
    perform public.save_core_review(jsonb_set(form,'{coreFlow,title}','42'),record_id,true);
    raise exception 'QA_numeric_title_accepted';
  exception when others then if sqlerrm<>'invalid_core_state' then raise; end if; end;
  begin
    perform public.save_core_review(jsonb_set(form,'{coreFlow,index}','0.5'),record_id,true);
    raise exception 'QA_fractional_index_accepted';
  exception when others then if sqlerrm<>'invalid_core_state' then raise; end if; end;
  if not exists(select 1 from public.reviews where id=record_id and rating=0.5 and visibility='private' and status='completed' and core_flow->>'version'='1') then raise exception 'QA_early_finish_failed'; end if;
  begin
    perform public.save_core_review(jsonb_set(form,'{answers,core_q1}','"짧음"'),record_id,true);
    raise exception 'QA_short_accepted';
  exception when others then if sqlerrm<>'answer_required' then raise; end if; end;
  begin
    perform public.save_core_review(jsonb_set(form,'{coreFlow,cover}',to_jsonb(other_id::text || '/00000000-0000-4000-8000-000000000001.jpg')),record_id,true);
    raise exception 'QA_foreign_photo_accepted';
  exception when others then if sqlerrm<>'invalid_owned_photo' then raise; end if; end;
  begin
    perform public.save_core_review(jsonb_set(form,'{coreFlow,blocks,0,text}',to_jsonb(repeat('가',1001))),record_id,true);
    raise exception 'QA_long_accepted';
  exception when others then if sqlerrm not in ('invalid_magazine_blocks','invalid_magazine_length') then raise; end if; end;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  if exists(select 1 from public.reviews where id=record_id) then raise exception 'QA_private_leak'; end if;
  if exists(select 1 from storage.objects where bucket_id='core-photos' and name=photo_path) then raise exception 'QA_private_photo_leak'; end if;
  begin
    insert into storage.objects(bucket_id,name,owner_id) values('core-photos',owner_id::text || '/00000000-0000-4000-8000-000000000002.jpg',other_id::text);
    raise exception 'QA_foreign_photo_insert_accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_core_review(form,record_id,true);
    raise exception 'QA_foreign_edit_accepted';
  exception when others then if sqlerrm not in ('review_not_found','invalid_owned_photo') then raise; end if; end;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.save_core_review(jsonb_set(form,'{visibility}','"public"'),record_id,true);
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  if not exists(select 1 from public.reviews where id=record_id and status='completed') then raise exception 'QA_public_missing'; end if;
  if not exists(select 1 from storage.objects where bucket_id='core-photos' and name=photo_path) then raise exception 'QA_public_photo_missing'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.save_core_review(form,record_id,true);
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  if exists(select 1 from storage.objects where bucket_id='core-photos' and name=photo_path) then raise exception 'QA_unpublished_photo_leak'; end if;
  perform set_config('role','postgres',true);
end $$;
select 'PASS: early finish, half-star, short answer/length/photo rejection, private RLS, public read, foreign edit denied; rolled back' as result;
rollback;
