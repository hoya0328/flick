create table if not exists public.movie_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 500),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movie_collection_items (
  collection_id uuid not null references public.movie_collections(id) on delete cascade,
  movie_id uuid not null references public.movies(id),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (collection_id, movie_id)
);

create table if not exists public.movie_collection_saves (
  collection_id uuid not null references public.movie_collections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

create index if not exists movie_collections_public_updated_idx
  on public.movie_collections(updated_at desc) where visibility = 'public';
create index if not exists movie_collections_user_updated_idx
  on public.movie_collections(user_id, updated_at desc);
create index if not exists movie_collection_saves_user_idx
  on public.movie_collection_saves(user_id, created_at desc);

alter table public.movie_collections enable row level security;
alter table public.movie_collection_items enable row level security;
alter table public.movie_collection_saves enable row level security;

revoke all on public.movie_collections from anon, authenticated;
revoke all on public.movie_collection_items from anon, authenticated;
revoke all on public.movie_collection_saves from anon, authenticated;

create or replace function public.list_public_collections(p_limit integer default 12)
returns table (
  collection_id uuid,
  author_display_name text,
  title text,
  description text,
  movie_count bigint,
  save_count bigint,
  viewer_saved boolean,
  poster_paths text[],
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select collections.id,
         coalesce(nullif(trim(profiles.display_name), ''), 'FLICK 사용자'),
         collections.title,
         collections.description,
         count(distinct items.movie_id),
         count(distinct saves.user_id),
         bool_or(saves.user_id = auth.uid()),
         coalesce((array_agg(distinct movies.poster_path) filter (where movies.poster_path is not null))[1:4], '{}'::text[]),
         collections.updated_at
  from public.movie_collections collections
  left join public.profiles profiles on profiles.id = collections.user_id
  left join public.movie_collection_items items on items.collection_id = collections.id
  left join public.movies movies on movies.id = items.movie_id
  left join public.movie_collection_saves saves on saves.collection_id = collections.id
  where auth.uid() is not null and collections.visibility = 'public'
  group by collections.id, profiles.display_name
  order by collections.updated_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 30)
$$;

create or replace function public.list_my_collections()
returns table (
  collection_id uuid,
  title text,
  description text,
  visibility text,
  movie_count bigint,
  save_count bigint,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select collections.id,
         collections.title,
         collections.description,
         collections.visibility,
         count(distinct items.movie_id),
         count(distinct saves.user_id),
         collections.updated_at
  from public.movie_collections collections
  left join public.movie_collection_items items on items.collection_id = collections.id
  left join public.movie_collection_saves saves on saves.collection_id = collections.id
  where auth.uid() is not null and collections.user_id = auth.uid()
  group by collections.id
  order by collections.updated_at desc
$$;

create or replace function public.list_saved_collections()
returns table (
  collection_id uuid,
  author_display_name text,
  title text,
  description text,
  movie_count bigint,
  save_count bigint,
  viewer_saved boolean,
  poster_paths text[],
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select collections.id,
         coalesce(nullif(trim(profiles.display_name), ''), 'FLICK 사용자'),
         collections.title,
         collections.description,
         count(distinct items.movie_id),
         count(distinct saves.user_id),
         true,
         coalesce((array_agg(distinct movies.poster_path) filter (where movies.poster_path is not null))[1:4], '{}'::text[]),
         collections.updated_at
  from public.movie_collections collections
  join public.movie_collection_saves viewer_save on viewer_save.collection_id = collections.id and viewer_save.user_id = auth.uid()
  left join public.profiles profiles on profiles.id = collections.user_id
  left join public.movie_collection_items items on items.collection_id = collections.id
  left join public.movies movies on movies.id = items.movie_id
  left join public.movie_collection_saves saves on saves.collection_id = collections.id
  where auth.uid() is not null and collections.visibility = 'public'
  group by collections.id, profiles.display_name
  order by max(viewer_save.created_at) desc
$$;

create or replace function public.get_movie_collection(p_collection_id uuid)
returns table (
  collection_id uuid,
  owner_user_id uuid,
  author_display_name text,
  title text,
  description text,
  visibility text,
  save_count bigint,
  viewer_saved boolean,
  is_mine boolean,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select collections.id,
         collections.user_id,
         coalesce(nullif(trim(profiles.display_name), ''), 'FLICK 사용자'),
         collections.title,
         collections.description,
         collections.visibility,
         count(distinct saves.user_id),
         bool_or(saves.user_id = auth.uid()),
         collections.user_id = auth.uid(),
         collections.updated_at
  from public.movie_collections collections
  left join public.profiles profiles on profiles.id = collections.user_id
  left join public.movie_collection_saves saves on saves.collection_id = collections.id
  where auth.uid() is not null
    and collections.id = p_collection_id
    and (collections.visibility = 'public' or collections.user_id = auth.uid())
  group by collections.id, profiles.display_name
$$;

create or replace function public.list_movie_collection_items(p_collection_id uuid)
returns table (
  movie_id uuid,
  title text,
  original_title text,
  overview text,
  poster_path text,
  release_date date,
  runtime integer,
  genres text[],
  recommendation_keywords text[],
  vote_average numeric,
  sort_order integer
)
language sql
security definer
set search_path = public
stable
as $$
  select movies.id,
         movies.title,
         movies.original_title,
         movies.overview,
         movies.poster_path,
         movies.release_date,
         movies.runtime,
         movies.genres,
         movies.recommendation_keywords,
         movies.vote_average,
         items.sort_order
  from public.movie_collection_items items
  join public.movie_collections collections on collections.id = items.collection_id
  join public.movies movies on movies.id = items.movie_id
  where auth.uid() is not null
    and collections.id = p_collection_id
    and (collections.visibility = 'public' or collections.user_id = auth.uid())
  order by items.sort_order, items.created_at
$$;

create or replace function public.save_movie_collection(
  p_collection_id uuid,
  p_title text,
  p_description text,
  p_visibility text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_title, ''))) not between 2 and 60 then raise exception 'invalid_collection_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_collection_description'; end if;
  if p_visibility not in ('private', 'public') then raise exception 'invalid_collection_visibility'; end if;

  if p_collection_id is null then
    insert into public.movie_collections (user_id, title, description, visibility)
    values (auth.uid(), trim(p_title), trim(coalesce(p_description, '')), p_visibility)
    returning id into v_id;
  else
    update public.movie_collections
    set title = trim(p_title), description = trim(coalesce(p_description, '')),
        visibility = p_visibility, updated_at = now()
    where id = p_collection_id and user_id = auth.uid()
    returning id into v_id;
    if v_id is null then raise exception 'collection_not_found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_movie_collection(p_collection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  delete from public.movie_collections where id = p_collection_id and user_id = auth.uid();
  if not found then raise exception 'collection_not_found'; end if;
end;
$$;

create or replace function public.add_movie_to_collection(p_collection_id uuid, p_movie_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_order integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.movie_collections where id = p_collection_id and user_id = auth.uid()) then raise exception 'collection_not_found'; end if;
  if not exists (select 1 from public.movies where id = p_movie_id) then raise exception 'movie_not_found'; end if;
  if (select count(*) from public.movie_collection_items where collection_id = p_collection_id) >= 100 then raise exception 'collection_full'; end if;
  select coalesce(max(sort_order), -1) + 1 into v_next_order from public.movie_collection_items where collection_id = p_collection_id;
  insert into public.movie_collection_items (collection_id, movie_id, sort_order)
  values (p_collection_id, p_movie_id, v_next_order)
  on conflict (collection_id, movie_id) do nothing;
  update public.movie_collections set updated_at = now() where id = p_collection_id;
end;
$$;

create or replace function public.remove_movie_from_collection(p_collection_id uuid, p_movie_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.movie_collections where id = p_collection_id and user_id = auth.uid()) then raise exception 'collection_not_found'; end if;
  delete from public.movie_collection_items where collection_id = p_collection_id and movie_id = p_movie_id;
  update public.movie_collections set updated_at = now() where id = p_collection_id;
end;
$$;

create or replace function public.set_movie_collection_saved(p_collection_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.movie_collections where id = p_collection_id and visibility = 'public') then raise exception 'collection_not_found'; end if;
  if coalesce(p_active, false) then
    insert into public.movie_collection_saves (collection_id, user_id) values (p_collection_id, auth.uid()) on conflict do nothing;
  else
    delete from public.movie_collection_saves where collection_id = p_collection_id and user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.list_public_collections(integer) from public;
revoke all on function public.list_my_collections() from public;
revoke all on function public.list_saved_collections() from public;
revoke all on function public.get_movie_collection(uuid) from public;
revoke all on function public.list_movie_collection_items(uuid) from public;
revoke all on function public.save_movie_collection(uuid, text, text, text) from public;
revoke all on function public.delete_movie_collection(uuid) from public;
revoke all on function public.add_movie_to_collection(uuid, uuid) from public;
revoke all on function public.remove_movie_from_collection(uuid, uuid) from public;
revoke all on function public.set_movie_collection_saved(uuid, boolean) from public;

grant execute on function public.list_public_collections(integer) to authenticated;
grant execute on function public.list_my_collections() to authenticated;
grant execute on function public.list_saved_collections() to authenticated;
grant execute on function public.get_movie_collection(uuid) to authenticated;
grant execute on function public.list_movie_collection_items(uuid) to authenticated;
grant execute on function public.save_movie_collection(uuid, text, text, text) to authenticated;
grant execute on function public.delete_movie_collection(uuid) to authenticated;
grant execute on function public.add_movie_to_collection(uuid, uuid) to authenticated;
grant execute on function public.remove_movie_from_collection(uuid, uuid) to authenticated;
grant execute on function public.set_movie_collection_saved(uuid, boolean) to authenticated;

comment on table public.movie_collections is 'User-owned movie collections, private by default and publicly readable only through permission-checked RPCs.';
comment on table public.movie_collection_items is 'Up to 100 ordered movies connected to an owner-managed collection.';
comment on table public.movie_collection_saves is 'Private idempotent saves of public collections.';

-- Rollback: revoke RPCs first and export user collections before dropping these tables.
