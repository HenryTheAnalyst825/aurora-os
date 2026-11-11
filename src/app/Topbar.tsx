import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Crown, Flame, Gem, LogOut, Menu, Shield, Sparkles, Swords, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/AuthProvider'
import * as tasksRealtime from '../features/tasks/realtime'

export interface LolRankStyle {
  name: string
  title: string
  avatarRing: string
  avatarBg: string
  gemBg: string
  plateBg: string
  ribbonBg: string
  glowClass: string
}

export const LOL_RANKS: Record<string, LolRankStyle> = {
  bronze: {
    name: 'ĐỒNG',
    title: 'Chiến Binh Đồng Đoàn',
    avatarRing: 'ring-[3px] ring-amber-700 border-2 border-amber-500 shadow-[0_0_10px_rgba(180,83,9,0.5)]',
    avatarBg: 'bg-gradient-to-br from-amber-900 via-amber-700 to-stone-800 text-amber-100',
    gemBg: 'bg-amber-700 border-amber-300 text-amber-100',
    plateBg: 'border-amber-700/60 bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-900/90 text-amber-100',
    ribbonBg: 'bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 text-white border-amber-400',
    glowClass: 'shadow-sm',
  },
  silver: {
    name: 'BẠC',
    title: 'Hiệp Sĩ Bạc Đoàn',
    avatarRing: 'ring-[3px] ring-slate-300 border-2 border-white shadow-[0_0_12px_rgba(148,163,184,0.7)]',
    avatarBg: 'bg-gradient-to-br from-slate-700 via-slate-500 to-slate-800 text-white',
    gemBg: 'bg-slate-500 border-white text-white',
    plateBg: 'border-slate-400 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-100',
    ribbonBg: 'bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 text-slate-950 border-white',
    glowClass: 'shadow-md',
  },
  gold: {
    name: 'VÀNG',
    title: 'Chiến Thần Vàng Đoàn',
    avatarRing: 'ring-[3px] ring-yellow-400 border-2 border-amber-200 shadow-[0_0_16px_rgba(250,204,21,0.85)]',
    avatarBg: 'bg-gradient-to-br from-yellow-600 via-amber-500 to-yellow-800 text-white',
    gemBg: 'bg-yellow-500 border-yellow-100 text-slate-950',
    plateBg: 'border-yellow-400 bg-gradient-to-r from-amber-950 via-yellow-900/95 to-amber-950 text-yellow-100',
    ribbonBg: 'bg-gradient-to-r from-yellow-600 via-amber-300 to-yellow-600 text-slate-950 border-yellow-200',
    glowClass: 'shadow-[0_0_14px_rgba(234,179,8,0.45)]',
  },
  emerald: {
    name: 'LỤC BẢO',
    title: 'Tinh Anh Lục Bảo',
    avatarRing: 'ring-[3px] ring-emerald-400 border-2 border-teal-200 shadow-[0_0_18px_rgba(16,185,129,0.85)]',
    avatarBg: 'bg-gradient-to-br from-emerald-800 via-emerald-500 to-teal-900 text-white',
    gemBg: 'bg-emerald-500 border-emerald-100 text-slate-950',
    plateBg: 'border-emerald-400 bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 text-emerald-100',
    ribbonBg: 'bg-gradient-to-r from-emerald-700 via-emerald-400 to-teal-700 text-slate-950 border-emerald-200',
    glowClass: 'shadow-[0_0_16px_rgba(16,185,129,0.5)]',
  },
  diamond: {
    name: 'KIM CƯƠNG',
    title: 'Siêu Phẩm Kim Cương',
    avatarRing: 'ring-[3px] ring-cyan-300 border-2 border-white shadow-[0_0_20px_rgba(34,211,238,0.95)]',
    avatarBg: 'bg-gradient-to-br from-blue-900 via-cyan-500 to-indigo-950 text-white',
    gemBg: 'bg-cyan-400 border-white text-slate-950',
    plateBg: 'border-cyan-300 bg-gradient-to-r from-indigo-950 via-sky-900 to-blue-950 text-cyan-100',
    ribbonBg: 'bg-gradient-to-r from-blue-600 via-cyan-300 to-indigo-600 text-slate-950 border-white',
    glowClass: 'shadow-[0_0_18px_rgba(6,182,212,0.55)]',
  },
  master: {
    name: 'CAO THỦ',
    title: 'Đẳng Cấp Cao Thủ',
    avatarRing: 'ring-[3px] ring-fuchsia-400 border-2 border-purple-200 shadow-[0_0_22px_rgba(217,70,239,0.95)]',
    avatarBg: 'bg-gradient-to-br from-purple-950 via-fuchsia-600 to-rose-900 text-white',
    gemBg: 'bg-fuchsia-500 border-pink-100 text-white',
    plateBg: 'border-fuchsia-400 bg-gradient-to-r from-purple-950 via-fuchsia-900 to-rose-950 text-pink-100',
    ribbonBg: 'bg-gradient-to-r from-purple-700 via-fuchsia-400 to-pink-600 text-slate-950 border-pink-200',
    glowClass: 'shadow-[0_0_20px_rgba(192,38,211,0.65)]',
  },
  challenger: {
    name: 'THÁCH ĐẤU',
    title: 'Huyền Thoại Thách Đấu',
    avatarRing: 'ring-[4px] ring-amber-300 border-2 border-cyan-200 shadow-[0_0_25px_rgba(251,191,36,1)]',
    avatarBg: 'bg-gradient-to-br from-amber-500 via-red-600 to-cyan-500 text-white',
    gemBg: 'bg-gradient-to-r from-amber-400 to-cyan-300 border-white text-slate-950',
    plateBg: 'border-amber-300 bg-gradient-to-r from-slate-950 via-red-950 to-amber-950 text-amber-100',
    ribbonBg: 'bg-gradient-to-r from-amber-400 via-yellow-200 to-cyan-300 text-slate-950 border-white',
    glowClass: 'shadow-[0_0_24px_rgba(245,158,11,0.75)]',
  },
}

