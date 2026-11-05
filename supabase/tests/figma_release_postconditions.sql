-- Aggregate metadata only. No user content or private identifiers are returned.
select jsonb_build_object(
 'synthetic_auth_remaining',(select count(*)from auth.users where email like '%@feed-check.invalid'or email like '%@rls-check.invalid'or email like '%@qa.invalid'or email like '%@record-ui-check.invalid'),
 'synthetic_movies_remaining',(select count(*)from public.movies where provider='qa'and(provider_id like 'feed-isolation-%'or provider_id like 'record-isolation-%'or provider_id like 'community-%'or provider_id like 'record-ui-%')),
 'new_tables_rls',(select bool_and(c.relrowsecurity)from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'and c.relname in('post_poll_votes','post_question_answers','post_comment_likes')),
 'new_table_direct_grants',(select count(*)from information_schema.role_table_grants where table_schema='public'and table_name in('post_poll_votes','post_question_answers','post_comment_likes')and grantee in('anon','authenticated','PUBLIC'))
)as postconditions;
