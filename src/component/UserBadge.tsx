import { Crown, Shield } from 'lucide-react'

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

export const RANK_ORDER: RankMeta[] = [
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

export const RANK_BY_KEY: Record<RankTier, RankMeta> = Object.fromEntries(
  RANK_ORDER.map((r) => [r.key, r]),
) as Record<RankTier, RankMeta>

export function getNextRank(current?: string | null): RankMeta | null {
  if (!current) return RANK_ORDER[0]
  const idx = RANK_ORDER.findIndex((r) => r.key === current)
  if (idx === -1) return RANK_ORDER[0]
  return RANK_ORDER[idx + 1] ?? null
}

export function formatDisplayName(fullName?: string | null, isManager?: boolean | null): string {
  const base = fullName?.trim() || 'Nhân viên'
  return isManager ? `Manager - ${base}` : base
}

export function UserHonorDisplay({
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
  const displayName = formatDisplayName(fullName, isManager)

  return (
    <div
      className={`inline-flex flex-col rounded-lg px-2.5 py-1 transition-all ${
        rank ? rank.frameClass : ''
      }`}
    >
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
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${rank.badgeClass}`}
          >
            <Shield size={11} aria-hidden="true" />
            Super Star · {rank.name}
          </span>
          {!compact && <span className="text-[11px] font-medium text-slate-600">({rank.glowText})</span>}
        </div>
      )}
    </div>
  )
}