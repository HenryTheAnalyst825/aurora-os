-- =====================================================================
-- 004_security_patch.sql: chạy trong SQL Editor (staging trước, rồi production)
-- Vá 1: file trong Storage chỉ đọc/ghi được nếu có quyền vào kênh chat chứa file đó
-- =====================================================================

drop policy if exists files_read   on storage.objects;
drop policy if exists files_insert on storage.objects;
drop policy if exists files_delete on storage.objects;

-- Đường dẫn file chat có dạng: chat/<channel_id>/<tên file>
-- Dùng CASE để không ép kiểu uuid khi đường dẫn không đúng dạng (tránh lỗi truy vấn)
create or replace function public.can_access_file(p_name text) returns boolean
language sql stable security definer set search_path = public, storage as $$
  select public.is_admin() or case
    when (storage.foldername(p_name))[1] = 'chat'
     and (storage.foldername(p_name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then public.can_access_channel(((storage.foldername(p_name))[2])::uuid)
    else false
  end;
$$;
revoke execute on function public.can_access_file(text) from public, anon;
grant  execute on function public.can_access_file(text) to authenticated;

create policy files_read on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.can_access_file(name));
create policy files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and public.can_access_file(name));
create policy files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (owner_id = auth.uid()::text or public.is_admin()));

-- =====================================================================
-- Vá 2: kiểm tra mã đăng ký (chạy từng câu, xem kết quả)
-- =====================================================================
-- a) Không được còn mã admin nào chưa dùng (kết quả phải rỗng):
--    select code from public.invite_codes where role = 'admin' and status = 'unused';
-- b) Thu hồi mã chưa dùng quá ngắn/dễ đoán (như NV001), rồi cấp lại mã ngẫu nhiên trong trang Mã đăng ký:
--    update public.invite_codes set status = 'revoked' where status = 'unused' and length(code) < 8;
