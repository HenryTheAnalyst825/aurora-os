-- =====================================================================
-- AURORA OS - BẢN VÁ TỔNG HỢP (GỘP PHASE 3 + KHÓA TÀI KHOẢN + VÁ BẢO MẬT 004)
-- Cách dùng: Nếu bạn đã chạy schema.sql ban đầu, hãy dán file này vào
-- Supabase SQL Editor và bấm Run để cập nhật đầy đủ hệ thống.
-- =====================================================================

-- ================= [PHẦN 1: PHASE 3 - CHAT & THÀNH VIÊN] =================
-- =====================================================================
-- phase3.sql: chạy 1 lần trong SQL Editor SAU schema.sql (bổ sung cho Chat)
-- =====================================================================

-- 1. File đính kèm trong tin nhắn (lưu trong bucket 'files' của Storage)
alter table public.messages
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_size bigint;

-- 2. Kênh dự án: mọi người đã đăng nhập đều vào được (Kanban cũng ai cũng xem được)
create or replace function public.can_access_channel(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.channels c
    where c.id = cid and (
      c.type in ('general','project')
      or (c.type = 'department' and c.department_id = public.my_department())
      or exists (select 1 from public.channel_members m
                 where m.channel_id = c.id and m.user_id = auth.uid())));
$$;

-- 3. Mỗi dự án có một kênh chat riêng (tạo tự động, và bù cho dự án đã có)
create or replace function public.projects_channel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.channels (name, type, project_id, created_by)
  values (new.name, 'project', new.id, auth.uid());
  return new;
end $$;

drop trigger if exists trg_projects_channel on public.projects;
create trigger trg_projects_channel
after insert on public.projects for each row execute function public.projects_channel();

insert into public.channels (name, type, project_id)
select p.name, 'project', p.id from public.projects p
where not exists (select 1 from public.channels c where c.project_id = p.id);

-- 4. Tin nhắn riêng (DM): tìm hoặc tạo kênh giữa 2 người
create or replace function public.get_or_create_dm(p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null or p_other = auth.uid() then
    raise exception 'Không thể nhắn tin riêng với chính mình';
  end if;
  if not exists (select 1 from public.profiles where id = p_other and is_active) then
    raise exception 'Người dùng không tồn tại';
  end if;
  select c.id into cid from public.channels c
   where c.type = 'dm'
     and exists (select 1 from public.channel_members m where m.channel_id = c.id and m.user_id = auth.uid())
     and exists (select 1 from public.channel_members m where m.channel_id = c.id and m.user_id = p_other)
   limit 1;
  if cid is null then
    insert into public.channels (type, created_by) values ('dm', auth.uid()) returning id into cid;
    insert into public.channel_members (channel_id, user_id) values (cid, auth.uid()), (cid, p_other);
  end if;
  return cid;
end $$;

-- 5. Danh sách DM của tôi, kèm tên người kia
create or replace function public.my_dm_channels()
returns table (dm_channel_id uuid, other_id uuid, other_name text)
language sql stable security definer set search_path = public as $$
  select m1.channel_id, m2.user_id, p.full_name
    from public.channel_members m1
    join public.channels c on c.id = m1.channel_id and c.type = 'dm'
    join public.channel_members m2 on m2.channel_id = m1.channel_id and m2.user_id <> m1.user_id
    join public.profiles p on p.id = m2.user_id
   where m1.user_id = auth.uid();
$$;

revoke execute on function public.get_or_create_dm(uuid), public.my_dm_channels(), public.projects_channel() from public, anon;
grant  execute on function public.get_or_create_dm(uuid), public.my_dm_channels() to authenticated;


-- ================= [PHẦN 2: UPDATE 1 - KHÓA / MỞ KHÓA TÀI KHOẢN] =================
-- =====================================================================
-- step1-lock-accounts.sql: chạy 1 lần trong SQL Editor (sau schema.sql và phase3.sql)
-- Khóa tài khoản thật sự: người bị tắt "Hoạt động" không đọc/ghi được dữ liệu nào,
-- kể cả khi họ gọi API trực tiếp bằng phiên đăng nhập còn hiệu lực.
-- =====================================================================

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false);
$$;
revoke execute on function public.is_active_user() from public, anon;
grant  execute on function public.is_active_user() to authenticated;

-- Chính sách RESTRICTIVE: được cộng (AND) với mọi chính sách hiện có trên mỗi bảng
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'profiles'
  loop
    execute format('drop policy if exists active_only on public.%I', t);
    execute format('create policy active_only on public.%I as restrictive for all to authenticated using (public.is_active_user()) with check (public.is_active_user())', t);
  end loop;
end $$;

-- Bảng hồ sơ: người bị khóa vẫn đọc được hồ sơ của chính mình để app báo "Tài khoản đã bị khóa"
drop policy if exists active_only on public.profiles;
create policy active_only on public.profiles as restrictive for all to authenticated
  using (public.is_active_user() or id = auth.uid())
  with check (public.is_active_user() or id = auth.uid());

-- File trong Storage
drop policy if exists active_only on storage.objects;
create policy active_only on storage.objects as restrictive for all to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

-- Hai hàm nhắn riêng cũng phải chặn người bị khóa
create or replace function public.get_or_create_dm(p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null or p_other = auth.uid() then
    raise exception 'Không thể nhắn tin riêng với chính mình';
  end if;
  if not public.is_active_user() then raise exception 'Tài khoản đã bị khóa'; end if;
  if not exists (select 1 from public.profiles where id = p_other and is_active) then
    raise exception 'Người dùng không tồn tại';
  end if;
  select c.id into cid from public.channels c
   where c.type = 'dm'
     and exists (select 1 from public.channel_members m where m.channel_id = c.id and m.user_id = auth.uid())
     and exists (select 1 from public.channel_members m where m.channel_id = c.id and m.user_id = p_other)
   limit 1;
  if cid is null then
    insert into public.channels (type, created_by) values ('dm', auth.uid()) returning id into cid;
    insert into public.channel_members (channel_id, user_id) values (cid, auth.uid()), (cid, p_other);
  end if;
  return cid;
end $$;

create or replace function public.my_dm_channels()
returns table (dm_channel_id uuid, other_id uuid, other_name text)
language sql stable security definer set search_path = public as $$
  select m1.channel_id, m2.user_id, p.full_name
    from public.channel_members m1
    join public.channels c on c.id = m1.channel_id and c.type = 'dm'
    join public.channel_members m2 on m2.channel_id = m1.channel_id and m2.user_id <> m1.user_id
    join public.profiles p on p.id = m2.user_id
   where m1.user_id = auth.uid() and public.is_active_user();
$$;


-- ================= [PHẦN 3: UPDATE 2 - BẢN VÁ BẢO MẬT 004] =================
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

