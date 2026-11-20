🏭 Aurora OS — Hệ Thống Điều Hành Nhà Máy & Gamification Sự Kiện
https://aurora-os-woad.vercel.app/

Aurora OS là nền tảng web điều hành nội bộ kết hợp mô phỏng nghiệp vụ sản xuất (Gamification), quản lý công việc, giải quyết tình huống thực chiến theo phòng ban (Case Study) và hệ thống tích điểm đổi thưởng thời gian thực.

Hệ thống được thiết kế tối ưu cho môi trường doanh nghiệp sản xuất và các sự kiện đào tạo/mô phỏng vận hành quy mô từ 50 – 100+ người dùng truy cập đồng thời.

✨ Tính Năng Nổi Bật

1. Quản Lý & Phân Quyền Phòng Ban (6 Phòng Ban Cốt Lõi)

Hệ thống tổ chức nhân sự và nghiệp vụ xoay quanh 6 phòng ban tiêu chuẩn của nhà máy:

Sản xuất (Production)

Kiểm định chất lượng (QA/QC)

Nghiên cứu & Phát triển (R&D)

An toàn, Sức khỏe & Môi trường (EHS)

Nhân sự (HR)

Tài chính - Kế toán (Finance)

2. Trung Tâm Dự Án & Case Study Thực Chiến (/projects, /board)

Bảng Dự Án Kanban: Quản lý đầu việc, theo dõi tiến độ theo trạng thái (Todo, In Progress, Done) và cập nhật thời gian thực.

Thư Viện Case Study Phòng Ban: Phân loại đề bài tình huống theo từng tag phòng ban (QC/QA, EHS, R&D, HR, FINANCE, SALES). Thành viên có thể phân tích nguyên nhân gốc rễ (Root Cause), nộp giải pháp trực tiếp và nhận thưởng Aurora Credits sau khi Admin duyệt.

3. Game Mô Phỏng Nghiệp Vụ & Bảng Xếp Hạng (/games, /leaderboard)

6 Mini-games chuyên biệt theo phòng ban: Mô phỏng xử lý sự cố thực tế tại từng bộ phận.

Cơ chế chống gian lận: Giới hạn thời gian giãn cách giữa các lượt chơi (cooldown) và giới hạn số lượt nhận thưởng mỗi ngày trực tiếp từ tầng Database.

4. Cửa Hàng Đặc Quyền & Khung Vinh Danh (/shop)

Hệ thống Rank 7 Bậc (LOL-Style Frames): Hiển thị khung viền danh hiệu động trên Topbar, Chat và Hồ sơ cá nhân (từ Đồng đến Thách Đấu / Super Star).

Vật phẩm đặc quyền (Workshop Perks): Đổi Credits lấy các thẻ quyền năng như Thẻ Đổi Công Việc (swap_task), danh hiệu Manager Tag, hoặc nâng cấp khung Rank.

5. Giao Tiếp, Tài Liệu & Hỗ Trợ Nội Bộ

Chat Thời Gian Thực (/chat): Kênh trao đổi theo phòng ban và dự án, tích hợp hiển thị khung Rank và thẻ chức danh.

Kho Tài Liệu (/documents): Chia sẻ SOP, biểu mẫu và thông báo tài liệu mới chưa đọc.

Helpdesk & Báo Cáo (/support, /reports): Tiếp nhận sự cố vận hành và theo dõi chỉ số toàn hệ thống.

🛠️ Công Nghệ Sử Dụng (Tech Stack)

Frontend: React 18+, TypeScript, Vite, Tailwind CSS, Lucide Icons

State & Routing: TanStack Query (@tanstack/react-query), React Router v6+

Backend & Database: Supabase (PostgreSQL, Row Level Security, RPC SECURITY DEFINER, Realtime WebSockets, Auth)

Deployment: Vercel (SPA Routing với vercel.json)

📂 Cấu Trúc Thư Mục

