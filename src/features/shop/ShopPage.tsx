import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, CheckCircle2, Crown, LifeBuoy, Shield, Sparkles } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
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

export interface RankMeta {
  key: RankTier
  name: string
  cost: number
  badgeClass: string
  frameClass: string
  glowText: string
}

const RANK_ORDER: RankMeta[] = [
  {
    key: 'bronze',
    name: 'Đồng',
    cost: 100,
    badgeClass: 'border-amber-700/40 bg-amber-100 text-amber-950',
    frameClass: 'ring-2 ring-amber-700/60 bg-amber-50/40',
    glowText: 'Chiến Binh Đồng',
  },
  {
    key: 'silver',
    name: 'Bạc',
    cost: 150,
    badgeClass: 'border-slate-400 bg-slate-200 text-slate-900',
    frameClass: 'ring-2 ring-slate-400 bg-slate-50',
    glowText: 'Hiệp Sĩ Bạc',
  },
  {
    key: 'gold',
    name: 'Vàng',
    cost: 200,
    badgeClass: 'border-yellow-500 bg-yellow-100 text-yellow-950',
    frameClass: 'ring-2 ring-yellow-500 bg-yellow-50/50 shadow-sm',
    glowText: 'Vinh Quang Vàng',
  },
  {
    key: 'emerald',
    name: 'Lục Bảo',
    cost: 300,
    badgeClass: 'border-emerald-600 bg-emerald-100 text-emerald-950',
    frameClass: 'ring-2 ring-emerald-500 bg-emerald-50/50 shadow-sm',
    glowText: 'Tinh Anh Lục Bảo',
  },
  {
    key: 'diamond',
    name: 'Kim Cương',
    cost: 400,
    badgeClass: 'border-cyan-500 bg-cyan-100 text-cyan-950',
    frameClass: 'ring-2 ring-cyan-500 bg-cyan-50/60 shadow-sm',
    glowText: 'Siêu Phẩm Kim Cương',
  },
  {
    key: 'master',
    name: 'Cao Thủ',
    cost: 550,
    badgeClass: 'border-purple-600 bg-purple-100 text-purple-950',
    frameClass: 'ring-2 ring-purple-600 bg-purple-50/60 shadow-md',
    glowText: 'Đẳng Cấp Cao Thủ',
  },
  {
    key: 'challenger',
    name: 'Thách Đấu',
    cost: 700,
    badgeClass: 'border-amber-500 bg-gradient-to-r from-amber-200 via-yellow-100 to-rose-200 text-slate-950',
    frameClass: 'ring-2 ring-amber-500 bg-gradient-to-r from-amber-50 via-white to-rose-50 shadow-md',
    glowText: 'Huyền Thoại Thách Đấu',
  },
]

const RANK_BY_KEY: Record<RankTier, RankMeta> = Object.fromEntries(
  RANK_ORDER.map((r) => [r.key, r]),
) as Record<RankTier, RankMeta>

function getNextRank(current?: string | null): RankMeta | null {
  if (!current) return RANK_ORDER[0]
  const idx = RANK_ORDER.findIndex((r) => r.key === current)
  if (idx === -1) return RANK_ORDER[0]
  return RANK_ORDER[idx + 1] ?? null
}

