create policy "Riders upload delivery proof"
on storage.objects for insert to authenticated
with check (bucket_id = 'delivery-proofs');

create policy "Signed in can read delivery proof"
on storage.objects for select to authenticated
using (bucket_id = 'delivery-proofs');