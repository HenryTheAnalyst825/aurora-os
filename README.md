# Aurora OS (Giai đoạn 1 đến 3: đăng nhập, Kanban, Chat, trang admin)

## A. Cài đặt lần đầu
1. Tạo project trên supabase.com. Vào SQL Editor, chạy lần lượt (dán nội dung từng file rồi Run):
   `docs/schema.sql`, rồi `docs/phase3.sql`, rồi `docs/seed-tasks.sql` (task mẫu, tùy chọn).
2. Authentication, Providers, Email: tắt "Confirm email" (nhóm kín dùng mã nên không cần).
3. Project Settings, API: lấy `Project URL` và `anon public key`.
4. Trong thư mục dự án: `cp .env.example .env`, điền 2 giá trị trên, rồi `npm install` và `npm run dev`. Mở http://localhost:5173
5. Trước khi dùng thật, đổi mã admin mặc định trong SQL Editor:
   `update invite_codes set code = 'MA-RIENG-CUA-BAN' where code = 'ADMIN-0001';`

## B. Dùng với vai trò Admin
1. Vào `/register`, đăng ký bằng mã admin, vào được app (topbar hiện "Admin", sidebar có nhóm Quản trị).
2. Quản trị, Mã đăng ký: dán danh sách, mỗi dòng `MÃ, Họ tên, Phòng ban` (phòng ban có thể bỏ trống), bấm Tạo mã. Gửi mã cho từng thành viên. Mã chưa dùng có thể thu hồi.
3. Quản trị, Người dùng: đổi phòng ban, vai trò, khóa/mở tài khoản.
4. Kanban: tạo dự án (tự có kênh chat riêng), vào bảng, "+ Thêm task". Mở task để gán người, đặt hạn, đặt thưởng Credits. Khi task ở cột Hoàn thành, bấm "Trả thưởng" (chỉ trả 1 lần).
5. Chat: tạo thêm kênh chung (ví dụ don-hang-gap) ở cuối danh sách kênh.

## C. Dùng với vai trò User
1. Vào `/register`, nhập mã nhân viên admin đưa, email và mật khẩu. Lần sau đăng nhập ở `/login`.
2. Kanban: kéo thả task, thêm task, sửa nội dung, bình luận. Hạn, người phụ trách, thưởng chỉ admin đổi.
3. Chat: kênh chung, kênh phòng mình, kênh dự án, nhắn riêng. Đính kèm task (nút Task) hoặc file tối đa 10 MB (nút File). Sửa/xóa tin của mình.
4. Topbar: phòng ban, vai trò, tiến độ nhà máy (task Hoàn thành / tổng), Credits.

## D. Checklist test
- Đăng ký sai mã hoặc dùng lại mã: báo lỗi. User không vào được `/admin/...`.
- 2 trình duyệt, 2 tài khoản: kéo task, nhắn tin: máy kia thấy ngay, tiến độ đổi theo.
- User nhắn riêng cho User khác: người nhận thấy cuộc trò chuyện trong "Tin nhắn riêng" (có thể cần mở lại trang chat lần đầu).
- Kênh phòng: user chỉ thấy kênh phòng của mình, admin thấy tất cả.
- Gửi file, bấm tên file để tải (đường dẫn tải hết hạn sau 1 giờ).
- Gửi hơn 50 tin: nút "Tải tin nhắn cũ hơn" xuất hiện.

## E. Đưa lên mạng (miễn phí)
1. Đẩy mã nguồn lên GitHub (không đẩy file `.env`).
2. Vercel hoặc Netlify: Import repo, thêm 2 biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, Deploy. (`vercel.json` và `public/_redirects` đã có để các đường dẫn như `/chat` không bị lỗi 404.)
3. Supabase, Authentication, URL Configuration: điền địa chỉ trang web vừa có vào Site URL.

## F. Chưa có (các giai đoạn sau)
Game, Quiz, Quest, Cửa hàng, Xếp hạng, Sự cố, Đề xuất, Báo cáo, Thông báo, Tài liệu, Công việc của tôi, Lịch. Chat chưa có đếm tin chưa đọc và kênh liên phòng riêng tư (hiện kênh admin tạo là kênh chung, ai cũng thấy).
