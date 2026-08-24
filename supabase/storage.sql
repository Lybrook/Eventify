-- Run this once in the Supabase SQL editor.
-- Django uploads through the server-only service-role key; public visitors only need read access.

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = excluded.public;

create policy "Event images are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'event-images');