function HonorPreview({
  fullName,
  rankTier,
  isManager,
  compact = false,
}: {
  fullName?: string | null
  rankTier?: string | null
  isManager?: boolean | null
  compact?: boolean
}) {
  const rank = rankTier ? RANK_BY_KEY[rankTier as RankTier] : undefined
  const base = fullName?.trim() || 'Nhân viên'
  const displayName = isManager ? `Manager - ${base}` : base

  return (
    <div className={`inline-flex flex-col rounded-lg px-2.5 py-1 transition-all ${rank ? rank.frameClass : ''}`}>
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
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${rank.badgeClass}`}>
            <Shield size={11} aria-hidden="true" />
            Super Star · {rank.name}
          </span>
          {!compact && <span className="text-[11px] font-medium text-slate-600">({rank.glowText})</span>}
        </div>
      )}
    </div>
  )
}

const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra. Thử lại sau.'

export function ShopPage() {
  const { profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const isAdmin = profile?.role === 'admin'

  const rankTier = (profile as { rank_tier?: string | null } | null)?.rank_tier ?? null
  const isManagerTag = Boolean((profile as { is_manager_tag?: boolean | null } | null)?.is_manager_tag)
  const nextRank = getNextRank(rankTier)
  const currentRankMeta = rankTier ? RANK_BY_KEY[rankTier as RankTier] : null

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
    qc.invalidateQueries({ queryKey: ['perk-redemptions'] })
    qc.invalidateQueries({ queryKey: ['shop-my-tasks'] })
    qc.invalidateQueries({ queryKey: ['tasks'] })
  }

  const redeem = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload?: Record<string, unknown> }) =>
      redeemPerk(key, payload ?? {}),
    onSuccess: async (res) => {
      setError('')
      setFlash(`Đổi thành công: ${res.perk_title} (−${res.cost} Credits). Số dư còn: ${res.remaining_credits} Credits.`)
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Trạm Đặc Quyền & Vinh Danh (Workshop Perks)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sử dụng Credits tích lũy từ Ca Giả Lập và Công Việc để kích hoạt quyền trợ giúp, chuyển giao lịch việc hoặc thăng bậc danh hiệu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Danh hiệu & Hiển thị hiện tại</div>
            <div className="mt-1">
              <HonorPreview fullName={profile.full_name} rankTier={rankTier} isManager={isManagerTag} />
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 px-4 py-2.5 text-white">
            <div className="text-xs text-slate-300">Số dư khả dụng</div>
            <div className="text-xl font-bold text-amber-400">{profile.credits} Credits</div>
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

      <div className="grid gap-5 md:grid-cols-2">
        {/* 1. Thẻ Ưu Tiên Hỗ Trợ */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-orange-100 text-accent">
                <LifeBuoy size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900">
                100 Credits / lần
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">1. Thẻ Ưu Tiên Hỗ Trợ</h2>
            <p className="mt-1 text-sm text-slate-600">
              Gửi tín hiệu ưu tiên trực tiếp tới Quản đốc / Ban Tổ Chức để được hướng dẫn hoặc gỡ rối ngay một tình huống trong ca Workshop.
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
                Vấn đề bạn cần hỗ trợ ưu tiên
                <input
                  required
                  value={supportNote}
                  onChange={(e) => setSupportNote(e.target.value)}
                  placeholder="VD: Cần hỗ trợ xử lý lệch số liệu ca QC / Lịch sản xuất..."
                  className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900"
                />
              </label>
            </form>
          </div>
          <button
            type="submit"
            form="support-perk-form"
            disabled={redeem.isPending || profile.credits < 100}
            className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Kích hoạt Thẻ Hỗ Trợ (100 Credits)
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
                150 Credits / task
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">2. Thẻ Đổi Công Việc (Schedule)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Chọn 1 công việc đang giao cho bạn trong Lịch & Công việc (chưa hoàn thành) và chỉ định chuyển giao trực tiếp cho thành viên khác.
            </p>
            <div className="mt-3 space-y-2.5">
              <label className="block text-xs font-medium text-slate-700">
                Công việc của bạn cần chuyển
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">
                    {myTasks.length === 0 ? '-- Bạn hiện không có task nào đang chờ --' : '-- Chọn công việc --'}
                  </option>
                  {myTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Chỉ định người nhận công việc này
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
            disabled={redeem.isPending || !selectedTaskId || !targetUserId || profile.credits < 150}
            onClick={() =>
              redeem.mutate({
                key: 'swap_task',
                payload: { task_id: selectedTaskId, target_user_id: targetUserId },
              })
            }
            className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Đổi Công Việc Ngay (150 Credits)
          </button>
        </div>

        {/* 3. Chứng nhận "Super Star" (7 bậc kiểu LOL) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Shield size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">
                {nextRank ? `Bậc kế: ${nextRank.name} (${nextRank.cost} Credits)` : 'Đã đạt bậc Tối Đa'}
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">
              3. Chứng Nhận "Super Star" (Khung & Huy Hiệu 7 Bậc)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Mở khóa Khung viền vinh danh và Huy hiệu hiển thị ngay dưới tên của bạn trên thanh Topbar theo 7 bậc:
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {RANK_ORDER.map((r: RankMeta) => {
                const active = currentRankMeta?.key === r.key
                return (
                  <span
                    key={r.key}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.badgeClass} ${
                      active ? 'ring-2 ring-slate-900' : 'opacity-80'
                    }`}
                  >
                    {r.name} ({r.cost})
                  </span>
                )
              })}
            </div>
          </div>
          <button
            type="button"
            disabled={redeem.isPending || !nextRank || profile.credits < (nextRank?.cost ?? 999999)}
            onClick={() => redeem.mutate({ key: 'super_star_up' })}
            className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {nextRank
              ? `Thăng lên bậc ${nextRank.name} (${nextRank.cost} Credits)`
              : 'Đã đạt bậc Thách Đấu (Tối đa)'}
          </button>
        </div>

        {/* 4. Thẻ Thăng Chức Manager */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
                <Crown size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900">
                500 Credits
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">4. Thẻ Thăng Chức Manager</h2>
            <p className="mt-1 text-sm text-slate-600">
              Được gắn danh hiệu chính thức{' '}
              <b className="text-slate-900">Manager - {profile.full_name}</b> cùng nhãn vương miện nổi bật trên thanh điều hướng.
            </p>
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Xem trước hiển thị sau khi kích hoạt:</div>
              <div className="mt-1">
                <HonorPreview fullName={profile.full_name} rankTier={rankTier} isManager={true} compact />
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={redeem.isPending || isManagerTag || profile.credits < 500}
            onClick={() => redeem.mutate({ key: 'manager_promo' })}
            className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isManagerTag ? 'Đã sở hữu danh hiệu Manager' : 'Thăng chức Manager (500 Credits)'}
          </button>
        </div>
      </div>

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