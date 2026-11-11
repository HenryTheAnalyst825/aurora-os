import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Crown, LogOut, Menu, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/AuthProvider'
import * as tasksRealtime from '../features/tasks/realtime'

const RANK_LABELS: Record<string, { name: string; cls: string; frame: string }> = {
  bronze: { name: 'Đồng', cls: 'border-amber-700/40 bg-amber-100 text-amber-950', frame: 'ring-2 ring-amber-700/60 bg-amber-50/40' },
  silver: { name: 'Bạc', cls: 'border-slate-400 bg-slate-200 text-slate-900', frame: 'ring-2 ring-slate-400 bg-slate-50' },
  gold: { name: 'Vàng', cls: 'border-yellow-500 bg-yellow-100 text-yellow-950', frame: 'ring-2 ring-yellow-500 bg-yellow-50/50' },
  emerald: { name: 'Lục Bảo', cls: 'border-emerald-600 bg-emerald-100 text-emerald-950', frame: 'ring-2 ring-emerald-500 bg-emerald-50/50' },
  diamond: { name: 'Kim Cương', cls: 'border-cyan-500 bg-cyan-100 text-cyan-950', frame: 'ring-2 ring-cyan-500 bg-cyan-50/60' },
  master: { name: 'Cao Thủ', cls: 'border-purple-600 bg-purple-100 text-purple-950', frame: 'ring-2 ring-purple-600 bg-purple-50/60' },
  challenger: { name: 'Thách Đấu', cls: 'border-amber-500 bg-amber-200 text-slate-950', frame: 'ring-2 ring-amber-500 bg-amber-50' },
}

async function fetchProgress() {
  const { data, error } = await supabase.rpc('factory_progress')
  if (!error && data !== null) return Number(data)
  const { data: rows } = await supabase.from('tasks').select('status')
  if (!rows || rows.length === 0) return 0
  return Math.round((rows.filter((r) => r.status === 'done').length / rows.length) * 100)
}

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { profile, signOut } = useAuth()

  // Gọi hook realtime của tasks an toàn bất kể tên export trong realtime.ts
  const rtHook =
    (tasksRealtime as Record<string, (() => void) | undefined>).useTasksRealtime ??
    (tasksRealtime as Record<string, (() => void) | undefined>).useRealtimeTasks
  rtHook?.()

  const { data: pct = 0 } = useQuery({ queryKey: ['factory-progress'], queryFn: fetchProgress })

  const extProfile = profile as (typeof profile & { rank_tier?: string | null; is_manager_tag?: boolean | null }) | null
  const rank = extProfile?.rank_tier ? RANK_LABELS[extProfile.rank_tier] : undefined
  const isManager = Boolean(extProfile?.is_manager_tag)
  const displayName = isManager
    ? `Manager - ${profile?.full_name || 'Nhân viên'}`
    : profile?.full_name || 'Nhân viên'

  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label="Mở menu"
          className="grid min-h-11 min-w-11 place-items-center rounded-md text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      )}

      <div className="flex items-center gap-2 text-sm">
        <div className={`inline-flex flex-col rounded-lg px-2.5 py-1 ${rank ? rank.frame : ''}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            {isManager && (
              <span className="inline-flex items-center gap-1 rounded bg-orange-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                <Crown size={11} aria-hidden="true" />
                MANAGER
              </span>
            )}
            <span className="font-semibold text-slate-900">{displayName}</span>
          </div>
          {rank && (
            <div className="mt-0.5 flex items-center gap-1">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${rank.cls}`}>
                <Shield size={11} aria-hidden="true" />
                Super Star · {rank.name}
              </span>
            </div>
          )}
        </div>

        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {profile?.departments?.name ?? (profile?.role === 'admin' ? 'Admin' : 'Chưa phân phòng')}
        </span>
      </div>

      <div className="flex min-w-48 max-w-xs flex-1 items-center gap-3">
        <span id="progress-label" className="whitespace-nowrap text-xs font-medium text-slate-600">
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
          {profile?.role === 'admin' ? 'Quản trị viên' : 'Hồ sơ'}
        </Link>
        <Link
          to="/shop"
          className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900 hover:bg-amber-200"
          title="Vào Cửa hàng Đặc quyền"
        >
          {profile?.credits ?? 0} Credits
        </Link>
        <button
          type="button"
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