function RankIcon({ tier, size = 12 }: { tier: string; size?: number }) {
  if (tier === 'challenger') return <Trophy size={size} aria-hidden="true" />
  if (tier === 'master') return <Flame size={size} aria-hidden="true" />
  if (tier === 'diamond' || tier === 'emerald') return <Gem size={size} aria-hidden="true" />
  if (tier === 'gold') return <Sparkles size={size} aria-hidden="true" />
  return <Swords size={size} aria-hidden="true" />
}

async function fetchProgress() {
  const { data, error } = await supabase.rpc('factory_progress')
  if (!error && data !== null) return Number(data)
  const { data: rows } = await supabase.from('tasks').select('status')
  if (!rows || rows.length === 0) return 0
  return Math.round((rows.filter((r) => r.status === 'done').length / rows.length) * 100)
}

async function fetchMyHonors(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('rank_tier, is_manager_tag, credits')
    .eq('id', userId)
    .single()
  return data as { rank_tier: string | null; is_manager_tag: boolean | null; credits: number | null } | null
}

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { profile, signOut } = useAuth()

  const rtHook =
    (tasksRealtime as Record<string, (() => void) | undefined>).useTasksRealtime ??
    (tasksRealtime as Record<string, (() => void) | undefined>).useRealtimeTasks
  rtHook?.()

  const { data: pct = 0 } = useQuery({ queryKey: ['factory-progress'], queryFn: fetchProgress })

  // Luôn đọc trực tiếp rank_tier & is_manager_tag từ bảng profiles để cập nhật tức thì
  const { data: honors } = useQuery({
    queryKey: ['my-honors', profile?.id],
    queryFn: () => fetchMyHonors(profile!.id),
    enabled: !!profile?.id,
  })

  const tierKey = honors?.rank_tier ?? (profile as { rank_tier?: string | null } | null)?.rank_tier ?? null
  const rank = tierKey ? LOL_RANKS[tierKey] : undefined
  const isManager = Boolean(
    honors?.is_manager_tag ?? (profile as { is_manager_tag?: boolean | null } | null)?.is_manager_tag,
  )
  const credits = honors?.credits ?? profile?.credits ?? 0

  const baseName = profile?.full_name || 'Nhân viên'
  const displayName = isManager ? `Manager - ${baseName}` : baseName
  const initials = baseName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'AU'

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

      {/* KHUNG AVATAR + RUY-BĂNG DANH HIỆU KIỂU LOL */}
      <div className="flex items-center gap-3 text-sm">
        <div
          className={`flex items-center gap-3 rounded-xl border-2 px-3 py-1.5 transition-all ${
            rank ? `${rank.plateBg} ${rank.glowClass}` : 'border-slate-200 bg-slate-50 text-slate-900'
          }`}
        >
          {/* Khung Avatar LOL có Đá quý / Vương miện trên đỉnh */}
          <div className="relative flex shrink-0 items-center justify-center">
            <div
              className={`grid size-10 place-items-center rounded-full font-extrabold tracking-tight ${
                rank ? `${rank.avatarBg} ${rank.avatarRing}` : 'bg-slate-800 text-white ring-2 ring-slate-300'
              }`}
            >
              {initials}
            </div>
            {rank && (
              <span
                className={`-bottom-1.5 absolute inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-black shadow ${rank.gemBg}`}
              >
                <RankIcon tier={tierKey!} size={10} />
              </span>
            )}
          </div>

          {/* Tên User + Khung Ruy-băng Rank ngay bên dưới tên */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5">
              {isManager && (
                <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-amber-500 to-orange-600 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white shadow-sm">
                  <Crown size={11} aria-hidden="true" />
                  MANAGER
                </span>
              )}
              <span className={`font-bold ${rank ? 'text-white' : 'text-slate-900'}`}>{displayName}</span>
            </div>

            {/* Khung Ruy-băng Rank LOL nằm ngay dưới tên */}
            {rank ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm ${rank.ribbonBg}`}
                >
                  <Shield size={10} aria-hidden="true" />
                  KHUNG {rank.name} · {rank.title}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">Chưa trang bị khung Rank</span>
            )}
          </div>
        </div>

        <span className="hidden rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 sm:inline-block">
          {profile?.departments?.name ?? (profile?.role === 'admin' ? 'Admin' : 'Chưa phân phòng')}
        </span>
      </div>

      <div className="flex min-w-44 max-w-xs flex-1 items-center gap-3">
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
          {profile?.role === 'admin' ? '∞ Credits' : `${credits} Credits`}
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