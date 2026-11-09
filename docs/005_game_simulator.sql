-- =====================================================================
-- 005_game_simulator.sql: Trung tâm Giả lập Nghiệp vụ (6 mini-game)
-- Chỉ THÊM MỚI: 1 bảng, 4 hàm, 2 dòng cấu hình. Không sửa hay xóa dữ liệu sẵn có.
-- Chạy trong SQL Editor (nên sao lưu trước; staging trước nếu bạn đã có).
-- Tiên quyết: đã chạy schema.sql, phase3.sql, step1-lock-accounts.sql (hàm is_active_user).
-- =====================================================================

-- 1. Lịch sử các ca chơi (nguồn dữ liệu cho bảng xếp hạng)
create table if not exists public.game_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  game_key        text not null check (game_key in ('accounting','qc','hr','ehs','production','rnd')),
  seed            integer not null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  correct         integer,
  wrong           integer,
  score           integer,
  credits_awarded integer not null default 0,
  progress_bonus  numeric(5,2) not null default 0
);
create index if not exists game_sessions_user_idx  on public.game_sessions (user_id, started_at desc);
create index if not exists game_sessions_board_idx on public.game_sessions (game_key, score desc) where finished_at is not null;

alter table public.game_sessions enable row level security;
drop policy if exists gs_read on public.game_sessions;
create policy gs_read on public.game_sessions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- Không có chính sách ghi: client chỉ ghi qua hàm bên dưới.
drop policy if exists active_only on public.game_sessions;
create policy active_only on public.game_sessions as restrictive for all to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

-- 2. Cấu hình (admin chỉnh trong Table Editor, bảng system_state)
insert into public.system_state (key, value) values
  ('game_config', '{
    "seconds": 60,
    "max_decisions": 40,
    "credits_per_point": 0.5,
    "max_credits_per_session": 100,
    "max_credit_sessions_per_day": 10,
    "progress_bonus_threshold": 50,
    "progress_bonus_per_session": 0.5,
    "progress_bonus_cap": 25,
    "progress_bonus_sessions_per_user_per_day": 3
  }'::jsonb),
  ('game_progress_bonus', '0'::jsonb)
on conflict (key) do nothing;

-- Để thanh tiến độ tự cập nhật khi có điểm thưởng
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'system_state') then
    alter publication supabase_realtime add table public.system_state;
  end if;
end $$;

