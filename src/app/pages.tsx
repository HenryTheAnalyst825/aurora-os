import { useAuth } from '../features/auth/AuthProvider'

export function Home() {
  const { profile } = useAuth()
  return (
    <div>
      <h1 className="text-xl font-semibold">Xin chào, {profile?.full_name}</h1>
      <p className="mt-1 text-sm text-slate-600">Mã nhân viên: {profile?.employee_code}</p>
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
