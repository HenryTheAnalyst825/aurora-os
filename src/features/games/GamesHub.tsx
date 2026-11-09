import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { DEFAULT_CONFIG, fetchGameConfig, fetchMySessions } from './api'
import { GAMES } from './config'

export function GamesHub() {
  const { profile } = useAuth()
  const { data: cfgData } = useQuery({ queryKey: ['game-config'], queryFn: fetchGameConfig })
  const cfg = cfgData ?? DEFAULT_CONFIG
  const { data: sessions = [] } = useQuery({
    queryKey: ['game-sessions', profile?.id],
    queryFn: () => fetchMySessions(profile!.id),
    enabled: !!profile,
  })
  const best = new Map<string, number>()
  for (const s of sessions) best.set(s.game_key, Math.max(best.get(s.game_key) ?? -Infinity, s.score))
  const mine = profile?.departments?.name
  const list = [...GAMES].sort((a, b) => Number(b.dept === mine) - Number(a.dept === mine))

  return (
    <div>
      <h1 className="text-xl font-semibold">Trung tâm Giả lập Nghiệp vụ Nhà máy</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-700">
        Mỗi phòng ban có một bàn làm việc giả lập. Mỗi ca {cfg.seconds} giây: đúng +10 điểm, sai −5 điểm. Điểm quy đổi thành Credits ({cfg.credits_per_point} Credits mỗi điểm)
        và vào bảng xếp hạng; ca trên {cfg.progress_bonus_threshold} điểm còn cộng thêm vào tiến độ nhà máy.
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((g) => {
          const Icon = g.icon
          const own = g.dept === mine
          const b = best.get(g.key)
          return (
            <li key={g.key}>
              <Link to={`/games/${g.key}`} className={`flex h-full flex-col gap-3 rounded-xl border bg-white p-5 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent ${own ? 'border-accent' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-lg bg-slate-100 text-ink"><Icon size={22} aria-hidden="true" /></span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${own ? 'bg-orange-100 text-orange-900' : 'bg-slate-200 text-slate-700'}`}>
                    {own ? `Phòng của bạn: ${g.dept}` : `Phòng ${g.dept}`}
                  </span>
                </div>
                <div className="font-semibold">{g.title}</div>
                <p className="flex-1 text-sm text-slate-600">{g.blurb}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{b === undefined ? 'Chưa chơi' : `Điểm cao nhất: ${b}`}</span>
                  <span className="font-semibold text-accent">Vào ca làm việc →</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
