import { useAuth } from '../features/auth/AuthProvider'

export function Home() {
  const { profile } = useAuth()
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Xin chào, Quản trị viên</h1>
        <p className="mt-1 text-sm text-slate-600">Mã nhân viên: {profile?.employee_code || 'ADMIN-0001'}</p>
      </div>

      {/* Khu vực troll PM */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center space-y-4 max-w-2xl mx-auto mt-8">
        <h3 className="font-bold text-lg text-slate-800">
          🚨 NGƯỜI ẤY LÀ AI ?:
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
    <div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">Tính năng này sẽ được làm ở giai đoạn sau.</p>
    </div>
  )
}