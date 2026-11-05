-- Read-only exhibition assessment: aggregates only, no account IDs or content.
select jsonb_build_object(
 'checked_at',now(),
 'database_timezone',current_setting('TimeZone'),
 'database_bytes',pg_database_size(current_database()),
 'accounts',(select count(*)from auth.users),
 'completed_reviews',(select count(*)from public.reviews where status='completed'),
 'photo_files',(select count(*)from storage.objects where bucket_id='core-photos'),
 'photo_bytes',(select coalesce(sum((metadata->>'size')::bigint),0)from storage.objects where bucket_id='core-photos'),
 'ai_28d',(select coalesce(jsonb_agg(t),'[]')from(select feature,status,model,count(*)as calls,round(avg(prompt_tokens))as avg_input_tokens,round(avg(greatest(output_tokens,total_tokens-prompt_tokens)))as avg_output_including_thoughts,round(avg(duration_ms))as avg_duration_ms from public.ai_usage_events where created_at>=now()-interval '28 days'group by feature,status,model)t),
 'taste_ai_28d',(select count(*)from public.taste_analysis_events where created_at>=now()-interval '28 days'),
 'question20_draft5_limit_definition_matches',(position('v_daily_limit := 20'in pg_get_functiondef('public.claim_ai_request(uuid,text)'::regprocedure))>0 and position('v_daily_limit := 5'in pg_get_functiondef('public.claim_ai_request(uuid,text)'::regprocedure))>0),
 'taste_project30_limit_definition_matches',position('>=30'in pg_get_functiondef('public.claim_taste_analysis(uuid,uuid,text)'::regprocedure))>0,
 'photo160_limit_definition_matches',position('< 160'in pg_get_functiondef('public.core_photo_budget()'::regprocedure))>0
)as exhibition_capacity;
