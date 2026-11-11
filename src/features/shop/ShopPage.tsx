import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRightLeft,
  CheckCircle2,
  Crown,
  Flame,
  Gem,
  LifeBuoy,
  Shield,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { LOL_RANKS } from '../../app/Topbar'
import {
  fetchActiveMembers,
  fetchMyActiveTasks,
  fetchPerkRedemptions,
  markSupportResolved,
  redeemPerk,
} from './api'

export type RankTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'emerald'
  | 'diamond'
  | 'master'
  | 'challenger'

export interface RankCardMeta {
  key: RankTier
  name: string
  cost: number
  title: string
  cardBorder: string
}

const RANK_LIST: RankCardMeta[] = [
  { key: 'bronze', name: 'Đồng', cost: 100, title: 'Chiến Binh Đồng Đoàn', cardBorder: 'border-amber-700 bg-amber-950/90 text-amber-100' },
  { key: 'silver', name: 'Bạc', cost: 150, title: 'Hiệp Sĩ Bạc Đoàn', cardBorder: 'border-slate-300 bg-slate-800 text-slate-100' },
  { key: 'gold', name: 'Vàng', cost: 200, title: 'Chiến Thần Vàng Đoàn', cardBorder: 'border-yellow-400 bg-amber-900 text-yellow-100' },
  { key: 'emerald', name: 'Lục Bảo', cost: 300, title: 'Tinh Anh Lục Bảo', cardBorder: 'border-emerald-400 bg-emerald-950 text-emerald-100' },
  { key: 'diamond', name: 'Kim Cương', cost: 400, title: 'Siêu Phẩm Kim Cương', cardBorder: 'border-cyan-300 bg-indigo-950 text-cyan-100' },
  { key: 'master', name: 'Cao Thủ', cost: 550, title: 'Đẳng Cấp Cao Thủ', cardBorder: 'border-fuchsia-400 bg-purple-950 text-pink-100' },
  { key: 'challenger', name: 'Thách Đấu', cost: 700, title: 'Huyền Thoại Thách Đấu', cardBorder: 'border-amber-300 bg-gradient-to-r from-slate-950 via-red-950 to-amber-950 text-amber-100' },
]

function RankIcon({ tier, size = 14 }: { tier: RankTier; size?: number }) {
  if (tier === 'challenger') return <Trophy size={size} aria-hidden="true" />
  if (tier === 'master') return <Flame size={size} aria-hidden="true" />
  if (tier === 'diamond' || tier === 'emerald') return <Gem size={size} aria-hidden="true" />
  if (tier === 'gold') return <Sparkles size={size} aria-hidden="true" />
  return <Swords size={size} aria-hidden="true" />
}

