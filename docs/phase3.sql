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
