import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, LogOut, Menu } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/AuthProvider'

// Tiến độ toàn nhà máy = số task Done / tổng số task
function useFactoryProgress() {
  return useQuery({
    queryKey: ['factory-progress'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [all, done] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done'),
      ])
      return all.count ? Math.round(((done.count ?? 0) / all.count) * 100) : 0
    },
  })
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, signOut } = useAuth()
  const { data: pct = 0 } = useFactoryProgress()
  const iconBtn = 'grid size-11 place-items-center rounded-md text-slate-700 hover:bg-slate-100'

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-3 text-sm md:gap-5 md:px-6">
      <button aria-label="Mở menu" onClick={onMenu} className={`${iconBtn} md:hidden`}>
        <Menu size={20} />
      </button>
      <span className="font-semibold">{profile?.departments?.name ?? 'Chưa có phòng ban'}</span>
      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
        {profile?.role === 'admin' ? 'Admin' : 'User'}
      </span>
      <div className="hidden max-w-64 flex-1 sm:block">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Tiến độ nhà máy</span>
          <span>{pct}%</span>
        </div>
        <div role="progressbar" aria-label="Tiến độ nhà máy" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="ml-auto font-semibold">{(profile?.credits ?? 0).toLocaleString('vi-VN')} Credits</span>
      <Link to="/notifications" aria-label="Thông báo" className={iconBtn}>
        <Bell size={18} />
      </Link>
      <button aria-label="Đăng xuất" onClick={signOut} className={iconBtn}>
        <LogOut size={18} />
      </button>
    </header>
  )
}
