-- Queued for the final five-stage publication. Never applied implicitly.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
alter table public.social_posts add column content_blocks jsonb not null default '[]';
alter table public.post_comments add column parent_id uuid references public.post_comments(id) on delete cascade;
create index post_replies_idx on public.post_comments(parent_id,created_at);
create table public.post_poll_votes(post_id uuid references public.social_posts(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,option_index integer not null check(option_index between 0 and 4),primary key(post_id,user_id));
create table public.post_question_answers(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.social_posts(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,body text not null check(length(trim(body))between 1 and 500),hidden boolean not null default false,created_at timestamptz not null default now(),unique(post_id,user_id));
create table public.post_comment_likes(comment_id uuid references public.post_comments(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,primary key(comment_id,user_id));
create index post_answers_recent_idx on public.post_question_answers(post_id,created_at desc,id);
create index post_answers_user_recent_idx on public.post_question_answers(user_id,created_at desc);
alter table public.post_poll_votes enable row level security;
alter table public.post_question_answers enable row level security;
alter table public.post_comment_likes enable row level security;
revoke all on public.post_poll_votes,public.post_question_answers,public.post_comment_likes from public,anon,authenticated;

create function public.feed_v3_status()returns boolean language sql stable set search_path=public,pg_temp as $$select auth.uid()is not null$$;
create function public.feed_blocks_checked(p_blocks jsonb)returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare b jsonb;t text;seen text[]:='{}';choices text[];result jsonb:='[]';m uuid;
begin
 if p_blocks is null or jsonb_typeof(p_blocks)<>'array' or jsonb_array_length(p_blocks)>3 then raise exception 'invalid_blocks';end if;
 for b in select value from jsonb_array_elements(p_blocks)loop
  t:=b->>'type';if t is null or t=any(seen)then raise exception 'invalid_blocks';end if;seen:=array_append(seen,t);
  if t='movie'then
   begin m:=(b->>'movieId')::uuid;exception when others then raise exception 'invalid_movie';end;
   if m is null or not exists(select 1 from public.movies where id=m)then raise exception 'invalid_movie';end if;
   result:=result||jsonb_build_array(jsonb_build_object('type',t,'movieId',m));
  elsif t='poll'then
   if jsonb_typeof(b->'options')is distinct from 'array'then raise exception 'invalid_poll';end if;
   if exists(select 1 from jsonb_array_elements(b->'options')q where jsonb_typeof(q.value)<>'string')then raise exception 'invalid_poll';end if;
   select array_agg(trim(value))into choices from jsonb_array_elements_text(b->'options');
   if coalesce(cardinality(choices),0)not between 2 and 5 or exists(select 1 from unnest(choices)o where length(o)not between 1 and 80)or(select count(distinct lower(o))from unnest(choices)o)<>cardinality(choices)then raise exception 'invalid_poll';end if;
   result:=result||jsonb_build_array(jsonb_build_object('type',t,'options',choices));
  elsif t='question'then
   if jsonb_typeof(b->'prompt')is distinct from 'string'or length(trim(b->>'prompt'))not between 1 and 120 then raise exception 'invalid_question';end if;
   result:=result||jsonb_build_array(jsonb_build_object('type',t,'prompt',trim(b->>'prompt')));
  else raise exception 'invalid_blocks';end if;
 end loop;return result;
end $$;
create function public.save_social_post_v3(p_id uuid,p_body text,p_photos text[],p_visibility text,p_blocks jsonb)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare checked jsonb;old_blocks jsonb;result uuid;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 checked:=public.feed_blocks_checked(p_blocks);
 if p_id is not null then
  select content_blocks into old_blocks from public.social_posts where id=p_id and user_id=auth.uid()and status='active'for update;
  if not found then raise exception 'post_not_found';end if;
  if exists(select 1 from public.post_poll_votes where post_id=p_id)and(select value from jsonb_array_elements(old_blocks)where value->>'type'='poll')is distinct from(select value from jsonb_array_elements(checked)where value->>'type'='poll')then raise exception 'poll_locked';end if;
  if exists(select 1 from public.post_question_answers where post_id=p_id)and(select value from jsonb_array_elements(old_blocks)where value->>'type'='question')is distinct from(select value from jsonb_array_elements(checked)where value->>'type'='question')then raise exception 'question_locked';end if;
 end if;
 result:=public.save_social_post(p_id,p_body,p_photos,p_visibility);
 update public.social_posts set content_blocks=checked where id=result;
 return result;
end $$;
create function public.list_social_posts_v3(p_scope text default 'public',p_user uuid default null,p_post uuid default null,p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare row jsonb;b jsonb;blocks jsonb;payload jsonb;result jsonb:='[]';pid uuid;owner uuid;counts jsonb;total bigint;choice integer;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 for row in select value from jsonb_array_elements(public.list_social_posts(p_scope,p_user,p_post,p_offset))loop
  pid:=(row->>'id')::uuid;select content_blocks,user_id into blocks,owner from public.social_posts where id=pid;
  payload:=row||jsonb_build_object('blocks',blocks,'viewerFollows',exists(select 1 from public.user_follows where follower_id=auth.uid()and following_id=owner));
  for b in select value from jsonb_array_elements(blocks)loop
   if b->>'type'='movie'then
    payload:=payload||jsonb_build_object('movie',(select jsonb_build_object('id',id,'provider','tmdb','providerId',provider_id,'title',title,'originalTitle',original_title,'posterPath',poster_path,'releaseDate',release_date,'runtime',runtime,'overview',overview,'genres',coalesce(genres,'{}'),'recommendationKeywords',coalesce(recommendation_keywords,'{}'),'voteAverage',vote_average,'details',null,'detailsSource','cache','detailsStatus','summary','detailsFetchedAt',null)from public.movies where id=(b->>'movieId')::uuid));
   elsif b->>'type'='poll'then
    select count(*)into total from public.post_poll_votes where post_id=pid;
    select option_index into choice from public.post_poll_votes where post_id=pid and user_id=auth.uid();
    select jsonb_agg((select count(*)from public.post_poll_votes where post_id=pid and option_index=i)order by i)into counts from generate_series(0,jsonb_array_length(b->'options')-1)i;
    payload:=payload||jsonb_build_object('poll',jsonb_build_object('options',b->'options','counts',counts,'total',total,'mine',choice));
   elsif b->>'type'='question'then
    payload:=payload||jsonb_build_object('question',jsonb_build_object('prompt',b->>'prompt','count',(select count(*)from public.post_question_answers where post_id=pid and not hidden),'answered',exists(select 1 from public.post_question_answers where post_id=pid and user_id=auth.uid()),'canAnswer',owner<>auth.uid()and(row->>'visibility')='public'and exists(select 1 from public.user_follows where follower_id=auth.uid()and following_id=owner)and not exists(select 1 from public.post_question_answers where post_id=pid and user_id=auth.uid())));
   end if;
  end loop;result:=result||jsonb_build_array(payload);
 end loop;return result;
end $$;
create function public.vote_social_post(p_post uuid,p_option integer)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare blocks jsonb;n integer;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 select content_blocks into blocks from public.social_posts where id=p_post and status='active'and visibility='public'for update;
 if not found then raise exception 'post_not_found';end if;
 select jsonb_array_length(value->'options')into n from jsonb_array_elements(blocks)where value->>'type'='poll';
 if n is null or p_option is null or p_option<0 or p_option>=n then raise exception 'invalid_poll';end if;
 insert into public.post_poll_votes(post_id,user_id,option_index)values(p_post,auth.uid(),p_option)on conflict(post_id,user_id)do update set option_index=excluded.option_index;
end $$;
create function public.answer_social_question(p_post uuid,p_body text)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid;result uuid;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 select user_id into owner from public.social_posts where id=p_post and status='active'and visibility='public'and exists(select 1 from jsonb_array_elements(content_blocks)b where b->>'type'='question')for update;
 if not found then raise exception 'post_not_found';end if;
 if owner=auth.uid()or not exists(select 1 from public.user_follows where follower_id=auth.uid()and following_id=owner)then raise exception 'follower_required';end if;
 if p_body is null or length(trim(p_body))not between 1 and 500 then raise exception 'invalid_answer';end if;
 if exists(select 1 from public.post_question_answers where post_id=p_post and user_id=auth.uid())then raise exception 'already_answered';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':anon_answer',0));
 if(select count(*)from public.post_question_answers where user_id=auth.uid()and created_at>now()-interval '1 day')>=20 then raise exception 'answer_limit';end if;
 insert into public.post_question_answers(post_id,user_id,body)values(p_post,auth.uid(),trim(p_body))returning id into result;return result;
end $$;
create function public.list_social_answers(p_post uuid)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare owner uuid;
begin
 if not public.community_can_read_post(p_post)then raise exception 'post_not_found';end if;
 select user_id into owner from public.social_posts where id=p_post;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'body',body,'createdAt',created_at,'isMine',user_id=auth.uid())order by created_at,id)from(select id,body,created_at,user_id from public.post_question_answers where post_id=p_post and not hidden and(owner=auth.uid()or user_id=auth.uid())order by created_at desc,id desc limit 50)a),'[]');
