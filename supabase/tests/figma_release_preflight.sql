-- Read-only metadata and aggregate size only; never exports account/review content.
select jsonb_build_object(
 'postgres_version',current_setting('server_version'),
 'database_size',pg_size_pretty(pg_database_size(current_database())),
 'new_columns',(select coalesce(jsonb_agg(jsonb_build_object('table',table_name,'column',column_name)),'[]')from information_schema.columns where table_schema='public' and ((table_name='social_posts'and column_name='content_blocks')or(table_name='post_comments'and column_name='parent_id'))),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef))from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('save_light_review','save_core_review','save_social_post','list_social_posts','feed_v3_status','save_social_post_v3')),
 'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity))from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'and c.relname in('profiles','reviews','social_posts','post_comments','post_poll_votes','post_question_answers','post_comment_likes')),
 'has_migration_ledger',to_regclass('supabase_migrations.schema_migrations')is not null
) as release_preflight;
