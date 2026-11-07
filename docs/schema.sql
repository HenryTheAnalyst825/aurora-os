-- =====================================================================
-- AURORA OS - schema.sql (Supabase / Postgres)
-- Cách dùng: Supabase Dashboard -> SQL Editor -> dán toàn bộ -> Run (chạy 1 lần)
-- Quy ước: mọi logic điểm/Credits, chấm quiz, đăng ký bằng mã chạy ở SERVER
-- (trigger + hàm RPC). Client chỉ gọi hàm, không được sửa trực tiếp.
-- =====================================================================

-- ---------- 0. ENUM ----------
create type public.user_role       as enum ('admin','user');
create type public.task_status     as enum ('todo','in_progress','done');
create type public.task_priority   as enum ('low','medium','high');
create type public.channel_type    as enum ('general','department','project','dm');
create type public.invite_status   as enum ('unused','used','revoked');
create type public.review_status   as enum ('pending','approved','rejected');
create type public.quest_type      as enum ('main','side');
create type public.incident_status as enum ('open','investigating','resolved');

-- ---------- 1. NGƯỜI DÙNG & TỔ CHỨC ----------
create table public.departments (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  slug  text not null unique,
  color text
);

create table public.teams (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  employee_code text not null unique,
  full_name     text not null,
  role          public.user_role not null default 'user',
  department_id uuid references public.departments(id) on delete set null,
  team_id       uuid references public.teams(id) on delete set null,
  credits       integer not null default 0 check (credits >= 0),  -- số dư dùng được
  xp            integer not null default 0,                       -- tổng điểm đã kiếm (xếp hạng)
  avatar_url    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.invite_codes (
  code          text primary key check (code = upper(code)),
  full_name     text not null,
  department_id uuid references public.departments(id) on delete set null,
  team_id       uuid references public.teams(id) on delete set null,
  role          public.user_role not null default 'user',
  status        public.invite_status not null default 'unused',
  used_by       uuid references public.profiles(id) on delete set null,
  used_at       timestamptz,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ---------- 2. CÔNG VIỆC ----------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid references public.profiles(id) on delete set null,
  status      text not null default 'active',
  created_at  timestamptz not null default now()
);

create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  title          text not null,
  description    text,
  status         public.task_status not null default 'todo',
  priority       public.task_priority not null default 'medium',
  assignee_id    uuid references public.profiles(id) on delete set null,
  department_id  uuid references public.departments(id) on delete set null,
  deadline       timestamptz,
  reward_credits integer not null default 0 check (reward_credits >= 0),
  reward_paid_at timestamptz,
  position       double precision not null default 0,  -- thứ tự trong cột (kéo thả)
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create table public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create table public.task_history (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  action     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('task','message','document')),
  entity_id    uuid not null,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- ---------- 3. CHAT ----------
create table public.channels (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  type          public.channel_type not null,
  department_id uuid references public.departments(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (channel_id, user_id)
);

create table public.messages (
  id         bigint generated by default as identity primary key,
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  task_id    uuid references public.tasks(id) on delete set null,  -- chia sẻ task vào chat
  reply_to   bigint references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);

-- ---------- 4. TÀI LIỆU, THÔNG BÁO ----------
create table public.document_folders (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  parent_id     uuid references public.document_folders(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade  -- null = mọi người
);

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  folder_id     uuid references public.document_folders(id) on delete set null,
  title         text not null,
  storage_path  text not null,
  department_id uuid references public.departments(id) on delete cascade, -- null = mọi người
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text not null,
  pinned     boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- 5. GAMIFICATION ----------
create table public.games (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  url           text not null,
  thumbnail_url text,
  department_id uuid references public.departments(id) on delete set null,  -- null = mọi người
  is_active     boolean not null default true,
  sort_order    integer not null default 0
);

create table public.game_claims (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references public.games(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  claimed_score   numeric,
  evidence_url    text,
  note            text,
  status          public.review_status not null default 'pending',
  awarded_credits integer not null default 0,
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table public.quizzes (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  department_id      uuid references public.departments(id) on delete set null,  -- null = mọi người
  time_limit_seconds integer check (time_limit_seconds > 0),
  reward_per_correct integer not null default 10 check (reward_per_correct >= 0),
  is_active          boolean not null default true,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);

create table public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes(id) on delete cascade,
  position    integer not null default 0,
  question    text not null,
  options     jsonb not null,           -- ["Đáp án A","Đáp án B",...]
  explanation text
);

-- Đáp án TÁCH RIÊNG, chỉ admin đọc được (xem RLS bên dưới)
create table public.quiz_answer_keys (
  question_id   uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_index integer not null check (correct_index >= 0)
);

create table public.quiz_submissions (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references public.quizzes(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  answers         jsonb,
  score           integer,
  total           integer,
  credits_awarded integer not null default 0,
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  unique (quiz_id, user_id)             -- mỗi người làm 1 lần
);

create table public.quests (
  id             uuid primary key default gen_random_uuid(),
  type           public.quest_type not null default 'main',
  title          text not null,
  description    text,
  reward_credits integer not null default 0 check (reward_credits >= 0),
  department_id  uuid references public.departments(id) on delete set null,
  is_active      boolean not null default true
);

create table public.quest_progress (
  quest_id     uuid not null references public.quests(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'in_progress'
               check (status in ('in_progress','submitted','approved')),
  submitted_at timestamptz,
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  primary key (quest_id, user_id)
);

-- Sổ cái: mọi thay đổi Credits đều ghi ở đây
create table public.credit_transactions (
  id         bigint generated by default as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null,
  reason     text,
  ref_type   text,
  ref_id     text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.perks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  cost        integer not null check (cost >= 0),
  stock       integer check (stock >= 0),   -- null = không giới hạn
  is_active   boolean not null default true
);

create table public.perk_redemptions (
  id         uuid primary key default gen_random_uuid(),
  perk_id    uuid not null references public.perks(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  cost       integer not null,
  status     text not null default 'pending' check (status in ('pending','fulfilled','cancelled')),
  created_at timestamptz not null default now()
);

create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  icon        text
);

create table public.user_badges (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_id   uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------- 6. VẬN HÀNH ----------
create table public.incidents (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('urgent_order','safety','staffing')),
  title         text not null,
  description   text,
  severity      smallint not null default 1 check (severity between 1 and 3),
  status        public.incident_status not null default 'open',
  department_id uuid references public.departments(id) on delete set null,
  reported_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create table public.incident_updates (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  note        text not null,
  created_at  timestamptz not null default now()
);

-- Bỏ phiếu để sau: bảng proposals chưa có bảng vote
create table public.proposals (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text,
  author_id  uuid references public.profiles(id) on delete set null,
  status     text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reflections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('5whys','improvement')),
  title      text not null,
  content    jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id         bigint generated by default as identity primary key,
  user_id    uuid,
  action     text not null,
  entity     text,
  entity_id  text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create table public.system_state (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- 7. INDEX ----------
create index on public.tasks (project_id, status, position);
create index on public.tasks (assignee_id);
create index on public.task_comments (task_id);
create index on public.task_history (task_id);
create index on public.messages (channel_id, id desc);
create index on public.channel_members (user_id);
create index on public.notifications (user_id, created_at desc);
create index on public.credit_transactions (user_id, created_at desc);
create index on public.game_claims (status);

-- ---------- 8. HÀM TRỢ GIÚP ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' and is_active from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_department() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid();
$$;

create or replace function public.can_access_channel(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.channels c
    where c.id = cid and (
      c.type = 'general'
      or (c.type = 'department' and c.department_id = public.my_department())
      or exists (select 1 from public.channel_members m
                 where m.channel_id = c.id and m.user_id = auth.uid())));
$$;

-- ---------- 9. ĐĂNG KÝ BẰNG MÃ ----------
-- Client gọi: supabase.auth.signUp({ email, password,
--   options: { data: { invite_code: 'NV001' } } })
-- Mã sai/đã dùng -> signUp bị từ chối (client thấy lỗi chung "Database error saving new user").
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v public.invite_codes%rowtype;
begin
  select * into v from public.invite_codes
   where code = upper(trim(new.raw_user_meta_data ->> 'invite_code'))
     and status = 'unused'
   for update;
  if not found then
    raise exception 'Mã đăng ký không hợp lệ hoặc đã được sử dụng';
  end if;
  insert into public.profiles (id, employee_code, full_name, role, department_id, team_id)
  values (new.id, v.code, v.full_name, v.role, v.department_id, v.team_id);
  update public.invite_codes
     set status = 'used', used_by = new.id, used_at = now()
   where code = v.code;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- Chặn user tự sửa role/credits/xp/phòng ban của chính mình
create or replace function public.protect_profile() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated','anon') and not public.is_admin() then
    if new.role <> old.role or new.credits <> old.credits or new.xp <> old.xp
       or new.employee_code <> old.employee_code or new.is_active <> old.is_active
       or new.department_id is distinct from old.department_id
       or new.team_id is distinct from old.team_id then
      raise exception 'Không có quyền thay đổi các trường này';
    end if;
  end if;
  return new;
end $$;

create trigger trg_protect_profile
before update on public.profiles for each row execute function public.protect_profile();

-- ---------- 10. TASK: TRIGGER ----------
create or replace function public.tasks_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    if current_user in ('authenticated','anon') and not public.is_admin() then
      new.reward_credits := 0;
      new.reward_paid_at := null;
    end if;
  else
    if current_user in ('authenticated','anon') and not public.is_admin() then
      if new.reward_credits is distinct from old.reward_credits
         or new.deadline is distinct from old.deadline
         or new.assignee_id is distinct from old.assignee_id
         or new.reward_paid_at is distinct from old.reward_paid_at then
        raise exception 'Chỉ admin được đổi hạn, người phụ trách và điểm thưởng';
      end if;
    end if;
    new.updated_at := now();
    if new.status = 'done' and old.status <> 'done' then
      new.completed_at := now();
    elsif new.status <> 'done' then
      new.completed_at := null;
    end if;
  end if;
  return new;
end $$;

create trigger trg_tasks_guard
before insert or update on public.tasks for each row execute function public.tasks_guard();

create or replace function public.tasks_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_history (task_id, user_id, action, detail)
    values (new.id, auth.uid(), 'created', jsonb_build_object('title', new.title));
  else
    if new.status <> old.status then
      insert into public.task_history (task_id, user_id, action, detail)
      values (new.id, auth.uid(), 'status_changed',
              jsonb_build_object('from', old.status::text, 'to', new.status::text));
    end if;
    if new.assignee_id is distinct from old.assignee_id then
      insert into public.task_history (task_id, user_id, action, detail)
      values (new.id, auth.uid(), 'assignee_changed',
              jsonb_build_object('from', old.assignee_id, 'to', new.assignee_id));
    end if;
    if new.title is distinct from old.title or new.description is distinct from old.description then
      insert into public.task_history (task_id, user_id, action, detail)
      values (new.id, auth.uid(), 'edited', null);
    end if;
  end if;
  return null;
end $$;

create trigger trg_tasks_log
after insert or update on public.tasks for each row execute function public.tasks_log();

-- ---------- 11. HÀM CREDITS / GAME (RPC) ----------
-- Hàm nội bộ: KHÔNG cho client gọi trực tiếp (xem phần quyền EXECUTE ở cuối)
create or replace function public.grant_credits(
  p_user uuid, p_amount integer, p_reason text,
  p_ref_type text default null, p_ref_id text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount = 0 then return; end if;
  update public.profiles
     set credits = credits + p_amount, xp = xp + greatest(p_amount, 0)
   where id = p_user;
  if not found then raise exception 'Không tìm thấy người dùng'; end if;
  insert into public.credit_transactions (user_id, amount, reason, ref_type, ref_id, created_by)
  values (p_user, p_amount, p_reason, p_ref_type, p_ref_id, auth.uid());
end $$;

create or replace function public.admin_adjust_credits(p_user uuid, p_amount integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ admin'; end if;
  perform public.grant_credits(p_user, p_amount, coalesce(p_reason, 'Admin điều chỉnh'), 'admin', null);
end $$;

create or replace function public.award_task_reward(p_task_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.tasks%rowtype;
begin
  if not public.is_admin() then raise exception 'Chỉ admin'; end if;
  select * into t from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Không tìm thấy task'; end if;
  if t.status <> 'done' then raise exception 'Task chưa hoàn thành'; end if;
  if t.reward_paid_at is not null then raise exception 'Đã trả thưởng cho task này'; end if;
  if t.assignee_id is null then raise exception 'Task chưa có người phụ trách'; end if;
  perform public.grant_credits(t.assignee_id, t.reward_credits,
                               'Hoàn thành task: ' || t.title, 'task', t.id::text);
  update public.tasks set reward_paid_at = now() where id = t.id;
end $$;

create or replace function public.review_game_claim(
  p_claim_id uuid, p_approve boolean, p_credits integer default 0)
returns void language plpgsql security definer set search_path = public as $$
declare c public.game_claims%rowtype;
begin
  if not public.is_admin() then raise exception 'Chỉ admin'; end if;
  select * into c from public.game_claims where id = p_claim_id for update;
  if not found or c.status <> 'pending' then raise exception 'Yêu cầu không hợp lệ'; end if;
  update public.game_claims
     set status = (case when p_approve then 'approved' else 'rejected' end)::public.review_status,
         awarded_credits = case when p_approve then greatest(p_credits, 0) else 0 end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = c.id;
  if p_approve then
    perform public.grant_credits(c.user_id, greatest(p_credits, 0), 'Kết quả game', 'game_claim', c.id::text);
  end if;
end $$;

create or replace function public.approve_quest(p_quest_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q public.quests%rowtype; pr public.quest_progress%rowtype;
begin
  if not public.is_admin() then raise exception 'Chỉ admin'; end if;
  select * into q from public.quests where id = p_quest_id;
  select * into pr from public.quest_progress
   where quest_id = p_quest_id and user_id = p_user_id for update;
  if not found or pr.status <> 'submitted' then raise exception 'Nhiệm vụ chưa được nộp'; end if;
  update public.quest_progress
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where quest_id = p_quest_id and user_id = p_user_id;
  perform public.grant_credits(p_user_id, q.reward_credits, 'Nhiệm vụ: ' || q.title, 'quest', q.id::text);
end $$;

create or replace function public.redeem_perk(p_perk_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare pk public.perks%rowtype; bal integer;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select * into pk from public.perks where id = p_perk_id and is_active for update;
  if not found then raise exception 'Quà không khả dụng'; end if;
  if pk.stock is not null and pk.stock <= 0 then raise exception 'Quà đã hết'; end if;
  select credits into bal from public.profiles where id = auth.uid() for update;
  if bal < pk.cost then raise exception 'Không đủ Credits'; end if;
  perform public.grant_credits(auth.uid(), -pk.cost, 'Đổi quà: ' || pk.name, 'perk', pk.id::text);
  if pk.stock is not null then
    update public.perks set stock = stock - 1 where id = pk.id;
  end if;
  insert into public.perk_redemptions (perk_id, user_id, cost) values (pk.id, auth.uid(), pk.cost);
end $$;

-- Bắt đầu quiz: trả về started_at để client đếm ngược (gọi lại vẫn trả mốc cũ)
create or replace function public.start_quiz(p_quiz_id uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v timestamptz;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  if not exists (select 1 from public.quizzes where id = p_quiz_id and is_active) then
    raise exception 'Quiz không khả dụng';
  end if;
  insert into public.quiz_submissions (quiz_id, user_id) values (p_quiz_id, auth.uid())
  on conflict (quiz_id, user_id) do nothing;
  select started_at into v from public.quiz_submissions
   where quiz_id = p_quiz_id and user_id = auth.uid();
  return v;
end $$;

-- Nộp quiz: p_answers = {"<question_id>": <index đáp án đã chọn>, ...}
create or replace function public.submit_quiz(p_quiz_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q public.quizzes%rowtype; s public.quiz_submissions%rowtype;
  v_score integer; v_total integer; v_credits integer; v_late boolean;
begin
  select * into q from public.quizzes where id = p_quiz_id;
  select * into s from public.quiz_submissions
   where quiz_id = p_quiz_id and user_id = auth.uid() for update;
  if not found then raise exception 'Bạn chưa bắt đầu quiz'; end if;
  if s.submitted_at is not null then raise exception 'Bạn đã nộp bài'; end if;
  v_late := q.time_limit_seconds is not null
            and now() > s.started_at + make_interval(secs => q.time_limit_seconds + 10);
  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz_id;
  if v_late then
    v_score := 0;   -- quá giờ: 0 điểm
  else
    select count(*) into v_score
      from public.quiz_questions qq
      join public.quiz_answer_keys k on k.question_id = qq.id
     where qq.quiz_id = p_quiz_id
       and (p_answers ->> qq.id::text) = k.correct_index::text;
  end if;
  v_credits := v_score * q.reward_per_correct;
  update public.quiz_submissions
     set answers = p_answers, score = v_score, total = v_total,
         credits_awarded = v_credits, submitted_at = now()
   where id = s.id;
  perform public.grant_credits(auth.uid(), v_credits, 'Quiz: ' || q.title, 'quiz', q.id::text);
  return jsonb_build_object('score', v_score, 'total', v_total, 'credits', v_credits);
end $$;

-- ---------- 12. BẢNG XẾP HẠNG ----------
create view public.leaderboard with (security_invoker = true) as
  select id, full_name, department_id, xp, credits
    from public.profiles where is_active
   order by xp desc;

-- ---------- 13. RLS ----------
-- 13a. Bảng "ai đăng nhập cũng đọc, chỉ admin ghi"
do $$
declare t text;
begin
  foreach t in array array['departments','teams','projects','games','perks','badges',
      'user_badges','quizzes','quiz_questions','quests','announcements','system_state']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read_%s" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "admin_write_%s" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- 13b. Bảng "chỉ admin" (đáp án quiz, mã đăng ký, nhật ký)
alter table public.quiz_answer_keys enable row level security;
create policy admin_all on public.quiz_answer_keys for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
alter table public.invite_codes enable row level security;
create policy admin_all on public.invite_codes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
alter table public.audit_logs enable row level security;
create policy admin_read on public.audit_logs for select to authenticated using (public.is_admin());

-- 13c. Hồ sơ
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- 13d. Task: mọi người tạo/sửa/kéo thả, chỉ admin xóa
alter table public.tasks enable row level security;
create policy tasks_read   on public.tasks for select to authenticated using (true);
create policy tasks_insert on public.tasks for insert to authenticated with check (true);
create policy tasks_update on public.tasks for update to authenticated using (true) with check (true);
create policy tasks_delete on public.tasks for delete to authenticated using (public.is_admin());

alter table public.task_comments enable row level security;
create policy tc_read   on public.task_comments for select to authenticated using (true);
create policy tc_insert on public.task_comments for insert to authenticated with check (user_id = auth.uid());
create policy tc_modify on public.task_comments for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy tc_delete on public.task_comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

alter table public.task_history enable row level security;
create policy th_read on public.task_history for select to authenticated using (true);

alter table public.attachments enable row level security;
create policy att_read   on public.attachments for select to authenticated using (true);
create policy att_insert on public.attachments for insert to authenticated with check (uploaded_by = auth.uid());
create policy att_delete on public.attachments for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- 13e. Chat
alter table public.channels enable row level security;
create policy ch_read  on public.channels for select to authenticated using (public.can_access_channel(id));
create policy ch_admin on public.channels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.channel_members enable row level security;
create policy cm_read  on public.channel_members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy cm_admin on public.channel_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.messages enable row level security;
create policy msg_read   on public.messages for select to authenticated using (public.can_access_channel(channel_id));
create policy msg_insert on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_channel(channel_id));
create policy msg_update on public.messages for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy msg_delete on public.messages for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 13f. Tài liệu / thông báo
alter table public.document_folders enable row level security;
create policy df_read  on public.document_folders for select to authenticated
  using (department_id is null or department_id = public.my_department() or public.is_admin());
create policy df_admin on public.document_folders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.documents enable row level security;
create policy doc_read  on public.documents for select to authenticated
  using (department_id is null or department_id = public.my_department() or public.is_admin());
create policy doc_admin on public.documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.notifications enable row level security;
create policy nt_read   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy nt_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nt_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy nt_admin  on public.notifications for insert to authenticated with check (public.is_admin());

-- 13g. Gamification
alter table public.game_claims enable row level security;
create policy gc_read   on public.game_claims for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy gc_insert on public.game_claims for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and awarded_credits = 0);

alter table public.quiz_submissions enable row level security;
create policy qs_read on public.quiz_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

alter table public.quest_progress enable row level security;
create policy qp_read   on public.quest_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy qp_insert on public.quest_progress for insert to authenticated
  with check (user_id = auth.uid() and status = 'in_progress');
create policy qp_update on public.quest_progress for update to authenticated
  using (user_id = auth.uid() and status <> 'approved')
  with check (user_id = auth.uid() and status in ('in_progress','submitted'));

alter table public.credit_transactions enable row level security;
create policy ct_read on public.credit_transactions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

alter table public.perk_redemptions enable row level security;
create policy pr_read  on public.perk_redemptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy pr_admin on public.perk_redemptions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 13h. Vận hành
alter table public.incidents enable row level security;
create policy inc_read   on public.incidents for select to authenticated using (true);
create policy inc_insert on public.incidents for insert to authenticated with check (reported_by = auth.uid());
create policy inc_update on public.incidents for update to authenticated
  using (reported_by = auth.uid() or public.is_admin())
  with check (reported_by = auth.uid() or public.is_admin());
create policy inc_delete on public.incidents for delete to authenticated using (public.is_admin());

alter table public.incident_updates enable row level security;
create policy iu_read   on public.incident_updates for select to authenticated using (true);
create policy iu_insert on public.incident_updates for insert to authenticated with check (user_id = auth.uid());

alter table public.proposals enable row level security;
create policy pp_read   on public.proposals for select to authenticated using (true);
create policy pp_insert on public.proposals for insert to authenticated with check (author_id = auth.uid());
create policy pp_update on public.proposals for update to authenticated
  using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy pp_delete on public.proposals for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

alter table public.reflections enable row level security;
create policy rf_read   on public.reflections for select to authenticated using (true);
create policy rf_insert on public.reflections for insert to authenticated with check (user_id = auth.uid());
create policy rf_modify on public.reflections for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy rf_delete on public.reflections for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------- 14. QUYỀN GỌI HÀM ----------
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated;
revoke execute on function public.grant_credits(uuid, integer, text, text, text) from authenticated;

-- ---------- 15. REALTIME ----------
alter publication supabase_realtime add table
  public.tasks, public.task_comments, public.messages, public.notifications;

-- ---------- 16. STORAGE (file đính kèm, tài liệu) ----------
insert into storage.buckets (id, name, public) values ('files', 'files', false)
on conflict (id) do nothing;
create policy files_read   on storage.objects for select to authenticated using (bucket_id = 'files');
create policy files_insert on storage.objects for insert to authenticated with check (bucket_id = 'files');
create policy files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (owner_id = auth.uid()::text or public.is_admin()));

-- ---------- 17. DỮ LIỆU KHỞI TẠO ----------
insert into public.departments (name, slug, color) values
  ('Sản xuất','san-xuat','#c2410c'), ('QC','qc','#0f766e'), ('R&D','rd','#4338ca'),
  ('EHS','ehs','#15803d'), ('HR','hr','#be185d'), ('Tài chính','tai-chinh','#a16207');
insert into public.teams (name) values ('Đội dự án 1'), ('Đội dự án 2');

insert into public.channels (name, type) values ('general-factory', 'general');
insert into public.channels (name, type, department_id)
  select 'phong-' || slug, 'department', id from public.departments;

insert into public.projects (name, description)
  values ('Mở rộng dây chuyền +30% sản lượng', 'Aurora Precision Vietnam');

-- Mã admin đầu tiên: đăng ký bằng mã này trên web (nhớ ĐỔI mã trước khi dùng thật)
insert into public.invite_codes (code, full_name, role)
  values ('ADMIN-0001', 'Quản trị viên', 'admin');
