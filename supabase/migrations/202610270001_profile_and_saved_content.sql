-- Additive own-profile fields and a private unified saved-content reader.
begin;
alter table public.profiles add column if not exists bio text not null default '' check(char_length(bio)<=80);
alter table public.profiles add column if not exists avatar_path text check(avatar_path is null or char_length(avatar_path)<=120);

create or replace function public.save_my_profile(p_name text,p_bio text,p_avatar_path text)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  p_name=regexp_replace(trim(p_name),'\s+',' ','g');
  if p_name is null or char_length(p_name) not between 2 and 20
    or p_name !~ '^[[:alnum:]가-힣ㄱ-ㅎㅏ-ㅣ ._-]+$' then raise exception 'invalid_nickname'; end if;
  if p_bio is null or char_length(p_bio)>80 then raise exception 'invalid_bio'; end if;
  if p_avatar_path is not null and (p_avatar_path !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}\.jpg$')
    or not exists(select 1 from storage.objects where bucket_id='core-photos' and name=p_avatar_path and owner_id=auth.uid()::text))
    then raise exception 'invalid_owned_avatar'; end if;
  insert into public.profiles(id,display_name,bio,avatar_path,updated_at)
    values(auth.uid(),p_name,p_bio,p_avatar_path,now())
    on conflict(id) do update set display_name=excluded.display_name,bio=excluded.bio,avatar_path=excluded.avatar_path,updated_at=now();
end $$;
revoke all on function public.save_my_profile(text,text,text) from public,anon;
grant execute on function public.save_my_profile(text,text,text) to authenticated;

create table public.editorial_curation_saves(
  user_id uuid not null references auth.users(id) on delete cascade,
  curation_id uuid not null references public.editorial_curations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,curation_id)
);
alter table public.editorial_curation_saves enable row level security;
create policy editorial_saves_owner on public.editorial_curation_saves for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.editorial_curation_saves from public,anon,authenticated;

create or replace function public.set_editorial_curation_saved(p_curation_id uuid,p_active boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_active is null then raise exception 'invalid_state'; end if;
  if p_active then
    if not exists(select 1 from public.editorial_curations where id=p_curation_id and status='published' and (kind<>'expert' or rights_confirmed)) then raise exception 'curation_not_found'; end if;
    insert into public.editorial_curation_saves(user_id,curation_id) values(auth.uid(),p_curation_id) on conflict do nothing;
  else
    delete from public.editorial_curation_saves where user_id=auth.uid() and curation_id=p_curation_id;
  end if;
end $$;
create or replace function public.is_editorial_curation_saved(p_curation_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and exists(select 1 from public.editorial_curation_saves where user_id=auth.uid() and curation_id=p_curation_id)
$$;

create or replace function public.list_my_saved_content(p_kind text,p_limit integer default 12,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_kind is null or p_kind not in ('movies','reviews','magazines','collections') then raise exception 'invalid_saved_kind'; end if;
  with entries as (
    select m.id,w.updated_at saved_at,jsonb_build_object(
      'id',m.id,'kind','movie','title',m.title,'posterPath',m.poster_path,'subtitle',left(m.release_date::text,4),'savedAt',w.updated_at
    ) payload from public.watchlist w join public.movies m on m.id=w.movie_id
    where p_kind='movies' and w.user_id=auth.uid() and w.status='want_to_watch'
    union all
    select r.id,s.created_at,jsonb_build_object(
      'id',r.id,'kind',case when r.mode='core' then 'magazine' else 'review' end,
      'title',case when r.mode='core' then coalesce(nullif(r.one_line,''),m.title) else m.title end,
      'movieTitle',m.title,'movieId',m.id,'posterPath',m.poster_path,
      'coverPath',case when r.mode='core' then r.core_flow->>'cover' else null end,
      'authorName',coalesce(nullif(p.display_name,''),'FLICK 사용자'),'spoiler',r.spoiler,
      'bodyExcerpt',case when r.spoiler then '' else left(r.body,280) end,
      'rating',r.rating,'watchedAt',r.watched_at,'savedAt',s.created_at,
      'keywords',coalesce(r.light_flow->'representativeKeywords','[]'::jsonb),
      'likeCount',(select count(*) from public.review_likes l where l.review_id=r.id),
      'commentCount',(select count(*) from public.review_comments c where c.review_id=r.id and c.status='visible')
    ) from public.review_saves s join public.reviews r on r.id=s.review_id
      join public.movies m on m.id=r.movie_id left join public.profiles p on p.id=r.user_id
    where s.user_id=auth.uid() and r.visibility='public' and r.status='completed'
      and ((p_kind='reviews' and r.mode='light') or (p_kind='magazines' and r.mode='core'))
    union all
    select c.id,s.created_at,jsonb_build_object(
      'id',c.id,'kind','curation','title',c.title,'subtitle',c.curator_name,'authorName',c.curator_name,
      'bodyExcerpt',left(c.description,280),'savedAt',s.created_at,
      'posterPath',(select m.poster_path from public.editorial_curation_items i join public.movies m on m.id=i.movie_id where i.curation_id=c.id and m.poster_path is not null order by i.sort_order limit 1)
    ) from public.editorial_curation_saves s join public.editorial_curations c on c.id=s.curation_id
    where p_kind='magazines' and s.user_id=auth.uid() and c.status='published' and (c.kind<>'expert' or c.rights_confirmed)
    union all
    select c.id,s.created_at,jsonb_build_object(
      'id',c.id,'kind','collection','title',c.title,'subtitle',left(c.description,100),'authorName',coalesce(p.display_name,'FLICK 사용자'),
      'savedAt',s.created_at,
      'posterPath',(select m.poster_path from public.movie_collection_items i join public.movies m on m.id=i.movie_id where i.collection_id=c.id and m.poster_path is not null order by i.sort_order limit 1)
    ) from public.movie_collection_saves s join public.movie_collections c on c.id=s.collection_id
      left join public.profiles p on p.id=c.user_id
    where p_kind='collections' and s.user_id=auth.uid() and c.visibility='public'
  ) select jsonb_build_object('total',(select count(*) from entries),'items',coalesce((
    select jsonb_agg(page.payload order by page.saved_at desc,page.id desc) from (
      select * from entries order by saved_at desc,id desc limit least(greatest(coalesce(p_limit,12),1),50) offset greatest(coalesce(p_offset,0),0)
    ) page
  ),'[]'::jsonb)) into result;
  return result;
end $$;
revoke all on function public.set_editorial_curation_saved(uuid,boolean) from public,anon;
revoke all on function public.is_editorial_curation_saved(uuid) from public,anon;
revoke all on function public.list_my_saved_content(text,integer,integer) from public,anon;
grant execute on function public.set_editorial_curation_saved(uuid,boolean) to authenticated;
grant execute on function public.is_editorial_curation_saved(uuid) to authenticated;
grant execute on function public.list_my_saved_content(text,integer,integer) to authenticated;
comment on function public.list_my_saved_content(text,integer,integer) is 'Own saved relationships only; hidden/deleted originals disappear. No public profile or private-content access expansion.';
commit;
