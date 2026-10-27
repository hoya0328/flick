begin;
alter table public.profiles add column community_public boolean not null default false;
alter table public.admin_access add column can_moderate_posts boolean not null default false;
create table public.user_follows(
 follower_id uuid not null references auth.users(id) on delete cascade,
 following_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(follower_id,following_id),check(follower_id<>following_id)
);
create index follows_target_idx on public.user_follows(following_id,created_at);
create table public.social_posts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 2000),photos text[] not null default '{}' check(cardinality(photos)<=5),
 visibility text not null default 'private' check(visibility in('private','public')),
 status text not null default 'active' check(status in('active','removed','moderated')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),removed_at timestamptz
);
create index posts_owner_time_idx on public.social_posts(user_id,created_at desc);
create index posts_public_time_idx on public.social_posts(created_at desc)where visibility='public' and status='active';
create table public.post_likes(post_id uuid not null references public.social_posts(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
create table public.post_saves(post_id uuid not null references public.social_posts(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
create table public.post_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.social_posts(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,body text not null check(length(trim(body))between 1 and 500),status text not null default 'visible'check(status in('visible','removed')),created_at timestamptz not null default now());
create index post_comments_time_idx on public.post_comments(post_id,created_at);
create index post_comments_user_idx on public.post_comments(user_id,created_at);
create table public.post_reports(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.social_posts(id)on delete cascade,reporter_id uuid not null references auth.users(id)on delete cascade,reason text not null check(reason in('spoiler','harassment','personal_info','copyright','other')),detail text not null default ''check(length(detail)<=500),status text not null default 'open'check(status in('open','resolved')),created_at timestamptz not null default now(),unique(post_id,reporter_id));
create table public.community_notifications(
 id uuid primary key default gen_random_uuid(),recipient_id uuid not null references auth.users(id)on delete cascade,actor_id uuid references auth.users(id)on delete set null,
 kind text not null check(kind in('follow','review_like','review_comment','post_like','post_comment')),
 review_id uuid references public.reviews(id)on delete cascade,post_id uuid references public.social_posts(id)on delete cascade,
 event_key text not null unique,created_at timestamptz not null default now(),read_at timestamptz
);
create index notifications_recipient_time_idx on public.community_notifications(recipient_id,created_at desc);
do $$declare table_name text;begin foreach table_name in array array['user_follows','social_posts','post_likes','post_saves','post_comments','post_reports','community_notifications']loop
 execute format('alter table public.%I enable row level security',table_name);
 execute format('revoke all on public.%I from public,anon,authenticated',table_name);
end loop;end $$;

create function public.community_can_read_post(p_post uuid)returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid()is not null and exists(select 1 from public.social_posts where id=p_post and status='active' and(visibility='public'or user_id=auth.uid()))
$$;
create function public.community_photo_readable(p_path text,p_owner text)returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid()is not null and p_owner is not null and p_path like p_owner||'/%' and(
 exists(select 1 from public.profiles where id::text=p_owner and community_public and avatar_path=p_path)
 or exists(select 1 from public.social_posts where user_id::text=p_owner and visibility='public'and status='active'and p_path=any(photos)))
$$;
revoke all on function public.community_can_read_post(uuid),public.community_photo_readable(text,text)from public,anon;
grant execute on function public.community_can_read_post(uuid),public.community_photo_readable(text,text)to authenticated;
create policy community_public_photos on storage.objects for select to authenticated using(bucket_id='core-photos'and public.community_photo_readable(name,owner_id));

create function public.get_my_community_state()returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 return jsonb_build_object('userId',auth.uid(),'publicProfile',coalesce((select community_public from public.profiles where id=auth.uid()),false),
 'followers',(select count(*)from public.user_follows where following_id=auth.uid()),'following',(select count(*)from public.user_follows where follower_id=auth.uid()),
 'unread',(select count(*)from public.community_notifications where recipient_id=auth.uid()and read_at is null and created_at>now()-interval '30 days'),
 'canConfigureModeration',exists(select 1 from public.admin_access where user_id=auth.uid()and role='super_admin'),
 'canModeratePosts',exists(select 1 from public.admin_access where user_id=auth.uid()and can_moderate_posts));
end $$;
create function public.set_my_public_profile(p_public boolean)returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_public is null then raise exception 'invalid_visibility';end if;
 update public.profiles set community_public=p_public,updated_at=now()where id=auth.uid();
 if not found then raise exception 'profile_not_found';end if;
end $$;
create function public.get_public_member(p_user uuid)returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 select jsonb_build_object('userId',p.id,'name',p.display_name,'bio',p.bio,'avatar',p.avatar_path,'isMine',p.id=auth.uid(),
 'followers',(select count(*)from public.user_follows where following_id=p.id),'following',(select count(*)from public.user_follows where follower_id=p.id),
 'viewerFollows',exists(select 1 from public.user_follows where follower_id=auth.uid()and following_id=p.id),
 'reviewCount',(select count(*)from public.reviews where user_id=p.id and visibility='public'and status='completed'),
 'movieCount',(select count(distinct movie_id)from public.reviews where user_id=p.id and visibility='public'and status='completed'),
 'collectionCount',(select count(*)from public.movie_collections where user_id=p.id and visibility='public'))into result
 from public.profiles p where p.id=p_user and p.community_public;
 return result;
end $$;
create function public.list_public_members(p_query text default '',p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 return coalesce((select jsonb_agg(row_data)from(select jsonb_build_object('userId',p.id,'name',p.display_name,'bio',p.bio,'avatar',p.avatar_path,'viewerFollows',exists(select 1 from public.user_follows where follower_id=auth.uid()and following_id=p.id))row_data
 from public.profiles p where p.community_public and(length(trim(coalesce(p_query,'')))=0 or strpos(lower(p.display_name),lower(left(trim(p_query),30)))>0)
 order by p.updated_at desc,p.id limit 20 offset greatest(0,least(coalesce(p_offset,0),10000)))q),'[]');
end $$;
create function public.set_member_follow(p_target uuid,p_follow boolean)returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_target=auth.uid()or p_follow is null then raise exception 'invalid_follow';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':follow',0));
 if p_follow then
  if not exists(select 1 from public.profiles where id=p_target and community_public)then raise exception 'profile_not_found';end if;
  if not exists(select 1 from public.user_follows where follower_id=auth.uid()and following_id=p_target)and(select count(*)from public.user_follows where follower_id=auth.uid())>=2000 then raise exception 'follow_limit';end if;
  insert into public.user_follows(follower_id,following_id)values(auth.uid(),p_target)on conflict do nothing;
  insert into public.community_notifications(recipient_id,actor_id,kind,event_key)values(p_target,auth.uid(),'follow','follow:'||p_target::text||':'||auth.uid()::text)on conflict(event_key)do nothing;
 else delete from public.user_follows where follower_id=auth.uid()and following_id=p_target;end if;
end $$;
create function public.list_my_connections(p_kind text,p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_kind not in('followers','following')or p_kind is null then raise exception 'invalid_scope';end if;
 return coalesce((select jsonb_agg(row_data)from(select jsonb_build_object('userId',p.id,'name',case when p.community_public then p.display_name else '비공개 프로필'end,'bio',case when p.community_public then p.bio else ''end,'avatar',case when p.community_public then p.avatar_path else null end,'publicProfile',p.community_public,'viewerFollows',exists(select 1 from public.user_follows where follower_id=auth.uid()and following_id=p.id))row_data
 from public.user_follows f join public.profiles p on p.id=case when p_kind='followers'then f.follower_id else f.following_id end
 where(p_kind='followers'and f.following_id=auth.uid())or(p_kind='following'and f.follower_id=auth.uid())
 order by f.created_at desc,p.id limit 20 offset greatest(0,least(coalesce(p_offset,0),10000)))q),'[]');
end $$;

create function public.list_social_posts(p_scope text default 'public',p_user uuid default null,p_post uuid default null,p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_scope is null or p_scope not in('public','following','mine','saved','member','trash','detail')then raise exception 'invalid_scope';end if;
 return coalesce((select jsonb_agg(payload)from(select jsonb_build_object('id',p.id,'body',p.body,'photos',p.photos,'visibility',p.visibility,'status',p.status,'createdAt',p.created_at,'updatedAt',p.updated_at,'removedAt',p.removed_at,'isMine',p.user_id=auth.uid(),
 'authorName',coalesce(nullif(a.display_name,''),'FLICK 사용자'),'authorProfileId',case when a.community_public then a.id else null end,'avatar',case when a.community_public or p.user_id=auth.uid()then a.avatar_path else null end,
 'likeCount',(select count(*)from public.post_likes where post_id=p.id),'commentCount',(select count(*)from public.post_comments where post_id=p.id and status='visible'),
 'viewerLiked',exists(select 1 from public.post_likes where post_id=p.id and user_id=auth.uid()),'viewerSaved',exists(select 1 from public.post_saves where post_id=p.id and user_id=auth.uid()))payload
 from public.social_posts p join public.profiles a on a.id=p.user_id
 where(case when p_scope='trash'then p.user_id=auth.uid()and p.status='removed'and p.removed_at>now()-interval '7 days'else p.status='active'and(p.visibility='public'or p.user_id=auth.uid())end)
 and(case p_scope when 'mine'then p.user_id=auth.uid()when 'member'then p.user_id=p_user and a.community_public and p.visibility='public'
 when 'following'then p.visibility='public'and exists(select 1 from public.user_follows where follower_id=auth.uid()and following_id=p.user_id)
 when 'saved'then exists(select 1 from public.post_saves where post_id=p.id and user_id=auth.uid())
 when 'public'then p.visibility='public'when 'detail'then p.id=p_post else true end)
 order by p.created_at desc,p.id limit 20 offset greatest(0,least(coalesce(p_offset,0),10000)))q),'[]');
end $$;
create function public.save_social_post(p_id uuid,p_body text,p_photos text[],p_visibility text)returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;path text;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_body is null or length(trim(p_body))not between 1 and 2000 then raise exception 'invalid_post';end if;
 if p_visibility is null or p_visibility not in('private','public')or p_photos is null or cardinality(p_photos)>5 then raise exception 'invalid_post';end if;
 foreach path in array p_photos loop
  if path is null or path!~('^'||auth.uid()::text||'/[0-9a-f-]{36}\.jpg$')or not exists(select 1 from storage.objects where bucket_id='core-photos'and name=path and owner_id=auth.uid()::text)then raise exception 'invalid_owned_photo';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':post',0));
 if p_id is null then
  if(select count(*)from public.social_posts where user_id=auth.uid()and created_at>=date_trunc('day',now()))>=10 then raise exception 'post_daily_limit';end if;
  if exists(select 1 from public.social_posts where user_id=auth.uid()and created_at>now()-interval '20 seconds')then raise exception 'post_burst_limit';end if;
  insert into public.social_posts(user_id,body,photos,visibility)values(auth.uid(),trim(p_body),p_photos,p_visibility)returning id into result;
 else
  update public.social_posts set body=trim(p_body),photos=p_photos,visibility=p_visibility,updated_at=now()where id=p_id and user_id=auth.uid()and status='active'returning id into result;
  if result is null then raise exception 'post_not_found';end if;
 end if;
 return result;
end $$;
create function public.set_social_post_removed(p_id uuid,p_removed boolean)returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_removed is null then raise exception 'invalid_post';end if;
 if p_removed then update public.social_posts set status='removed',removed_at=now(),updated_at=now()where id=p_id and user_id=auth.uid()and status='active';
 else update public.social_posts set status='active',removed_at=null,visibility='private',updated_at=now()where id=p_id and user_id=auth.uid()and status='removed'and removed_at>now()-interval '7 days';end if;
 if not found then raise exception 'post_not_found';end if;
end $$;
create function public.set_social_post_reaction(p_post uuid,p_kind text,p_active boolean)returns void language plpgsql security definer set search_path=public as $$
declare owner_id uuid;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if p_kind is null or p_kind not in('like','save')or p_active is null then raise exception 'invalid_reaction';end if;
 if p_active and not exists(select 1 from public.social_posts where id=p_post and visibility='public'and status='active')then raise exception 'post_not_found';end if;
 if p_kind='like'then
  if p_active then
   insert into public.post_likes(post_id,user_id)values(p_post,auth.uid())on conflict do nothing;
   select user_id into owner_id from public.social_posts where id=p_post;
   if owner_id<>auth.uid()then insert into public.community_notifications(recipient_id,actor_id,kind,post_id,event_key)values(owner_id,auth.uid(),'post_like',p_post,'post_like:'||p_post::text||':'||auth.uid()::text)on conflict(event_key)do nothing;end if;
  else delete from public.post_likes where post_id=p_post and user_id=auth.uid();end if;
 else if p_active then insert into public.post_saves(post_id,user_id)values(p_post,auth.uid())on conflict do nothing;else delete from public.post_saves where post_id=p_post and user_id=auth.uid();end if;end if;
end $$;
create function public.list_social_post_comments(p_post uuid,p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not public.community_can_read_post(p_post)then raise exception 'post_not_found';end if;
 return coalesce((select jsonb_agg(payload)from(select jsonb_build_object('id',c.id,'name',coalesce(p.display_name,'FLICK 사용자'),'body',c.body,'createdAt',c.created_at,'isMine',c.user_id=auth.uid(),'authorProfileId',case when p.community_public then p.id else null end)payload
 from public.post_comments c join public.profiles p on p.id=c.user_id where c.post_id=p_post and c.status='visible'order by c.created_at,c.id limit 30 offset greatest(0,least(coalesce(p_offset,0),10000)))q),'[]');
end $$;
create function public.add_social_post_comment(p_post uuid,p_body text)returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;owner_id uuid;
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 select user_id into owner_id from public.social_posts where id=p_post and visibility='public'and status='active';
 if owner_id is null then raise exception 'post_not_found';end if;
 if p_body is null or length(trim(p_body))not between 1 and 500 then raise exception 'invalid_comment';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':post_comment',0));
 if(select count(*)from public.post_comments where user_id=auth.uid()and created_at>=date_trunc('day',now()))>=50 then raise exception 'comment_daily_limit';end if;
 if(select count(*)from public.post_comments where user_id=auth.uid()and created_at>now()-interval '1 minute')>=5 then raise exception 'comment_burst_limit';end if;
 insert into public.post_comments(post_id,user_id,body)values(p_post,auth.uid(),trim(p_body))returning id into result;
 if owner_id<>auth.uid()then insert into public.community_notifications(recipient_id,actor_id,kind,post_id,event_key)values(owner_id,auth.uid(),'post_comment',p_post,'post_comment:'||result::text);end if;
 return result;
end $$;
create function public.remove_social_post_comment(p_id uuid)returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 update public.post_comments set status='removed'where id=p_id and user_id=auth.uid()and status='visible';
 if not found then raise exception 'comment_not_found';end if;
end $$;
create function public.report_social_post(p_post uuid,p_reason text,p_detail text default '')returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if not exists(select 1 from public.social_posts where id=p_post and visibility='public'and status='active'and user_id<>auth.uid())then raise exception 'post_not_found';end if;
 if p_reason is null or p_reason not in('spoiler','harassment','personal_info','copyright','other')or p_detail is null or length(p_detail)>500 then raise exception 'invalid_report';end if;
 insert into public.post_reports(post_id,reporter_id,reason,detail)values(p_post,auth.uid(),p_reason,p_detail)on conflict(post_id,reporter_id)do update set reason=excluded.reason,detail=excluded.detail,status='open';
end $$;

create function public.list_my_notifications(p_offset integer default 0)returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 delete from public.community_notifications where recipient_id=auth.uid()and created_at<now()-interval '30 days';
 return coalesce((select jsonb_agg(payload)from(select jsonb_build_object('id',n.id,'kind',n.kind,'actorName',coalesce(p.display_name,'탈퇴한 사용자'),'actorProfileId',case when p.community_public then p.id else null end,
 'reviewId',n.review_id,'postId',n.post_id,'createdAt',n.created_at,'read',n.read_at is not null)payload from public.community_notifications n left join public.profiles p on p.id=n.actor_id
 where n.recipient_id=auth.uid()order by n.created_at desc,n.id limit 30 offset greatest(0,least(coalesce(p_offset,0),10000)))q),'[]');
end $$;
create function public.mark_my_notifications_read(p_id uuid default null)returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 update public.community_notifications set read_at=coalesce(read_at,now())where recipient_id=auth.uid()and(p_id is null or id=p_id);
end $$;
create function public.notify_review_community()returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid;parent_user uuid;key text;
begin
 select user_id into owner_id from public.reviews where id=new.review_id and visibility='public'and status='completed';
 if owner_id is null then return new;end if;
 if tg_table_name='review_likes'then key='review_like:'||new.review_id::text||':'||new.user_id::text;
 else key='review_comment:'||new.id::text;end if;
 if owner_id<>new.user_id then insert into public.community_notifications(recipient_id,actor_id,kind,review_id,event_key)values(owner_id,new.user_id,case when tg_table_name='review_likes'then 'review_like'else 'review_comment'end,new.review_id,key)on conflict(event_key)do nothing;end if;
 if tg_table_name='review_comments'then
 if new.parent_id is not null then
  select user_id into parent_user from public.review_comments where id=new.parent_id and review_id=new.review_id and status='visible';
  if parent_user is not null and parent_user<>owner_id and parent_user<>new.user_id then insert into public.community_notifications(recipient_id,actor_id,kind,review_id,event_key)values(parent_user,new.user_id,'review_comment',new.review_id,key||':reply')on conflict(event_key)do nothing;end if;
 end if;
 end if;
 return new;
end $$;
create trigger review_like_notification after insert on public.review_likes for each row execute function public.notify_review_community();
create trigger review_comment_notification after insert on public.review_comments for each row execute function public.notify_review_community();

create function public.list_public_author_profiles(p_review_ids uuid[])returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if cardinality(p_review_ids)>50 then raise exception 'too_many_ids';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('reviewId',r.id,'profileId',p.id))from public.reviews r join public.profiles p on p.id=r.user_id where r.id=any(p_review_ids)and r.visibility='public'and r.status='completed'and p.community_public),'[]');
end $$;
create function public.list_member_public_content(p_user uuid)returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid()is null then raise exception 'authentication_required';end if;
 if not exists(select 1 from public.profiles where id=p_user and community_public)then raise exception 'profile_not_found';end if;
 return jsonb_build_object('reviews',coalesce((select jsonb_agg(payload)from(select jsonb_build_object('id',r.id,'title',m.title,'mode',r.mode,'rating',r.rating,'watchedAt',r.watched_at,'posterPath',m.poster_path)payload from public.reviews r join public.movies m on m.id=r.movie_id where r.user_id=p_user and r.visibility='public'and r.status='completed'order by r.updated_at desc,r.id limit 20)q),'[]'),
 'collections',coalesce((select jsonb_agg(payload)from(select jsonb_build_object('id',id,'title',title)payload from public.movie_collections where user_id=p_user and visibility='public'order by updated_at desc,id limit 20)q),'[]'));
