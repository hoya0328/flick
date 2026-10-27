-- No permanent writes. AI is not called by this test.
begin;
do $$
declare a uuid;b uuid; movie uuid;review uuid;source jsonb; hash text;result jsonb;signals jsonb;event uuid;
begin
 select id into a from auth.users order by created_at limit 1;
 select id into b from auth.users where id<>a order by created_at limit 1;
 if a is null or b is null then raise exception 'QA_two_accounts_required';end if;
 insert into public.movies(provider,provider_id,title)values('qa','taste-'||gen_random_uuid(),'QA 취향 테스트')returning id into movie;
 insert into public.reviews(user_id,movie_id,mode,status,visibility,rating,body)values(a,movie,'core','completed','private',4,'AI 매거진 본문은 분석 제외')returning id into review;
 insert into public.review_questions(review_id,question_key,question_text,source_rule,options,sort_order)values(review,'core_q1','어떤 장면이 좋았나요?','qa','[]',0);
 insert into public.review_answers(review_id,question_key,answer)values(review,'core_q1','색감과 카메라 구도가 인상적이었다.');
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('role','authenticated',true);
 if (public.get_my_taste_analysis_state()->>'consent')::boolean then perform public.set_my_taste_consent(false);end if;
 source=public.get_my_taste_source(review);hash=source->>'hash';
 if source->'source'->'turns'->0->>'answer'<>'색감과 카메라 구도가 인상적이었다.' then raise exception 'QA_wrong_source';end if;
 begin perform public.claim_taste_analysis(a,review,hash);raise exception 'QA_client_claim_allowed';exception when insufficient_privilege then null;end;
 begin insert into public.taste_review_analyses(review_id,user_id,source_hash,signals,model)values(review,a,hash,'[]','qa');raise exception 'QA_client_cache_forgery';exception when insufficient_privilege then null;end;
 perform public.set_my_taste_consent(true);
 perform set_config('role','postgres',true);
 result=public.claim_taste_analysis(a,review,hash);
 if result->>'allowed'<>'true' then raise exception 'QA_claim_failed: %',result;end if;
 event=(result->>'eventId')::uuid;
 if public.claim_taste_analysis(a,review,hash)->>'code'<>'analysis_busy' then raise exception 'QA_duplicate_call';end if;
 signals=jsonb_build_array(jsonb_build_object('type','scene','strength',0.9,'stance','positive','evidence','색감과 카메라 구도가 인상적이었다','questionKey','core_q1'));
 begin
  perform public.commit_taste_analysis(a,review,hash,jsonb_set(signals,'{0,evidence}','"원문에 없는 근거를 생성했다"'),'qa');raise exception 'QA_fake_quote_accepted';
 exception when others then if sqlerrm<>'invalid_signals' then raise;end if;end;
 begin
  perform public.commit_taste_analysis(a,review,hash,jsonb_set(signals,'{0,type}','"foreign_type"'),'qa');raise exception 'QA_unknown_type_accepted';
 exception when others then if sqlerrm<>'invalid_signals' then raise;end if;end;
 if not public.commit_taste_analysis(a,review,hash,signals,'qa') then raise exception 'QA_commit_failed';end if;
 if public.claim_taste_analysis(a,review,hash)->>'code'<>'cached' then raise exception 'QA_cache_recalled_ai';end if;
 update public.taste_analysis_events set status='succeeded',finished_at=now()where id=event;
 perform set_config('role','authenticated',true);
 if not public.get_my_taste_analysis_state()->'analyses' @> jsonb_build_array(jsonb_build_object('reviewId',review))then raise exception 'QA_own_cache_missing';end if;
 update public.reviews set rating=5,body='사용자가 매거진 문장을 수정함'where id=review;
 if public.get_my_taste_source(review)->>'hash'<>hash then raise exception 'QA_rating_magazine_invalidates_ai';end if;
 update public.reviews set visibility='public'where id=review;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if public.get_my_taste_analysis_state()->'analyses' @> jsonb_build_array(jsonb_build_object('reviewId',review))then raise exception 'QA_foreign_cache_leaked';end if;
 begin perform public.get_my_taste_source(review);raise exception 'QA_foreign_source_leaked';exception when others then if sqlerrm<>'review_not_found' then raise;end if;end;
 perform set_config('role','postgres',true);
 update public.review_answers set answer='음악은 좋았지만 서사는 별로였다.' where review_id=review;
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('role','authenticated',true);
 if public.get_my_taste_analysis_state()->'analyses' @> jsonb_build_array(jsonb_build_object('reviewId',review))then raise exception 'QA_stale_cache_visible';end if;
 perform set_config('role','postgres',true);
 if public.commit_taste_analysis(a,review,hash,signals,'qa') then raise exception 'QA_stale_commit_allowed';end if;
 perform set_config('role','authenticated',true);perform public.set_my_taste_consent(false);
 perform set_config('role','postgres',true);
 if exists(select 1 from public.taste_review_analyses where review_id=review)then raise exception 'QA_withdraw_did_not_clear';end if;
 if public.claim_taste_analysis(a,review,hash)->>'code'<>'consent_required' then raise exception 'QA_unconsented_claim';end if;
 perform set_config('role','authenticated',true);perform public.set_my_taste_consent(true);
 hash=public.get_my_taste_source(review)->>'hash';perform set_config('role','postgres',true);
 insert into public.taste_analysis_events(user_id,review_id,status)select a,review,'failed'from generate_series(1,5);
 if public.claim_taste_analysis(a,review,hash)->>'code'<>'daily_limit' then raise exception 'QA_daily_limit_failed';end if;
 -- Remove ONLY transaction-created QA events, then exercise the global allowance.
 delete from public.taste_analysis_events where review_id=review;
 insert into public.taste_analysis_events(user_id,review_id,status)select b,review,'failed'from generate_series(1,30);
 if public.claim_taste_analysis(a,review,hash)->>'code'<>'project_daily_limit' then raise exception 'QA_global_limit_failed';end if;
 if not exists(select 1 from public.reviews where id=review)then raise exception 'QA_original_removed';end if;
 insert into public.taste_review_analyses(review_id,user_id,source_hash,signals,model)values(review,a,hash,'[]','qa');
 delete from public.reviews where id=review;
 if exists(select 1 from public.taste_review_analyses where review_id=review)then raise exception 'QA_delete_did_not_clear_cache';end if;
end $$;
select 'PASS: owner-only source/cache, opt-in, quote/schema validation, stale/rating changes, withdrawal, duplicate/user/global limits; ALL ROLLED BACK' result;
rollback;