-- 3. Bắt đầu một ca: server cấp mã ca và hạt giống ngẫu nhiên
create or replace function public.start_game_session(p_game text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cfg jsonb; sid uuid; sd integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Chưa đăng nhập hoặc tài khoản đã bị khóa';
  end if;
  if p_game not in ('accounting','qc','hr','ehs','production','rnd') then
    raise exception 'Game không tồn tại';
  end if;
  if exists (select 1 from public.game_sessions
              where user_id = auth.uid() and started_at > now() - interval '10 seconds') then
    raise exception 'Vui lòng chờ vài giây rồi bắt đầu lại';
  end if;
  select value into cfg from public.system_state where key = 'game_config';
  sd := floor(random() * 2147483646)::integer + 1;
  insert into public.game_sessions (user_id, game_key, seed) values (auth.uid(), p_game, sd) returning id into sid;
  return jsonb_build_object('session_id', sid, 'seed', sd, 'seconds', coalesce((cfg ->> 'seconds')::integer, 60));
end $$;

-- 4. Kết thúc ca: server tự tính điểm, Credits, thưởng tiến độ (không tin điểm do client gửi)
create or replace function public.finish_game_session(p_session uuid, p_correct integer, p_wrong integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb; s public.game_sessions%rowtype;
  secs integer; maxd integer; raw integer; credits integer := 0; bonus numeric := 0; capped boolean := false;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  n_credit integer; n_bonus integer; cur numeric;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Chưa đăng nhập hoặc tài khoản đã bị khóa';
  end if;
  select value into cfg from public.system_state where key = 'game_config';
  select * into s from public.game_sessions where id = p_session and user_id = auth.uid() for update;
  if not found then raise exception 'Không tìm thấy ca làm việc'; end if;
  if s.finished_at is not null then raise exception 'Ca làm việc đã được ghi nhận'; end if;
  secs := coalesce((cfg ->> 'seconds')::integer, 60);
  if now() < s.started_at + make_interval(secs => secs - 3) then raise exception 'Ca làm việc chưa kết thúc'; end if;
  if now() > s.started_at + interval '30 minutes' then raise exception 'Ca làm việc đã hết hạn'; end if;
  maxd := coalesce((cfg ->> 'max_decisions')::integer, 40);
  if p_correct is null or p_wrong is null or p_correct < 0 or p_wrong < 0 or p_correct + p_wrong > maxd then
    raise exception 'Số liệu ca làm việc không hợp lệ';
  end if;

  raw := p_correct * 10 - p_wrong * 5;

  -- Credits
  if raw > 0 then
    select count(*) into n_credit from public.game_sessions
     where user_id = auth.uid() and credits_awarded > 0
       and (finished_at at time zone 'Asia/Ho_Chi_Minh')::date = today;
    if n_credit >= coalesce((cfg ->> 'max_credit_sessions_per_day')::integer, 10) then
      capped := true;
    else
      credits := least(floor(raw * coalesce((cfg ->> 'credits_per_point')::numeric, 0.5))::integer,
                       coalesce((cfg ->> 'max_credits_per_session')::integer, 100));
    end if;
  end if;

  -- Thưởng tiến độ nhà máy (toàn cục, có trần)
  if raw > coalesce((cfg ->> 'progress_bonus_threshold')::integer, 50) then
    select count(*) into n_bonus from public.game_sessions
     where user_id = auth.uid() and progress_bonus > 0
       and (finished_at at time zone 'Asia/Ho_Chi_Minh')::date = today;
    if n_bonus < coalesce((cfg ->> 'progress_bonus_sessions_per_user_per_day')::integer, 3) then
      select coalesce((value #>> '{}')::numeric, 0) into cur
        from public.system_state where key = 'game_progress_bonus' for update;
      bonus := least(coalesce((cfg ->> 'progress_bonus_per_session')::numeric, 0.5),
                     greatest(coalesce((cfg ->> 'progress_bonus_cap')::numeric, 25) - coalesce(cur, 0), 0));
      if bonus > 0 then
        update public.system_state set value = to_jsonb(coalesce(cur, 0) + bonus), updated_at = now()
         where key = 'game_progress_bonus';
      end if;
    end if;
  end if;

  update public.game_sessions
     set finished_at = now(), correct = p_correct, wrong = p_wrong, score = raw,
         credits_awarded = credits, progress_bonus = bonus
   where id = s.id;
  if credits > 0 then
    perform public.grant_credits(auth.uid(), credits, 'Ca giả lập: ' || s.game_key, 'game_session', s.id::text);
  end if;
  return jsonb_build_object('score', raw, 'correct', p_correct, 'wrong', p_wrong,
                            'credits', credits, 'progress_bonus', bonus, 'capped', capped);
end $$;

-- 5. Bảng xếp hạng game: tất cả game xếp theo tổng điểm, từng game xếp theo điểm cao nhất
create or replace function public.get_game_leaderboard(p_game text default null, p_limit integer default 20)
returns table (player_id uuid, full_name text, department_id uuid, best_score integer, total_score integer, plays integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.department_id,
         max(g.score)::integer, sum(greatest(g.score, 0))::integer, count(*)::integer
    from public.game_sessions g
    join public.profiles p on p.id = g.user_id
   where g.finished_at is not null and p.is_active and public.is_active_user()
     and (p_game is null or g.game_key = p_game)
   group by p.id, p.full_name, p.department_id
   order by (case when p_game is null then sum(greatest(g.score, 0)) else max(g.score) end) desc, count(*) asc
   limit least(greatest(p_limit, 1), 100);
$$;

-- 6. Tiến độ nhà máy = % task hoàn thành + điểm thưởng từ game (tối đa 100)
create or replace function public.factory_progress() returns numeric
language sql stable security definer set search_path = public as $$
  select least(100, round(
           coalesce((select 100.0 * count(*) filter (where status = 'done') / nullif(count(*), 0) from public.tasks), 0)
         + coalesce((select (value #>> '{}')::numeric from public.system_state where key = 'game_progress_bonus'), 0), 1))
   where public.is_active_user();
$$;

-- 7. Quyền gọi hàm (mặc định Supabase cấp cho anon: phải thu hồi)
revoke execute on function public.start_game_session(text), public.finish_game_session(uuid, integer, integer),
  public.get_game_leaderboard(text, integer), public.factory_progress() from public, anon;
grant execute on function public.start_game_session(text), public.finish_game_session(uuid, integer, integer),
  public.get_game_leaderboard(text, integer), public.factory_progress() to authenticated;

-- =====================================================================
-- ROLLBACK (chỉ khi cần gỡ tính năng; mất lịch sử điểm game):
--   drop function if exists public.start_game_session(text), public.finish_game_session(uuid, integer, integer),
--     public.get_game_leaderboard(text, integer), public.factory_progress();
--   drop table if exists public.game_sessions;
--   delete from public.system_state where key in ('game_config', 'game_progress_bonus');
-- Lưu ý: nếu đã gỡ hàm factory_progress, thanh tiến độ tự quay về cách tính cũ (chỉ theo task).
-- =====================================================================
