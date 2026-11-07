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
