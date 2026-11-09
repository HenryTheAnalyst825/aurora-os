-- =====================================================================
-- 006_documents.sql: Module Tài liệu (tiếp nhận file, phân quyền theo phòng ban, realtime)
-- Tiên quyết: schema.sql, phase3.sql, step1-lock-accounts.sql, 004_security_patch.sql
-- Chạy trong SQL Editor (sao lưu trước; staging trước nếu bạn đã có).
-- Chỉ THÊM cột, trigger, chính sách Storage; không xóa dữ liệu.
-- =====================================================================

-- 1. Bổ sung thông tin cho bảng documents
alter table public.documents
  add column if not exists description text,
  add column if not exists file_name   text,
  add column if not exists mime_type   text,
  add column if not exists size_bytes  bigint,
  add column if not exists source      text,                       -- nguồn / nhà cung cấp tài liệu
  add column if not exists pinned      boolean not null default false,
  add column if not exists version     integer not null default 1,
  add column if not exists updated_at  timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'documents_size_chk') then
    alter table public.documents add constraint documents_size_chk
      check (size_bytes is null or size_bytes <= 26214400);          -- tối đa 25 MB
  end if;
end $$;

create index if not exists documents_folder_idx  on public.documents (folder_id);
create index if not exists documents_created_idx on public.documents (created_at desc);

-- 2. Tài liệu trong thư mục giới hạn theo phòng ban thì tự thừa hưởng giới hạn đó
create or replace function public.documents_guard() returns trigger
language plpgsql as $$
declare fdept uuid;
begin
  if new.folder_id is not null then
    select department_id into fdept from public.document_folders where id = new.folder_id;
    if fdept is not null then new.department_id := fdept; end if;
  end if;
  if tg_op = 'INSERT' then new.uploaded_by := coalesce(new.uploaded_by, auth.uid()); end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_documents_guard on public.documents;
create trigger trg_documents_guard before insert or update on public.documents
  for each row execute function public.documents_guard();

-- Khi thư mục đổi sang một phòng ban, các tài liệu trong đó cũng được giới hạn theo
create or replace function public.folder_dept_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.department_id is not null and new.department_id is distinct from old.department_id then
    update public.documents set department_id = new.department_id where folder_id = new.id;
  end if;
  return null;
end $$;
drop trigger if exists trg_folder_dept_sync on public.document_folders;
create trigger trg_folder_dept_sync after update on public.document_folders
  for each row execute function public.folder_dept_sync();

-- 3. Quyền truy cập file trong Storage
-- chat/<kênh>/...: theo quyền vào kênh. docs/<id tài liệu>/...: theo quyền xem tài liệu (phòng ban).
create or replace function public.can_access_file(p_name text) returns boolean
language sql stable security definer set search_path = public, storage as $$
  select public.is_admin() or case
    when (storage.foldername(p_name))[1] = 'chat'
     and (storage.foldername(p_name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then public.can_access_channel(((storage.foldername(p_name))[2])::uuid)
    when (storage.foldername(p_name))[1] = 'docs'
    then exists (select 1 from public.documents d
                  where d.storage_path = p_name
                    and (d.department_id is null or d.department_id = public.my_department()))
    else false
  end;
$$;
revoke execute on function public.can_access_file(text) from public, anon;
grant  execute on function public.can_access_file(text) to authenticated;

drop policy if exists files_read   on storage.objects;
drop policy if exists files_insert on storage.objects;
drop policy if exists files_delete on storage.objects;
create policy files_read on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.can_access_file(name));
-- Chỉ admin được tải tài liệu lên docs/; chat/ theo quyền vào kênh
create policy files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (((storage.foldername(name))[1] = 'chat' and public.can_access_file(name)) or public.is_admin()));
create policy files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (owner_id = auth.uid()::text or public.is_admin()));

-- 4. Giới hạn kích thước và loại file ở tầng kho (ngoài kiểm tra ở trình duyệt)
update storage.buckets
   set file_size_limit = 26214400,
       allowed_mime_types = array[
         'application/pdf','application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'text/csv','text/plain','image/png','image/jpeg']
 where id = 'files';

-- 5. Realtime: danh sách tài liệu và thư mục tự cập nhật
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents') then
    alter publication supabase_realtime add table public.documents;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'document_folders') then
    alter publication supabase_realtime add table public.document_folders;
  end if;
end $$;

-- =====================================================================
-- ROLLBACK (chỉ khi cần): drop trigger trg_documents_guard / trg_folder_dept_sync;
-- các cột mới có thể để nguyên (không gây hại). Khôi phục chính sách Storage về bản 004_security_patch.sql.
-- =====================================================================
