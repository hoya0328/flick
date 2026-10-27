-- Read-only rollout evidence; no raw review, answer, email or credential output.
select
 (select count(*) from public.taste_analysis_preferences where consent) as opted_in_accounts,
 (select count(*) from public.taste_review_analyses) as cached_analyses,
 (select count(*) from public.taste_analysis_events where created_at>now()-interval '1 hour' and status='succeeded') as recent_successes,
 (select count(*) from public.taste_analysis_events where created_at>now()-interval '1 hour' and status='failed') as recent_failures,
 has_function_privilege('authenticated','public.commit_taste_analysis(uuid,uuid,text,jsonb,text)','EXECUTE') as client_can_forge_cache;
