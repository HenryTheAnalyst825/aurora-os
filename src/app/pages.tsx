import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

export function Home() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header chào mừng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Xin chào, {profile?.full_name || (isAdmin ? 'Quản trị viên' : 'Cán bộ nhân viên')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Mã nhân viên: <span className="font-semibold">{profile?.employee_code || 'ADMIN-0001'}</span> •{' '}
            <span>{profile?.department || (isAdmin ? 'Ban Quản Trị Hệ Thống' : 'Thành viên nhà máy')}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/board"
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
          >
            Vào Bảng Kanban
          </Link>
          <Link
            to="/incidents"
            className="px-4 py-2 bg-slate-100 text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-200 transition"
          >
            Hỗ trợ & Copilot
          </Link>
        </div>
      </div>

      {/* Hướng dẫn cho người dùng mới (Onboarding Checklist) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">🧭 Hướng dẫn Bắt đầu Nhanh (Onboarding)</h2>
            <p className="text-xs text-slate-500">
              4 bước cơ bản để làm chủ hệ điều hành vận hành nhà máy Aurora OS
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Dành cho tất cả thành viên
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/documents"
            className="p-4 rounded-lg border border-slate-200 hover:border-slate-900 transition bg-slate-50/50 space-y-1.5"
          >
            <span className="text-xs font-bold text-blue-600 uppercase">Bước 1</span>
            <h3 className="font-semibold text-sm text-slate-900">Đọc Tài liệu & Quy trình</h3>
            <p className="text-xs text-slate-600">
              Tra cứu quy định chuẩn của 6 phòng ban trong kho tài liệu chung.
            </p>
          </Link>

          <Link
            to="/board"
            className="p-4 rounded-lg border border-slate-200 hover:border-slate-900 transition bg-slate-50/50 space-y-1.5"
          >
            <span className="text-xs font-bold text-blue-600 uppercase">Bước 2</span>
            <h3 className="font-semibold text-sm text-slate-900">Nhận việc trên Kanban</h3>
            <p className="text-xs text-slate-600">
              Cập nhật tiến độ công việc hàng ngày để tích lũy điểm thưởng Credits.
            </p>
          </Link>

          <Link
            to="/games"
            className="p-4 rounded-lg border border-slate-200 hover:border-slate-900 transition bg-slate-50/50 space-y-1.5"
          >
            <span className="text-xs font-bold text-blue-600 uppercase">Bước 3</span>
            <h3 className="font-semibold text-sm text-slate-900">Giả lập Ca làm việc</h3>
            <p className="text-xs text-slate-600">
              Rèn luyện kỹ năng xử lý tình huống thực tế và đua top Bảng xếp hạng.
            </p>
          </Link>

          <Link
            to="/incidents"
            className="p-4 rounded-lg border border-slate-200 hover:border-slate-900 transition bg-slate-50/50 space-y-1.5"
          >
            <span className="text-xs font-bold text-blue-600 uppercase">Bước 4</span>
            <h3 className="font-semibold text-sm text-slate-900">Hỏi AI Aurora Copilot</h3>
            <p className="text-xs text-slate-600">
              Tra cứu nhanh hoặc gửi phiếu hỗ trợ (Ticket) khi gặp sự cố kỹ thuật.
            </p>
          </Link>
        </div>
      </div>

      {/* Khu vực troll PM */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center space-y-4 max-w-2xl mx-auto">
        <h3 className="font-bold text-lg text-slate-800">
          NGƯỜI ẤY LÀ AI ?:
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-inner bg-slate-50 flex justify-center p-2">
          <img
            src="/troll-pm.jpg"
            alt="PM đang nạp năng lượng"
            className="max-h-[400px] object-contain rounded-md"
          />
        </div>
        <p className="text-xs text-slate-400 italic">
          "Làm nhiều là tốt, nhưng mà cũng phải ngoái lại 2 bên xem có những ai đồng hành mà dựa vào chứ. I'm here."
        </p>
      </div>
    </div>
  )
}

// Trang giữ chỗ cho các tính năng sẽ làm ở giai đoạn sau
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">
          Phân hệ này đang được đồng bộ giao diện với cơ sở dữ liệu và sẽ mở khóa trong bản cập nhật kế tiếp.
        </p>
        <Link
          to="/"
          className="inline-block mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
        >
          ← Quay về Tổng quan
        </Link>
      </div>
    </div>
  )
}

// Trang lỗi 404 (Bắt mọi đường dẫn không tồn tại)
export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md space-y-4">
        <div className="text-5xl font-black text-slate-900">404</div>
        <h1 className="text-lg font-bold text-slate-800">Không tìm thấy trang yêu cầu</h1>
        <p className="text-sm text-slate-500">
          Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được di chuyển trong hệ thống Aurora OS.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
        >
          Quay về Trang Tổng quan
        </Link>
      </div>
    </div>
  )
}