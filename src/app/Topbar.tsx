import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/AuthProvider'
import { useRealtimeTasks } from '../features/tasks/realtime'
import { NotificationBell } from '../features/notifications/NotificationBell'
import { UserHonorDisplay } from '../components/UserBadge'

async function fetchProgress() {
  const { data, error } = await supabase.rpc('factory_progress')
  if (!error && data !== null) return Number(data)
  const { data: rows } = await supabase.from('tasks').select('status')
  if (!rows || rows.length === 0) return 0
  return Math.round((rows.filter((r) => r.status === 'done').length / rows.length) * 100)
}

export function Topbar() {
  const { profile, signOut } = useAuth()
  useRealtimeTasks()
  const { data: pct = 0 } = useQuery({ queryKey: ['factory-progress'], queryFn: fetchProgress })

  const rankTier = (profile as { rank_tier?: string | null } | null)?.rank_tier ?? null
  const isManagerTag = Boolean((profile as { is_manager_tag?: boolean | null } | null)?.is_manager_tag)

  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-6 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <UserHonorDisplay
          fullName={profile?.full_name}
          rankTier={rankTier}
          isManager={isManagerTag}
          compact
        />
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {profile?.departments?.name ?? (profile?.role === 'admin' ? 'Admin' : 'Chưa phân phòng')}
        </span>
      </div>

      <div className="flex min-w-48 flex-1 items-center gap-3 max-w-xs">
        <span id="progress-label" className="text-xs font-medium text-slate-600 whitespace-nowrap">
          Tiến độ nhà máy
        </span>
        <div
          role="progressbar"
          aria-labelledby="progress-label"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
        >
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-800">{pct}%</span>
      </div>

      <div className="ml-auto flex items-center gap-3 text-sm">
        <Link to="/profile" className="min-h-11 content-center px-2 font-medium text-slate-700 underline">
          {profile?.job_title || 'Hồ sơ'}
        </Link>
        <Link
          to="/shop"
          className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900 hover:bg-amber-200"
          title="Vào Cửa hàng Đặc quyền"
        >
          {profile?.credits ?? 0} Credits
        </Link>
        <NotificationBell />
        <button
          onClick={signOut}
          aria-label="Đăng xuất"
          className="grid min-h-11 min-w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}