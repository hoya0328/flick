-- Synthetic accounts only. No emails, persistent Auth users, real records or provider calls.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
create function pg_temp.exhibition_expect_error(command text,expected text) returns void language plpgsql as $$
begin
 begin execute command; exception when others then if sqlerrm=expected or sqlstate=expected then return; end if; raise; end;
 raise exception 'QA_expected_error_missing: %',expected;
end $$;
do $$
declare a uuid=gen_random_uuid(); b uuid=gen_random_uuid(); member uuid=gen_random_uuid(); movie uuid; unselected uuid; result jsonb; q record; i int; n int;
begin
 -- Local PostgreSQL can exercise the Auth role. Hosted postgres cannot SET ROLE
 -- supabase_auth_admin: assert its ACL there, then run the body as owner.
 if not has_function_privilege('supabase_auth_admin','public.exhibition_before_user_created(jsonb)','EXECUTE') then raise exception 'QA_hook_auth_acl_missing'; end if;
 if pg_has_role(current_user,'supabase_auth_admin','MEMBER') then perform set_config('role','supabase_auth_admin',true); end if;
 result=public.exhibition_before_user_created(jsonb_build_object('user',jsonb_build_object('id',a,'is_anonymous',true)));
 if result<>'{}'::jsonb then raise exception 'QA_hook_admission_failed'; end if;
 result=public.exhibition_before_user_created(jsonb_build_object('user',jsonb_build_object('id',b,'is_anonymous',true)));
 if result<>'{}'::jsonb then raise exception 'QA_hook_second_admission_failed'; end if;
 perform set_config('role','postgres',true);
 insert into auth.users(id,email,is_anonymous,raw_user_meta_data) values
 (a,a||'@exhibition-qa.invalid',true,'{"display_name":"Exhibition QA A"}'),
 (b,b||'@exhibition-qa.invalid',true,'{"display_name":"Exhibition QA B"}'),
 (member,member||'@exhibition-qa.invalid',false,'{"display_name":"Exhibition QA member"}');
 insert into public.movies(provider,provider_id,title) values('qa','exhibition-'||gen_random_uuid(),'Synthetic exhibition film') returning id into movie;
 insert into public.exhibition_movie_choices(movie_id) values(movie);
 insert into public.movies(provider,provider_id,title) values('qa','exhibition-'||gen_random_uuid(),'Synthetic unselected film') returning id into unselected;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',true)::text,true);
 perform set_config('role','authenticated',true);
 if current_user<>'authenticated' or auth.uid()<>a or not public.is_exhibition_guest() then raise exception 'QA_wrong_guest_role'; end if;
 result=public.join_exhibition(true,true);
 if result->>'user_id'<>a::text then raise exception 'QA_guest_owner_failed'; end if;
 if jsonb_array_length(public.exhibition_movies('Synthetic exhibition film'))<1 then raise exception 'QA_movie_positive_control'; end if;
 perform pg_temp.exhibition_expect_error('select public.exhibition_before_user_created(''{}'')','42501');
 perform pg_temp.exhibition_expect_error(format('select public.reserve_project_ai(%L,''core_question'')',a),'42501');
 perform pg_temp.exhibition_expect_error(format('select * from public.claim_ai_request(%L,''core_question'')',a),'42501');
 perform pg_temp.exhibition_expect_error('select * from public.exhibition_signup_slots','42501');
 perform pg_temp.exhibition_expect_error(format('insert into public.reviews(user_id,movie_id,mode)values(%L,%L,''light'')',a,movie),'42501');
 perform pg_temp.exhibition_expect_error(format('update public.profiles set display_name=''forbidden'' where id=%L',a),'42501');
 perform pg_temp.exhibition_expect_error(format('insert into storage.objects(bucket_id,name,owner_id)values(''core-photos'',%L,%L)',a||'/'||gen_random_uuid()||'.jpg',a),'42501');
 perform pg_temp.exhibition_expect_error('select public.admin_set_my_permissions(true,true,true,true)','admin_required');
 perform pg_temp.exhibition_expect_error('select public.save_social_post_v3(null,''Synthetic public post'',''{}'',''public'',''[]'')','42501');
 perform pg_temp.exhibition_expect_error(format('select public.save_exhibition_record(%L,''light'',4,''not selected'',''{}'',''[{"question":"Q","answer":"A"}]'')',unselected),'exhibition_movie_not_selected');
 perform public.save_exhibition_record(movie,'light',4,'Synthetic private guest text',array['따뜻한'],'[{"question":"Synthetic question","answer":"따뜻한"}]');
 if not exists(select 1 from public.exhibition_records where user_id=a and body='Synthetic private guest text') then raise exception 'QA_owner_read_positive_control'; end if;
 perform pg_temp.exhibition_expect_error(format('select public.save_exhibition_record(%L,''light'',4,''duplicate'',''{}'',''[{"question":"Q","answer":"A"}]'')',movie),'23505');
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','is_anonymous',true)::text,true);
 perform public.join_exhibition(false,false);
 if exists(select 1 from public.exhibition_records where user_id=a) or exists(select 1 from public.exhibition_guests where user_id=a) then raise exception 'QA_cross_guest_leak'; end if;
 perform pg_temp.exhibition_expect_error(format('insert into public.exhibition_records(user_id,movie_id,mode,rating,body,responses)values(%L,%L,''light'',4,''forged'',''[]'')',a,movie),'42501');
 perform pg_temp.exhibition_expect_error(format('update public.exhibition_guests set ai_consent=true,adult_confirmed=true where user_id=%L',b),'42501');
 perform set_config('role','postgres',true);
 perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{}',true);
 -- Trusted DB guest status remains even after anonymous flag changes.
 update auth.users set is_anonymous=false where id=a;
 perform set_config('request.jwt.claim.sub',a::text,true); perform set_config('role','authenticated',true);
 if not public.is_exhibition_guest() then raise exception 'QA_guest_downgrade_bypass'; end if;
 perform set_config('role','postgres',true); perform set_config('request.jwt.claim.sub','',true);
 -- Ordinary member positive control: existing profile update is still permitted.
 perform set_config('request.jwt.claim.sub',member::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 update public.profiles set display_name='Exhibition QA updated' where id=member; get diagnostics n=row_count;
 if n<>1 then raise exception 'QA_regular_member_update_failed'; end if;
 perform pg_temp.exhibition_expect_error('select public.join_exhibition(true,true)','anonymous_session_required');
 if exists(select 1 from public.exhibition_records where user_id=a) then raise exception 'QA_member_guest_leak'; end if;
 perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{}',true);
 perform pg_temp.exhibition_expect_error('select * from public.exhibition_records','42501');
 perform pg_temp.exhibition_expect_error('select public.join_exhibition(true,true)','42501');
 if public.exhibition_status()->'dailyRemaining' is null then raise exception 'QA_public_status_unavailable'; end if;
 -- Test service-only claims without a provider call.
 perform set_config('role','service_role',true);
 select * into q from public.claim_ai_request(b,'core_question');
 if q.allowed or q.limit_kind<>'guest_consent_required' then raise exception 'QA_consent_not_enforced'; end if;
 perform set_config('role','postgres',true);
 update public.exhibition_guests set adult_confirmed=true,ai_consent=true where user_id=b;
 update public.exhibition_settings set daily_limit=400,minute_limit=12,free_verified_until=now()+interval '1 day';
 perform set_config('role','service_role',true);
 select * into q from public.claim_ai_request(b,'core_question');
 if not q.allowed or q.event_id is null then raise exception 'QA_allowed_claim_failed'; end if;
 perform set_config('role','postgres',true);
 insert into public.ai_project_reservations(user_id,feature,created_at) select b,'synthetic',now()-interval '2 minutes' from generate_series(1,7);
 perform set_config('role','service_role',true);
 select * into q from public.claim_ai_request(b,'core_review_draft');
 if q.allowed or q.limit_kind<>'guest' then raise exception 'QA_guest_eight_cap_failed'; end if;
 -- Repeated guest-cap denials do not insert either usage or reservation rows.
 perform set_config('role','postgres',true);
 select count(*) into n from public.ai_usage_events where user_id=b;
 perform set_config('role','service_role',true);
 for i in 1..25 loop perform public.claim_ai_request(b,'core_review_draft'); end loop;
 perform set_config('role','postgres',true);
 if (select count(*) from public.ai_usage_events where user_id=b)<>n then raise exception 'QA_rejected_log_growth'; end if;
 if (select count(*) from public.ai_project_reservations where user_id=b)<>8 then raise exception 'QA_rejected_reservation_growth'; end if;
 perform set_config('role','postgres',true);
 insert into public.ai_project_reservations(user_id,feature) select member,'synthetic' from generate_series(1,12);
 perform set_config('role','service_role',true);
 select * into q from public.claim_ai_request(member,'core_question');
 if q.allowed or q.limit_kind<>'project_burst' then raise exception 'QA_project_minute_cap_failed'; end if;
 perform set_config('role','postgres',true);
 insert into public.ai_project_reservations(user_id,feature,created_at) select member,'synthetic',now()-interval '2 minutes' from generate_series(1,400);
 perform set_config('role','service_role',true);
 select * into q from public.claim_ai_request(member,'core_question');
 if q.allowed or q.limit_kind<>'project_daily' or q.retry_after_seconds<1 then raise exception 'QA_project_day_cap_failed'; end if;
 perform set_config('role','postgres',true);
 update public.exhibition_settings set free_verified_until=now()-interval '1 second';
 perform set_config('role','service_role',true);
 select * into q from public.claim_ai_request(member,'core_question');
 if q.allowed or q.limit_kind<>'free_tier_not_verified' then raise exception 'QA_free_expiry_failed'; end if;
 perform set_config('role','postgres',true);
 -- A shared-minute signup burst must not create unlimited anonymous identities.
 insert into public.exhibition_signup_slots(id) select gen_random_uuid() from generate_series(1,20);
 if pg_has_role(current_user,'supabase_auth_admin','MEMBER') then perform set_config('role','supabase_auth_admin',true); end if;
 result=public.exhibition_before_user_created(jsonb_build_object('user',jsonb_build_object('id',gen_random_uuid(),'is_anonymous',true)));
 if result->'error'->>'message'<>'exhibition_signup_limit' then raise exception 'QA_signup_burst_failed'; end if;
 perform set_config('role','postgres',true);
 update public.exhibition_settings set enabled=false;
 if pg_has_role(current_user,'supabase_auth_admin','MEMBER') then perform set_config('role','supabase_auth_admin',true); end if;
 result=public.exhibition_before_user_created(jsonb_build_object('user',jsonb_build_object('id',gen_random_uuid(),'is_anonymous',true)));
 if result->'error'->>'message'<>'exhibition_closed' then raise exception 'QA_signup_closed_failed'; end if;
 result=public.exhibition_before_user_created(jsonb_build_object('user',jsonb_build_object('id',gen_random_uuid(),'is_anonymous',false)));
 if result<>'{}'::jsonb then raise exception 'QA_regular_signup_affected'; end if;
 perform set_config('role','postgres',true);
end $$;
rollback;
select 'PASS: exhibition admission, own/private isolation, ordinary member positive control, no public/social/media/admin writes, shared AI quota and expiry; synthetic transaction rolled back' as result;
