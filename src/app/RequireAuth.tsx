import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

// Bảo vệ route: chưa đăng nhập -> /login; sai role -> về trang chủ.
// Lưu ý: đây chỉ là lớp UI. Quyền thật nằm ở RLS trong Supabase.
export function RequireAuth({ role }: { role?: 'admin' }) {
  const { session, profile, loading, signOut } = useAuth()

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">Đang tải…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center p-4 text-center">
        <div>
          <p className="mb-4 text-slate-700">Tài khoản chưa có hồ sơ. Hãy liên hệ admin.</p>
          <button onClick={signOut} className="min-h-11 rounded-md bg-accent px-4 font-semibold text-white">Đăng xuất</button>
        </div>
      </div>
    )
  }
  if (!profile.is_active) {
    return (
      <div className="grid min-h-screen place-items-center p-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">Tài khoản đã bị khóa</h1>
          <p className="my-3 text-slate-700">Hãy liên hệ admin nếu bạn nghĩ đây là nhầm lẫn.</p>
          <button onClick={signOut} className="min-h-11 rounded-md bg-accent px-4 font-semibold text-white">Đăng xuất</button>
        </div>
      </div>
    )
  }
  if (role && profile.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}
