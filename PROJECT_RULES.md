# PROJECT_RULES.md – Aurora OS

Đọc file này TRƯỚC KHI viết bất kỳ code nào. Nếu yêu cầu mâu thuẫn với file này, hãy hỏi lại thay vì tự quyết.

## 1. Dự án
Web SaaS nội bộ mô phỏng vận hành nhà máy (Aurora Precision Vietnam), kiểu Slack + Jira/Trello + gamification. Phi lợi nhuận, 50-100 người dùng, ưu tiên **đơn giản, ít tốn kém, dễ sửa**. Tài liệu gốc: `docs/PRD.md`. Giao diện mẫu: 3 màn Kanban, Chat, Game (công nghiệp hiện đại, nền xanh than `#1b222c`, điểm nhấn cam `#c2410c`, font Inter).

## 2. Stack (không đổi nếu chưa hỏi)
- React + Vite + TypeScript, Tailwind, shadcn/ui, Lucide icons
- React Router, TanStack Query, `@dnd-kit` (kéo thả Kanban), Recharts (biểu đồ)
- Supabase: Postgres, Auth, Realtime, Storage (`@supabase/supabase-js`)
- Không dùng Next.js, không viết backend riêng. Logic nhạy cảm nằm trong Postgres (RPC/trigger) như `schema.sql`.

## 3. Phân quyền
- Chỉ 2 role: `admin` và `user` (cột `profiles.role`). Phòng ban/đội là thuộc tính (`department_id`, `team_id`), dùng để cá nhân hóa game/quiz/kênh chat.
- Đăng ký: admin tạo mã (`invite_codes`), user đăng ký bằng `supabase.auth.signUp({ email, password, options: { data: { invite_code } } })`. Không có đăng ký tự do.
- **Kanban: user và admin đều tạo/sửa/kéo thả ticket.** Chỉ admin đổi hạn, người phụ trách, điểm thưởng và xóa ticket.

## 4. Quy tắc bảo mật (BẮT BUỘC)
1. Chỉ dùng `anon key` ở frontend. **Tuyệt đối không dùng hoặc để lộ `service_role` key.**
2. Mọi bảng đều bật RLS. Thêm bảng mới = viết policy ngay.
3. Không bao giờ UPDATE trực tiếp `profiles.credits` / `xp` từ client. Chỉ gọi RPC: `submit_quiz`, `start_quiz`, `redeem_perk`, `review_game_claim`, `approve_quest`, `award_task_reward`, `admin_adjust_credits`.
4. Đáp án quiz nằm ở `quiz_answer_keys` (chỉ admin đọc). Client không bao giờ nhận đáp án đúng trước khi nộp. Chấm điểm ở server.
5. Không kiểm tra quyền chỉ bằng ẩn nút ở UI. UI chỉ ẩn/hiện, quyền thật nằm ở RLS.
6. Không commit file `.env`. Dùng `.env.example` với `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.

## 5. Cấu trúc thư mục
```
src/
  app/            router, layout (Sidebar, Topbar), providers
  components/ui/  shadcn/ui
  features/       mỗi module một thư mục: components/, hooks/, api.ts
    auth/ tasks/ chat/ documents/ games/ quiz/ quests/ shop/
    leaderboard/ incidents/ proposals/ reports/ members/ admin/
  lib/            supabase.ts, utils.ts
  types/          database.ts (sinh bằng `supabase gen types typescript`)
```
Mỗi tính năng tự chứa trong `features/<tên>/`. Không import chéo giữa các feature, chỉ qua `lib/` hoặc `components/`.

## 6. Quy ước code
- TypeScript strict, không dùng `any`. Gọi Supabase qua hàm trong `features/*/api.ts`, không rải khắp component.
- Dữ liệu: TanStack Query. Realtime: subscribe trong hook, **hủy subscribe khi unmount**, chỉ subscribe kênh/bảng đang mở.
- Chat: tải 50 tin gần nhất, phân trang khi cuộn. Leaderboard: không refetch mỗi giây.
- UI: tiếng Việt, mobile-first, nút tối thiểu 44px, dùng thẻ `button`/`a`/`label` đúng nghĩa, độ tương phản chữ đạt chuẩn AA.
- Component nhỏ, đặt tên rõ nghĩa; thêm comment tiếng Việt cho logic nghiệp vụ không hiển nhiên.

## 7. Cách làm việc với AI
- Mỗi lần chỉ làm **một tính năng**. Không động vào phần không được yêu cầu.
- Với tính năng có dữ liệu: nêu bảng liên quan, viết/duyệt SQL và RLS trước, rồi mới làm UI.
- Sau mỗi giai đoạn: liệt kê file đã sửa, cách test, rủi ro bảo mật còn lại.
- Lỗi: dán nguyên thông báo lỗi (console/network), không mô tả chung chung.

## 8. Phạm vi
- Làm: Kanban, chat, tài liệu (khung chờ nội dung), thông báo, game hub (link ngoài), quiz, quest, cửa hàng điểm, bảng xếp hạng, sự cố, đề xuất, báo cáo, tường cải tiến, trang admin.
- **Chưa làm:** bỏ phiếu đồng thuận, vai trò Cố vấn, nội dung Tài liệu thật.
