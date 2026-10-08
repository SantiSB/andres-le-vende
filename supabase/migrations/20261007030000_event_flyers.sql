-- Flyers públicos: solo el administrador puede subirlos o eliminarlos.
-- El navegador convierte cada imagen a WebP antes de cargarla.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'event-flyers', 'event-flyers', true, 614400, array['image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admin can upload event flyers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-flyers'
  and name ~ '^flyers/[0-9a-f-]{36}\.webp$'
  and (select app_private.is_admin())
);

create policy "Admin can inspect event flyers"
on storage.objects for select to authenticated
using (
  bucket_id = 'event-flyers'
  and (select app_private.is_admin())
);

create policy "Admin can remove event flyers"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-flyers'
  and (select app_private.is_admin())
);
