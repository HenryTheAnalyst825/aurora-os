-- Task mẫu cho dự án "Mở rộng dây chuyền" (chạy 1 lần trong SQL Editor để có dữ liệu test)
insert into public.tasks (project_id, title, priority, status, position, reward_credits)
select p.id, v.title, v.priority::public.task_priority, v.status::public.task_status, v.pos, v.reward
from public.projects p,
(values
  ('Lập kế hoạch ca cho đơn hàng gấp', 'high',   'todo',        1000, 50),
  ('Rà soát tiêu chuẩn an toàn trạm làm việc', 'medium', 'todo', 2000, 30),
  ('Hiệu chuẩn thiết bị đo QC',       'high',   'in_progress', 1000, 40),
  ('Đánh giá chi phí vận hành dây chuyền mới', 'medium', 'in_progress', 2000, 40),
  ('Khảo sát bố trí nhân sự kỹ thuật', 'low',    'done',        1000, 30)
) as v(title, priority, status, pos, reward)
where p.name like 'Mở rộng%';