export function LolHonorBanner({
  fullName,
  rankTier,
  isManager,
}: {
  fullName?: string | null
  rankTier?: string | null
  isManager?: boolean | null
}) {
  const rank = rankTier ? LOL_RANKS[rankTier] : undefined
  const baseName = fullName?.trim() || 'Nhân viên'
  const displayName = isManager ? `Manager - ${baseName}` : baseName
  const initials =
    baseName
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'AU'

  return (
    <div
      className={`inline-flex items-center gap-3.5 rounded-xl border-2 px-4 py-2.5 transition-all ${
        rank ? `${rank.plateBg} ${rank.glowClass}` : 'border-slate-300 bg-slate-800 text-white'
      }`}
    >
      {/* Khung Avatar kiểu LOL */}
      <div className="relative flex shrink-0 items-center justify-center">
        <div
          className={`grid size-12 place-items-center rounded-full text-base font-black ${
            rank ? `${rank.avatarBg} ${rank.avatarRing}` : 'bg-slate-700 text-white ring-2 ring-slate-400'
          }`}
        >
          {initials}
        </div>
        {rank && rankTier && (
          <span
            className={`-bottom-1.5 absolute inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-black shadow ${rank.gemBg}`}
          >
            <RankIcon tier={rankTier as RankTier} size={10} />
          </span>
        )}
      </div>

      {/* Tên + Ruy-băng Khung Rank ngay bên dưới tên */}
      <div className="flex flex-col text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          {isManager && (
            <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow">
              <Crown size={11} aria-hidden="true" />
              MANAGER
            </span>
          )}
          <span className="text-base font-extrabold text-white">{displayName}</span>
        </div>

        {rank ? (
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow ${rank.ribbonBg}`}
            >
              <Shield size={11} aria-hidden="true" />
            {rank.name} · {rank.title}
            </span>
          </div>
        ) : (
          <span className="mt-0.5 text-xs text-slate-300">Chưa có Rank</span>
        )}
      </div>
    </div>
  )
}

const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra. Thử lại sau.'

export function ShopPage() {
  const { profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const isAdmin = profile?.role === 'admin'

  // Truy vấn trực tiếp rank_tier, is_manager_tag, credits từ bảng profiles
  const { data: myHonors } = useQuery({
    queryKey: ['my-honors', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('rank_tier, is_manager_tag, credits')
        .eq('id', profile!.id)
        .single()
      return data as { rank_tier: string | null; is_manager_tag: boolean | null; credits: number | null } | null
    },
    enabled: !!profile?.id,
  })

  const currentRankTier = (myHonors?.rank_tier ?? (profile as { rank_tier?: string | null } | null)?.rank_tier ?? null) as RankTier | null
  const isManagerTag = Boolean(myHonors?.is_manager_tag ?? (profile as { is_manager_tag?: boolean | null } | null)?.is_manager_tag)
  const currentCredits = myHonors?.credits ?? profile?.credits ?? 0
  const effectiveCredits = isAdmin ? Number.MAX_SAFE_INTEGER : currentCredits

  // Cho phép người dùng bấm chọn bất kỳ Rank nào để xem trước và mua/trang bị ngay
  const [selectedTier, setSelectedTier] = useState<RankTier>('challenger')
  const selectedRankMeta = RANK_LIST.find((r) => r.key === selectedTier) ?? RANK_LIST[6]

  const [supportNote, setSupportNote] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [flash, setFlash] = useState('')
  const [error, setError] = useState('')

  const { data: myTasks = [] } = useQuery({
    queryKey: ['shop-my-tasks', profile?.id],
    queryFn: () => fetchMyActiveTasks(profile!.id),
    enabled: !!profile,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['shop-active-members', profile?.id],
    queryFn: () => fetchActiveMembers(profile!.id),
    enabled: !!profile,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['perk-redemptions'],
    queryFn: fetchPerkRedemptions,
    enabled: !!profile,
  })

  const invalidateAll = async () => {
    await refreshProfile()
    qc.invalidateQueries({ queryKey: ['my-honors'] })
    qc.invalidateQueries({ queryKey: ['perk-redemptions'] })
    qc.invalidateQueries({ queryKey: ['shop-my-tasks'] })
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const redeem = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload?: Record<string, unknown> }) =>
      redeemPerk(key, payload ?? {}),
    onSuccess: async (res) => {
      setError('')
      setFlash(
        `Thành công: ${res.perk_title}${
          isAdmin ? ' (Admin: Miễn phí 0 Credits)' : ` (−${res.cost} Credits, còn ${res.remaining_credits} Credits)`
        }`,
      )
      setSupportNote('')
      setSelectedTaskId('')
      setTargetUserId('')
      await invalidateAll()
    },
    onError: (e) => {
      setFlash('')
      setError(errMsg(e))
    },
  })

  const resolveSupport = useMutation({
    mutationFn: (id: string) => markSupportResolved(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perk-redemptions'] }),
  })

  if (!profile) return null

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header & Khung LOL hiện tại của người dùng */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Trạm Đặc Quyền & Danh Hiệu (Workshop Perks)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Chọn bất kỳ bậc Super Star (Đồng → Thách Đấu) kiểu LOL để trang bị ngay dưới tên của bạn, hoặc sử dụng các đặc quyền điều phối công việc.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">Danh hiệu hiện tại của bạn:</div>
            <LolHonorBanner fullName={profile.full_name} rankTier={currentRankTier} isManager={isManagerTag} />
          </div>
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
            <div className="text-xs text-slate-300">Số dư khả dụng</div>
            <div className="text-xl font-bold text-amber-400">
              {isAdmin ? '∞ Vô hạn' : `${currentCredits} Credits`}
            </div>
          </div>
        </div>
      </div>

      {flash && (
        <p role="status" className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
          {flash}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      {/* MỤC NỔI BẬT: CHỌN & TRANG BỊ BẤT KỲ KHUNG RANK LOL NÀO (ĐỒNG -> THÁCH ĐẤU) */}
      <div className="rounded-xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">
              <Trophy size={14} aria-hidden="true" />
              HỆ THỐNG KHUNG & HUY HIỆU 7 BẬC
            </span>
            <h2 className="mt-2 text-lg font-bold text-white">
              Chứng Nhận "Super Star" — Chọn Bất Kỳ Rank Nào Bạn Muốn!
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Bấm vào một bậc bên dưới để xem trước Khung Avatar + Danh Hiệu, sau đó bấm <b>Trang bị ngay</b>.
            </p>
          </div>

          {/* Khung Preview trực tiếp của bậc đang chọn */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/90 p-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              Xem trước khung đang chọn ({selectedRankMeta.name}):
            </div>
            <LolHonorBanner fullName={profile.full_name} rankTier={selectedTier} isManager={isManagerTag} />
          </div>
        </div>

        {/* 7 Thẻ chọn trực tiếp các bậc Rank */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {RANK_LIST.map((r) => {
            const isSelected = selectedTier === r.key
            const isEquipped = currentRankTier === r.key
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setSelectedTier(r.key)}
                className={`flex flex-col items-center justify-between rounded-xl border-2 p-3 text-center transition-all ${
                  r.cardBorder
                } ${
                  isSelected
                    ? 'scale-105 ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                <div className="grid size-10 place-items-center rounded-full bg-white/10">
                  <RankIcon tier={r.key} size={20} />
                </div>
                <div className="mt-2 font-black uppercase tracking-wide">{r.name}</div>
                <div className="mt-0.5 text-[11px] opacity-90">
                  {isAdmin ? '0 Credits (Admin)' : `${r.cost} Credits`}
                </div>
                {isEquipped && (
                  <span className="mt-1.5 rounded bg-green-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                    ĐANG DÙNG
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="text-sm text-slate-300">
            Bậc đang chọn: <b className="text-amber-300">{selectedRankMeta.name} ({selectedRankMeta.title})</b> · Chi phí:{' '}
            <b className="text-white">{isAdmin ? 'Miễn phí (Admin ∞)' : `${selectedRankMeta.cost} Credits`}</b>
          </div>
          <button
            type="button"
            disabled={redeem.isPending || (!isAdmin && effectiveCredits < selectedRankMeta.cost)}
            onClick={() =>
              redeem.mutate({
                key: 'super_star_up',
                payload: { target_tier: selectedTier },
              })
            }
            className="min-h-11 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 px-6 text-sm font-black text-white shadow-lg hover:brightness-110 disabled:opacity-50"
          >
            {redeem.isPending
              ? 'Đang trang bị…'
              : currentRankTier === selectedTier
              ? `Cập nhật lại ${selectedRankMeta.name}`
              : `Trang bị ngay ${selectedRankMeta.name} (${isAdmin ? 'Miễn phí' : `${selectedRankMeta.cost} Credits`})`}
          </button>
        </div>
      </div>

      {/* 3 ĐẶC QUYỀN CÒN LẠI */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* 1. Thẻ Ưu Tiên Hỗ Trợ */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-orange-100 text-accent">
                <LifeBuoy size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900">
                {isAdmin ? 'Miễn phí (Admin)' : '100 Credits'}
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">1. Thẻ Ưu Tiên Hỗ Trợ</h2>
            <p className="mt-1 text-sm text-slate-600">
              Gửi yêu cầu ưu tiên trực tiếp tới Quản đốc / Ban Tổ Chức để được hỗ trợ ngay trong ca Workshop.
            </p>
            <form
              id="support-perk-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                redeem.mutate({ key: 'priority_support', payload: { note: supportNote } })
              }}
              className="mt-3"
            >
              <label className="block text-xs font-medium text-slate-700">
                Nội dung cần hỗ trợ
                <input
                  required
                  value={supportNote}
                  onChange={(e) => setSupportNote(e.target.value)}
                  placeholder="VD: Cần hỗ trợ xử lý ca QC..."
                  className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900"
                />
              </label>
            </form>
          </div>
          <button
            type="submit"
            form="support-perk-form"
            disabled={redeem.isPending || effectiveCredits < 100}
            className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Kích hoạt Thẻ Hỗ Trợ
          </button>
        </div>

        {/* 2. Thẻ Đổi Task trên Schedule */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <ArrowRightLeft size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900">
                {isAdmin ? 'Miễn phí (Admin)' : '150 Credits'}
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">2. Thẻ Đổi Công Việc (Schedule)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Chọn 1 task trong schedule và chỉ định chuyển giao cho thành viên khác.
            </p>
            <div className="mt-3 space-y-2.5">
              <label className="block text-xs font-medium text-slate-700">
                Công việc cần chuyển
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">
                    {myTasks.length === 0 ? '-- Chưa có task nào đang chờ --' : '-- Chọn công việc --'}
                  </option>
                  {myTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Chỉ định người nhận
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">-- Chọn thành viên nhận việc --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} {m.employee_code ? `(${m.employee_code})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <button
            type="button"
            disabled={redeem.isPending || !selectedTaskId || !targetUserId || effectiveCredits < 150}
            onClick={() =>
              redeem.mutate({
                key: 'swap_task',
                payload: { task_id: selectedTaskId, target_user_id: targetUserId },
              })
            }
            className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Đổi task Ngay
          </button>
        </div>

        {/* 3. Thẻ Thăng Chức Manager */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
                <Crown size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900">
                {isAdmin ? 'Miễn phí (Admin)' : '500 Credits'}
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">3. Thẻ Thăng Chức Manager</h2>
            <p className="mt-1 text-sm text-slate-600">
              Gắn huy hiệu vương miện và tiền tố <b className="text-slate-900">Manager - {profile.full_name}</b> nổi bật trên khung tên.
            </p>
          </div>
          <button
            type="button"
            disabled={redeem.isPending || (!isAdmin && (isManagerTag || effectiveCredits < 500))}
            onClick={() => redeem.mutate({ key: 'manager_promo' })}
            className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isManagerTag
              ? isAdmin
                ? 'Bấm để Gỡ / Bật lại nhãn Manager'
                : 'Đã sở hữu danh hiệu Manager'
              : 'Thăng chức Manager ngay'}
          </button>
        </div>
      </div>

      {/* Nhật ký */}
      <section aria-labelledby="perk-history-heading" className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent" aria-hidden="true" />
          <h2 id="perk-history-heading" className="text-base font-semibold text-slate-900">
            {isAdmin ? 'Nhật ký Đặc quyền & Yêu cầu Hỗ trợ toàn nhà máy' : 'Lịch sử đổi Đặc quyền của bạn'}
          </h2>
        </div>

        {history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Chưa có giao dịch đặc quyền nào.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">Thời gian</th>
                  {isAdmin && <th className="px-3 py-2.5">Nhân viên</th>}
                  <th className="px-3 py-2.5">Đặc quyền / Nội dung</th>
                  <th className="px-3 py-2.5">Chi phí</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      {new Date(h.created_at).toLocaleString('vi-VN')}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        {h.profiles?.full_name ?? 'Nhân viên'}{' '}
                        {h.profiles?.employee_code && (
                          <span className="font-mono text-xs text-slate-500">({h.profiles.employee_code})</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2.5 font-medium text-slate-900">{h.perk_title}</td>
                    <td className="px-3 py-2.5 font-semibold text-amber-800">−{h.cost} Credits</td>
                    <td className="px-3 py-2.5">
                      {h.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                            Chờ hỗ trợ
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => resolveSupport.mutate(h.id)}
                              className="inline-flex min-h-9 items-center gap-1 rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                            >
                              <CheckCircle2 size={13} /> Đã hỗ trợ
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">
                          Hoàn tất
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}