aurora-os/
├── docs/                          # Tài liệu hướng dẫn, biểu mẫu CSV và các file SQL migration
├── public/                        # Tài nguyên tĩnh (Logo, Favicon, Assets)
├── src/
│   ├── app/                       # Cấu hình lõi: Router, Layout, Topbar, RequireAuth
│   ├── features/                  # Các module tính năng độc lập (Feature-isolated)
│   │   ├── admin/                 # Quản trị người dùng, cấp phát & quản lý mã mời (Invite Codes)
│   │   ├── auth/                  # Đăng nhập, Đăng ký (theo mã nhân viên), Hồ sơ cá nhân
│   │   ├── chat/                  # Nhắn tin kênh nội bộ & hiển thị khung Rank
│   │   ├── documents/             # Quản lý tài liệu & thông báo tài liệu mới
│   │   ├── games/                 # 6 trò chơi mô phỏng nghiệp vụ & Bảng xếp hạng
│   │   ├── notifications/         # Trung tâm thông báo
│   │   ├── schedule/              # Lịch làm việc & phân công theo phòng ban
│   │   ├── shop/                  # Cửa hàng đổi Credits, nâng cấp Rank & đặc quyền
│   │   ├── Support/               # Hệ thống hỗ trợ & Báo cáo
│   │   └── tasks/                 # Bảng Kanban Dự án & Thư viện Case Study
│   └── lib/                       # Khởi tạo Supabase client & các hàm tiện ích dùng chung
├── vercel.json                    # Cấu hình rewrite cho SPA trên Vercel (tránh lỗi 404 khi F5)
└── package.json


🚀 Hướng Dẫn Cài Đặt & Chạy Local

1. Yêu cầu môi trường

Node.js phiên bản 18.x trở lên

Tài khoản Supabase và Vercel

2. Cài đặt mã nguồn

# Clone repository về máy
git clone <your-github-repo-url>
cd aurora-os

# Cài đặt các thư viện phụ thuộc
npm install


3. Cấu hình biến môi trường

Tạo file .env tại thư mục gốc của dự án (file này đã được đưa vào .gitignore, tuyệt đối không đẩy lên Git):

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key


4. Thiết lập Cơ sở dữ liệu (Supabase)

Mở Supabase SQL Editor và chạy lần lượt các file script SQL trong thư mục docs/ (bao gồm khởi tạo bảng, phân quyền phòng ban và nạp dữ liệu mẫu Case Study).

Trong mục Authentication -> Providers -> Email:

Tắt Confirm email (OFF) để người tham gia dùng Mã nhân viên (2600482XX) có thể đăng ký và truy cập ngay lập tức.

Trong mục Authentication -> Rate Limits:

Tăng giới hạn Sign up / Sign in lên mức 150 requests / 5 phút nếu tổ chức cho 50–100 người dùng chung 1 mạng Wi-Fi sự kiện.

5. Chạy thử & Kiểm tra Build

# Chạy môi trường phát triển (Local Dev)
npm run dev

# Kiểm tra lỗi TypeScript và đóng gói bản Production
npm run build


🛡️ Kiến Trúc Bảo Mật & Vận Hành Quy Mô Lớn

Row Level Security (RLS) Toàn Diện: 100% các bảng dữ liệu trong schema public đều bật RLS và kiểm tra trạng thái hoạt động qua hàm public.is_active_user(). Tài khoản bị Admin vô hiệu hóa sẽ lập tức mất quyền truy xuất dữ liệu ở tầng Database.

Bảo Vệ Giao Dịch Điểm (SECURITY DEFINER RPC): Người dùng không thể tự chỉnh sửa credits hoặc role từ trình duyệt. Mọi giao dịch cộng/trừ điểm (chơi game, mua vật phẩm Shop, duyệt thưởng Case Study) đều thực thi qua các hàm RPC có khóa dòng (FOR UPDATE) chống trùng lặp giao dịch.

Không Lộ Khóa Bí Mật: Frontend chỉ sử dụng VITE_SUPABASE_ANON_KEY. Tuyệt đối không đưa SUPABASE_SERVICE_ROLE_KEY vào mã nguồn client.

Lưu Ý Khi Vận Hành 50 – 100 Users Đồng Thời:

Khuyến nghị mỗi người tham dự chỉ mở 1 tab Aurora OS trên trình duyệt (Chrome/Safari) để tối ưu hạn mức 200 kết nối Realtime đồng thời của gói Supabase Free.

Tránh mở link trực tiếp bên trong trình duyệt nhúng của Zalo/Messenger để không bị mất phiên đăng nhập (localStorage).

📜 Quy Ước Phát Triển (Development Rules)

Cô lập Module: Giữ mã nguồn của từng tính năng nằm gọn trong src/features/<tên-tính-năng>/, hạn chế import chéo phức tạp giữa các feature.

Database First: Mọi thay đổi về cấu trúc dữ liệu hoặc phân quyền phải được viết và kiểm thử SQL + RLS trước khi cập nhật giao diện UI.

Kiểm tra trước khi Push: Luôn chạy npm run build đảm bảo 0 lỗi biên dịch trước khi git push lên nhánh main để Vercel tự động triển khai.
