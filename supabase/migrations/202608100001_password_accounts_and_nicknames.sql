-- Email/password accounts keep credentials in Supabase Auth. Public tables only
-- store profile data such as the user's chosen nickname.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_name text;
begin
  requested_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, display_name)
  values (new.id, left(requested_name, 20))
  on conflict (id) do update
  set display_name = coalesce(public.profiles.display_name, excluded.display_name),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

insert into public.profiles (id, display_name)
select id, left(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), 20)
from auth.users
on conflict (id) do nothing;

comment on function public.handle_new_user_profile() is
  'Creates the owner-only profile row and copies a signup nickname from auth metadata.';
