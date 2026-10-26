-- Transaction-only fixtures: no user profile, record or saved relationship survives.
begin;
do $$
declare a uuid; b uuid; movie uuid; light uuid; core uuid; collection uuid; editorial uuid; page jsonb; avatar text;
begin
  select id into a from auth.users order by created_at limit 1;
  select id into b from auth.users where id<>a order by created_at limit 1;
  if a is null or b is null then raise exception 'QA_two_accounts_required'; end if;
  insert into public.movies(provider,provider_id,title) values('qa','profile-'||gen_random_uuid(),'QA 프로필 테스트') returning id into movie;
  insert into public.reviews(user_id,movie_id,mode,visibility,status,rating,body)
    values(b,movie,'light','public','completed',4,'공개 테스트 리뷰') returning id into light;
  insert into public.reviews(user_id,movie_id,mode,visibility,status,rating,one_line)
    values(b,movie,'core','public','completed',4.5,'QA 매거진') returning id into core;
  insert into public.review_saves(user_id,review_id) values(a,light),(a,core);
  insert into public.watchlist(user_id,movie_id) values(a,movie);
  insert into public.movie_collections(user_id,title,visibility) values(b,'QA 컬렉션','public') returning id into collection;
  insert into public.movie_collection_saves(user_id,collection_id) values(a,collection);
  insert into public.editorial_curations(created_by,kind,title,status,rights_confirmed)
    values(b,'expert','QA 편집 매거진','published',true) returning id into editorial;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('role','authenticated',true);
  perform public.save_my_profile('QA 사용자','소개 테스트',null);
  if not exists(select 1 from public.profiles where id=a and bio='소개 테스트') then raise exception 'QA_own_profile_failed'; end if;
  begin
    perform public.save_my_profile('Q','',null);raise exception 'QA_short_name_accepted';
  exception when others then if sqlerrm<>'invalid_nickname' then raise; end if; end;
  begin
    perform public.save_my_profile('QA 사용자',repeat('가',81),null);raise exception 'QA_long_bio_accepted';
  exception when others then if sqlerrm<>'invalid_bio' then raise; end if; end;
  begin
    perform public.save_my_profile('QA 사용자','',b::text||'/00000000-0000-4000-8000-000000000001.jpg');raise exception 'QA_foreign_avatar_accepted';
  exception when others then if sqlerrm<>'invalid_owned_avatar' then raise; end if; end;
  avatar=a::text||'/00000000-0000-4000-8000-000000000099.jpg';
  insert into storage.objects(bucket_id,name,owner_id,metadata) values('core-photos',avatar,a::text,'{"size":100,"mimetype":"image/jpeg"}');
  perform public.save_my_profile('QA 사용자','소개 테스트',avatar);
  page=public.list_my_saved_content('movies',50,0);
  if not page->'items' @> jsonb_build_array(jsonb_build_object('id',movie)) then raise exception 'QA_saved_movie_missing'; end if;
  page=public.list_my_saved_content('reviews',50,0);
  if not page->'items' @> jsonb_build_array(jsonb_build_object('id',light,'kind','review')) or page->'items' @> jsonb_build_array(jsonb_build_object('id',core)) then raise exception 'QA_light_filter_failed'; end if;
  perform public.set_editorial_curation_saved(editorial,true);
  perform public.set_editorial_curation_saved(editorial,true);
  if not public.is_editorial_curation_saved(editorial) then raise exception 'QA_editorial_save_failed'; end if;
  page=public.list_my_saved_content('magazines',50,0);
  if not page->'items' @> jsonb_build_array(jsonb_build_object('id',core,'kind','magazine')) or not page->'items' @> jsonb_build_array(jsonb_build_object('id',editorial,'kind','curation')) then raise exception 'QA_magazine_filter_failed'; end if;
  if jsonb_array_length(public.list_my_saved_content('magazines',1,0)->'items')<>1 or jsonb_array_length(public.list_my_saved_content('magazines',1,2147483647)->'items')<>0 then raise exception 'QA_pagination_failed'; end if;
  page=public.list_my_saved_content('collections',50,0);
  if not page->'items' @> jsonb_build_array(jsonb_build_object('id',collection)) then raise exception 'QA_collection_missing'; end if;
  perform set_config('request.jwt.claim.sub',b::text,true);
  if public.is_editorial_curation_saved(editorial) then raise exception 'QA_other_save_leaked'; end if;
  if public.list_my_saved_content('movies',50,0)->'items' @> jsonb_build_array(jsonb_build_object('id',movie)) then raise exception 'QA_other_watchlist_leaked'; end if;
  if exists(select 1 from public.profiles where id=a) then raise exception 'QA_other_profile_leaked'; end if;
  update public.reviews set visibility='private' where id in(light,core);
  perform set_config('role','postgres',true);
  update public.movie_collections set visibility='private' where id=collection;
  update public.editorial_curations set status='draft' where id=editorial;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('role','authenticated',true);
  if public.list_my_saved_content('reviews',50,0)->'items' @> jsonb_build_array(jsonb_build_object('id',light)) then raise exception 'QA_private_review_leaked'; end if;
  page=public.list_my_saved_content('magazines',50,0);
  if page->'items' @> jsonb_build_array(jsonb_build_object('id',core)) or page->'items' @> jsonb_build_array(jsonb_build_object('id',editorial)) then raise exception 'QA_hidden_magazine_leaked'; end if;
  if public.list_my_saved_content('collections',50,0)->'items' @> jsonb_build_array(jsonb_build_object('id',collection)) then raise exception 'QA_private_collection_leaked'; end if;
  perform public.set_editorial_curation_saved(editorial,false);
  if public.is_editorial_curation_saved(editorial) then raise exception 'QA_unsave_failed'; end if;
  begin
    perform public.list_my_saved_content('invalid');raise exception 'QA_unknown_kind_accepted';
  exception when others then if sqlerrm<>'invalid_saved_kind' then raise; end if; end;
  perform set_config('role','postgres',true);
  if not exists(select 1 from public.editorial_curations where id=editorial) then raise exception 'QA_unsave_deleted_original'; end if;
end $$;
select 'PASS: own profile, avatar ownership, private saved lists, pagination, Light/Core, hidden originals, idempotent save; ALL ROLLED BACK' as result;
rollback;