end $$;
create function public.hide_social_answer(p_id uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 update public.post_question_answers a set hidden=true from public.social_posts p where a.id=p_id and p.id=a.post_id and(p.user_id=auth.uid()or a.user_id=auth.uid())and public.community_can_read_post(p.id);
 if not found then raise exception 'answer_not_found';end if;
end $$;
create function public.add_social_post_comment_v3(p_post uuid,p_body text,p_parent uuid default null)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;parent_user uuid;post_user uuid;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_parent is not null then
  select user_id into parent_user from public.post_comments where id=p_parent and post_id=p_post and parent_id is null and status='visible' for share;
  if not found then raise exception 'invalid_parent';end if;
 end if;
 result:=public.add_social_post_comment(p_post,p_body);
 update public.post_comments set parent_id=p_parent where id=result;
 select user_id into post_user from public.social_posts where id=p_post;
 if parent_user is not null and parent_user<>auth.uid()and parent_user<>post_user then insert into public.community_notifications(recipient_id,actor_id,kind,post_id,event_key)values(parent_user,auth.uid(),'post_comment',p_post,'post_reply:'||result::text)on conflict(event_key)do nothing;end if;
 return result;
end $$;
create function public.list_social_post_comments_v3(p_post uuid,p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.community_can_read_post(p_post)then raise exception 'post_not_found';end if;
 return coalesce((with roots as(select c.id from public.post_comments c where post_id=p_post and parent_id is null and(status='visible'or exists(select 1 from public.post_comments r where r.parent_id=c.id and r.status='visible'))order by created_at,id limit 30 offset greatest(0,least(coalesce(p_offset,0),10000))),selected as(select c.* from public.post_comments c where c.id in(select id from roots)union all select r.* from roots cross join lateral(select c.* from public.post_comments c where c.parent_id=roots.id and c.status='visible'order by created_at,id limit 30)r)
 select jsonb_agg(jsonb_build_object('id',c.id,'name',case when c.status='removed'then '삭제된 댓글'else coalesce(p.display_name,'FLICK 사용자')end,'body',case when c.status='removed'then ''else c.body end,'createdAt',c.created_at,'isMine',c.user_id=auth.uid(),'authorProfileId',case when c.status='visible'and p.community_public then p.id else null end,'avatar',case when c.status='visible'and(p.community_public or c.user_id=auth.uid())then p.avatar_path else null end,'parentId',c.parent_id,'removed',c.status='removed','isPostAuthor',c.user_id=(select user_id from public.social_posts where id=p_post),'likeCount',(select count(*)from public.post_comment_likes where comment_id=c.id),'viewerLiked',exists(select 1 from public.post_comment_likes where comment_id=c.id and user_id=auth.uid()))order by c.created_at,c.id)from selected c join public.profiles p on p.id=c.user_id),'[]');
end $$;
create function public.like_social_comment(p_comment uuid,p_active boolean)returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_active is null or not exists(select 1 from public.post_comments c join public.social_posts p on p.id=c.post_id where c.id=p_comment and c.status='visible'and p.visibility='public'and p.status='active')then raise exception 'comment_not_found';end if;
 if p_active then insert into public.post_comment_likes values(p_comment,auth.uid())on conflict do nothing;else delete from public.post_comment_likes where comment_id=p_comment and user_id=auth.uid();end if;
end $$;
revoke all on function public.feed_blocks_checked(jsonb)from public,anon,authenticated;
do $$declare signature text;begin foreach signature in array array['feed_v3_status()','save_social_post_v3(uuid,text,text[],text,jsonb)','list_social_posts_v3(text,uuid,uuid,integer)','vote_social_post(uuid,integer)','answer_social_question(uuid,text)','list_social_answers(uuid)','hide_social_answer(uuid)','add_social_post_comment_v3(uuid,text,uuid)','list_social_post_comments_v3(uuid,integer)','like_social_comment(uuid,boolean)']loop execute 'revoke all on function public.'||signature||' from public,anon';execute 'grant execute on function public.'||signature||' to authenticated';end loop;end $$;
notify pgrst,'reload schema';
commit;
