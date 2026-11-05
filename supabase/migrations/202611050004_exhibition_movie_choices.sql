begin;
set local lock_timeout='3s';
-- Exhibition visitors can be minors using non-AI mode. Do not expose an
-- unmoderated, rating-sorted cache as the exhibition catalogue.
create table public.exhibition_movie_choices(movie_id uuid primary key references public.movies(id) on delete cascade);
alter table public.exhibition_movie_choices enable row level security;
revoke all on public.exhibition_movie_choices from public,anon,authenticated;
insert into public.exhibition_movie_choices(movie_id)
 select id from public.movies where provider='tmdb' and provider_id in
 ('27205','313369','452166','496243','666277','120467','244786','545611','278','157336','129','508943','354912','150540','269149','862','438631','693134','359940','372058');
create trigger exhibition_member_write before insert or update or delete on public.exhibition_movie_choices for each row execute function public.guard_exhibition_member_write();
create or replace function public.exhibition_movies(p_search text default '') returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from (
 select c.id,c.title,c.original_title,c.overview,c.poster_path,c.release_date,c.genres,c.provider_id from public.movies c
 join public.exhibition_movie_choices choices on choices.movie_id=c.id
 where exists(select 1 from public.exhibition_guests where user_id=auth.uid() and now()<expires_at)
 and (coalesce(p_search,'')='' or strpos(lower(c.title),lower(left(p_search,80)))>0)
 order by c.vote_average desc nulls last,c.id limit 12) m
$$;
create function public.guard_exhibition_movie_choice() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.exhibition_movie_choices where movie_id=new.movie_id) then raise exception 'exhibition_movie_not_selected'; end if;
 return new;
end $$;
revoke all on function public.guard_exhibition_movie_choice() from public,anon,authenticated;
create trigger exhibition_selected_movie before insert or update on public.exhibition_records for each row execute function public.guard_exhibition_movie_choice();
comment on table public.exhibition_movie_choices is 'Operator-selected cached films only. Not a guarantee of suitability for every age; review titles/ratings for the actual exhibition audience.';
commit;
