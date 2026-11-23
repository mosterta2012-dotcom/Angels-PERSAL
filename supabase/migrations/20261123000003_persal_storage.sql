-- Private bucket for HR documents (contracts, certificates, signed balances). HR core only.
insert into storage.buckets (id, name, public) values ('hr-documents', 'hr-documents', false)
on conflict (id) do nothing;

create policy hr_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'hr-documents' and public.is_hr_core());
create policy hr_docs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'hr-documents' and (public.has_role('hod_hr') or public.has_role('hr_admin')));
-- Employees may upload a medical certificate into their own folder: hr-documents/certificates/<auth uid>/...
create policy hr_docs_own_certificate on storage.objects for insert to authenticated
  with check (bucket_id = 'hr-documents' and (storage.foldername(name))[1] = 'certificates'
              and (storage.foldername(name))[2] = auth.uid()::text);
