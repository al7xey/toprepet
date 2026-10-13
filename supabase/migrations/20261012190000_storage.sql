-- Р2.1: tutor photos (4:5) in a public bucket; a tutor writes only inside the folder named by their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutor-photos', 'tutor-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy tutor_photos_read on storage.objects for select using (bucket_id = 'tutor-photos');
create policy tutor_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tutor-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.my_role() = 'tutor');
create policy tutor_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'tutor-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy tutor_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tutor-photos' and (storage.foldername(name))[1] = auth.uid()::text);
