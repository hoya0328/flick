// Isolated PostgreSQL/WASM. Never reads credentials or connects to a remote DB.
import { readFile } from 'node:fs/promises';
const { PGlite } = await import('../tmp/feed-db-qa/node_modules/@electric-sql/pglite/dist/index.js');
const db = new PGlite();
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create role supabase_auth_admin;revoke create on schema public from public;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text,is_anonymous boolean default false,raw_user_meta_data jsonb);
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;
 create table public.profiles(id uuid primary key,display_name text);alter table public.profiles enable row level security;
 grant select,update on public.profiles to authenticated;create policy own on public.profiles to authenticated using(id=auth.uid())with check(id=auth.uid());
 create function public.fixture_profile()returns trigger language plpgsql security definer as $$begin insert into public.profiles values(new.id,new.raw_user_meta_data->>'display_name');return new;end$$;
 create trigger fixture_profile after insert on auth.users for each row execute function public.fixture_profile();
 create table public.movies(id uuid primary key default gen_random_uuid(),provider text,provider_id text,title text,original_title text,overview text,poster_path text,release_date date,genres text[],vote_average numeric);
 create table public.reviews(id uuid primary key,user_id uuid,movie_id uuid,mode text);grant insert on public.reviews to authenticated;
 create table storage.objects(bucket_id text,name text,owner_id text);alter table storage.objects enable row level security;grant insert,select on storage.objects to authenticated;
 create policy own_storage on storage.objects to authenticated using(owner_id=auth.uid()::text)with check(owner_id=auth.uid()::text);
 create table public.social_posts(id uuid default gen_random_uuid(),user_id uuid,body text);
 create function public.save_social_post_v3(uuid,text,text[],text,jsonb)returns uuid language plpgsql security definer as $$declare v uuid;begin insert into public.social_posts(user_id,body)values(auth.uid(),$2)returning id into v;return v;end$$;
 create function public.admin_set_my_permissions(boolean,boolean,boolean,boolean)returns void language plpgsql as $$begin raise exception 'admin_required';end$$;
 create table public.taste_analysis_events(id uuid primary key default gen_random_uuid(),user_id uuid,created_at timestamptz default now());
 create function public.claim_taste_analysis(uuid,uuid,text)returns jsonb language sql as $$select '{"allowed":false,"code":"source_changed"}'::jsonb$$;`);
 await db.exec(await readFile('supabase/migrations/202608070007_ai_operations.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/202611050002_exhibition.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/202611050003_exhibition_quota_hardening.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/202611050004_exhibition_movie_choices.sql','utf8'));
 const results = await db.exec(await readFile('supabase/tests/exhibition.sql','utf8'));
 console.log(results.at(-1).rows);
 console.log('PASS isolated exact exhibition DDL + restricted-role rollback tests.');
} finally { await db.close(); }
