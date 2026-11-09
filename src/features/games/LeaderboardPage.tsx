import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { fetchLeaderboard, fetchMySessions, fetchXpBoard } from './api'
import { GAMES } from './config'
import type { GameKey } from './types'

const TH = 'p-3 text-xs font-semibold text-slate-600'

export function LeaderboardPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'game' | 'xp'>('game')
  const [game, setGame] = useState<GameKey | ''>('')
  const { data: depts = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => ((await supabase.from('departments').select('id, name').order('name')).data ?? []) as { id: string; name: string }[],
  })
  const dname = (id: string | null) => depts.find((d) => d.id === id)?.name ?? '-'
  const board = useQuery({ queryKey: ['game-board', game], queryFn: () => fetchLeaderboard(game || null), enabled: tab === 'game' })
  const xp = useQuery({ queryKey: ['xp-board'], queryFn: fetchXpBoard, enabled: tab === 'xp' })
  const mine = useQuery({ queryKey: ['game-sessions', profile?.id], queryFn: () => fetchMySessions(profile!.id), enabled: !!profile })
  const tabBtn = (active: boolean) => `min-h-11 rounded-md px-4 text-sm font-semibold ${active ? 'bg-ink text-white' : 'border border-slate-300 bg-white'}`
  const title = (k: string) => GAMES.find((g) => g.key === k)?.title ?? k

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Bảng xếp hạng</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setTab('game')} aria-pressed={tab === 'game'} className={tabBtn(tab === 'game')}>Điểm giả lập</button>
        <button onClick={() => setTab('xp')} aria-pressed={tab === 'xp'} className={tabBtn(tab === 'xp')}>Tổng điểm thưởng (XP)</button>
        {tab === 'game' && (
          <label className="ml-auto text-sm font-medium">
            <span className="sr-only">Chọn game</span>
            <select value={game} onChange={(e) => setGame(e.target.value as GameKey | '')} className="min-h-11 rounded-md border border-slate-300 bg-white px-2">
              <option value="">Tất cả game (xếp theo tổng điểm)</option>
              {GAMES.map((g) => <option key={g.key} value={g.key}>{g.title} (xếp theo điểm cao nhất)</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            {tab === 'game' ? (
              <tr><th className={TH}>Hạng</th><th className={TH}>Họ tên</th><th className={TH}>Phòng ban</th><th className={TH}>Điểm cao nhất</th><th className={TH}>Tổng điểm</th><th className={TH}>Số ca</th></tr>
            ) : (
              <tr><th className={TH}>Hạng</th><th className={TH}>Họ tên</th><th className={TH}>Phòng ban</th><th className={TH}>XP</th><th className={TH}>Credits hiện có</th></tr>
            )}
          </thead>
          <tbody>
            {tab === 'game' && (board.data ?? []).map((r, i) => (
              <tr key={r.player_id} className={`border-t border-slate-100 ${r.player_id === profile?.id ? 'bg-orange-50 font-semibold' : ''}`}>
                <td className="p-3">{i + 1}</td><td className="p-3">{r.full_name}</td><td className="p-3">{dname(r.department_id)}</td>
                <td className="p-3">{r.best_score}</td><td className="p-3">{r.total_score}</td><td className="p-3">{r.plays}</td>
              </tr>
            ))}
            {tab === 'xp' && (xp.data ?? []).map((r, i) => (
              <tr key={r.id} className={`border-t border-slate-100 ${r.id === profile?.id ? 'bg-orange-50 font-semibold' : ''}`}>
                <td className="p-3">{i + 1}</td><td className="p-3">{r.full_name}</td><td className="p-3">{dname(r.department_id)}</td>
                <td className="p-3">{r.xp}</td><td className="p-3">{r.credits}</td>
              </tr>
            ))}
            {((tab === 'game' && board.isSuccess && board.data.length === 0) || (tab === 'xp' && xp.isSuccess && xp.data.length === 0)) && (
              <tr><td colSpan={6} className="p-3 text-slate-600">Chưa có dữ liệu. Hãy chơi một ca ở Trung tâm Giả lập.</td></tr>
            )}
            {(tab === 'game' ? board.isError : xp.isError) && <tr><td colSpan={6} className="p-3 text-red-700">Không tải được bảng xếp hạng. Kiểm tra đã chạy file 005_game_simulator.sql chưa.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-semibold">Lịch sử ca chơi của bạn</h2>
      <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-sm">
        {(mine.data ?? []).slice(0, 10).map((s) => (
          <li key={s.finished_at + s.game_key} className="flex flex-wrap justify-between gap-2 p-3">
            <span>{title(s.game_key)}</span>
            <span className="text-slate-600">{new Date(s.finished_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })} · <b className="text-slate-900">{s.score} điểm</b> · +{s.credits_awarded} Credits</span>
          </li>
        ))}
        {mine.data?.length === 0 && <li className="p-3 text-slate-600">Bạn chưa chơi ca nào.</li>}
      </ul>
    </div>
  )
}