end $$;

create function public.set_my_post_moderation(p_enabled boolean)returns void language plpgsql security definer set search_path=public as $$
begin
 if p_enabled is null or not exists(select 1 from public.admin_access where user_id=auth.uid()and role='super_admin')then raise exception 'admin_required';end if;
 update public.admin_access set can_moderate_posts=p_enabled where user_id=auth.uid();
 insert into public.admin_audit_events(admin_user_id,action,target_type,target_id,metadata)values(auth.uid(),'permissions_updated','post_moderation',auth.uid(),jsonb_build_object('enabled',p_enabled));
end $$;
create function public.list_post_reports()returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid()and can_moderate_posts)then raise exception 'admin_required';end if;
 return coalesce((select jsonb_agg(payload)from(select jsonb_build_object('id',r.id,'postId',r.post_id,'reason',r.reason,'detail',r.detail,'createdAt',r.created_at,'body',case when p.status='active'and p.visibility='public'then left(p.body,500)else '현재 비공개이거나 숨겨진 게시물'end)payload
 from public.post_reports r join public.social_posts p on p.id=r.post_id where r.status='open'order by r.created_at limit 50)q),'[]');
end $$;
create function public.moderate_post_report(p_report uuid,p_hide boolean)returns void language plpgsql security definer set search_path=public as $$
declare post uuid;
begin
 if p_hide is null or not exists(select 1 from public.admin_access where user_id=auth.uid()and can_moderate_posts)then raise exception 'admin_required';end if;
 select post_id into post from public.post_reports where id=p_report and status='open'for update;
 if post is null then raise exception 'report_not_found';end if;
 if p_hide then update public.social_posts set status='moderated',updated_at=now()where id=post;end if;
 update public.post_reports set status='resolved'where id=p_report;
 insert into public.admin_audit_events(admin_user_id,action,target_type,target_id,metadata)values(auth.uid(),'permissions_updated','post_report',post,jsonb_build_object('reportId',p_report,'hidden',p_hide));
end $$;

-- RPC-only access. The old RPC signatures/grants and all existing account permissions remain.
do $$declare signature text;begin foreach signature in array array[
 'get_my_community_state()','set_my_public_profile(boolean)','get_public_member(uuid)','list_public_members(text,integer)','set_member_follow(uuid,boolean)','list_my_connections(text,integer)',
 'list_social_posts(text,uuid,uuid,integer)','save_social_post(uuid,text,text[],text)','set_social_post_removed(uuid,boolean)','set_social_post_reaction(uuid,text,boolean)',
 'list_social_post_comments(uuid,integer)','add_social_post_comment(uuid,text)','remove_social_post_comment(uuid)','report_social_post(uuid,text,text)',
 'list_my_notifications(integer)','mark_my_notifications_read(uuid)','list_public_author_profiles(uuid[])','list_member_public_content(uuid)',
 'set_my_post_moderation(boolean)','list_post_reports()','moderate_post_report(uuid,boolean)']loop
 execute 'revoke all on function public.'||signature||' from public,anon';
 execute 'grant execute on function public.'||signature||' to authenticated';
end loop;end $$;
revoke all on function public.notify_review_community()from public,anon,authenticated;
commit;
