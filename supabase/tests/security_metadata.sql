-- Read-only grants and policy metadata only, no private content or identifiers.
select jsonb_build_object(
 'private_bucket',(select bool_and(not public)from storage.buckets where id='core-photos'),
 'sensitive_tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'anon_select',has_table_privilege('anon',c.oid,'select'),'member_select',has_table_privilege('authenticated',c.oid,'select')))from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'and c.relkind='r'and c.relname in('profiles','reviews','review_answers','review_questions','review_answer_tags','admin_access','social_posts','post_poll_votes','post_question_answers','post_comment_likes')),
 'definers_missing_fixed_search_path',(select coalesce(jsonb_agg(p.proname),'[]')from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.prosecdef and not exists(select 1 from unnest(coalesce(p.proconfig,'{}'::text[]))s where s like 'search_path=%'))
)as security_metadata;
