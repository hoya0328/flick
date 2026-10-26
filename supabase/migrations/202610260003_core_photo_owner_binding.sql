-- A direct owner UPDATE must not publish a different account's attachment.
begin;
drop policy if exists core_photos_select on storage.objects;
create policy core_photos_select on storage.objects for select to authenticated using (
  bucket_id='core-photos' and (owner_id=auth.uid()::text or exists (
    select 1 from public.reviews r where r.visibility='public' and r.status='completed'
      and r.user_id::text=storage.objects.owner_id
      and (r.core_flow->>'cover'=storage.objects.name or exists (
        select 1 from jsonb_array_elements(
          case when jsonb_typeof(r.core_flow->'blocks')='array' then r.core_flow->'blocks' else '[]'::jsonb end
        ) b where b->>'photo'=storage.objects.name
      ))
  ))
);
commit;
