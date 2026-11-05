-- Read-only rollout/rollback checks. No identities, content, tokens or secrets returned.
do $$
begin
 if exists(select 1 from auth.users where email like '%@exhibition-qa.invalid') then raise exception 'QA_fixture_residue'; end if;
 if has_function_privilege('authenticated','public.claim_ai_request(uuid,text)','execute')
 or has_function_privilege('service_role','public.claim_ai_request_personal_v1(uuid,text)','execute')
 or has_function_privilege('service_role','public.claim_taste_analysis_personal_v1(uuid,uuid,text)','execute')
 or has_function_privilege('anon','public.exhibition_before_user_created(jsonb)','execute') then raise exception 'QA_function_privilege_leak'; end if;
 if exists(select 1 from pg_tables t where t.schemaname='public' and t.tablename not in
 ('exhibition_settings','exhibition_signup_slots','exhibition_guests','exhibition_records','ai_project_reservations')
 and not exists(select 1 from pg_trigger g where g.tgrelid=(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))::regclass and g.tgname='exhibition_member_write' and g.tgenabled='O')) then raise exception 'QA_missing_ordinary_write_guard'; end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='exhibition_no_storage' and permissive='RESTRICTIVE') then raise exception 'QA_storage_guard_missing'; end if;
end $$;
select 'PASS: zero synthetic Auth residue, no client/service quota bypass, all existing public tables guarded, restrictive media policy' as result,
 enabled,closes_at,free_verified_until,daily_limit,minute_limit from public.exhibition_settings;
