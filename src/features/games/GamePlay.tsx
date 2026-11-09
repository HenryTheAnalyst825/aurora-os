import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { DEFAULT_CONFIG, fetchGameConfig, finishSession, friendlyError, startSession } from './api'
import { GAME_BY_KEY, type GameMeta } from './config'
import { BinaryDesk, ProductionDesk, RndDesk, type Stamp } from './Desk'
import { generate } from './generators'
import { mulberry32, type Rng } from './rng'
import type { Case, FinishResult, GameKey } from './types'

const POINTS_RIGHT = 10
const POINTS_WRONG = 5

function Timer({ endAt, total, onExpire }: { endAt: number; total: number; onExpire: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, endAt - Date.now()))
  const expire = useRef(onExpire)
  expire.current = onExpire
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, endAt - Date.now())
      setLeft(l)
      if (l <= 0) {
        clearInterval(id)
        expire.current()
      }
    }, 200)
    return () => clearInterval(id)
  }, [endAt])
  const secs = Math.ceil(left / 1000)
  return (
    <div role="timer" aria-label="Thời gian còn lại" className="min-w-40">
      <div className={`text-right text-2xl font-bold tabular-nums ${secs <= 10 ? 'text-red-700' : ''}`}>{secs}s</div>
      <div className="h-1.5 rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${secs <= 10 ? 'bg-red-600' : 'bg-accent'}`} style={{ width: `${Math.min(100, (left / (total * 1000)) * 100)}%` }} />
      </div>
    </div>
  )
}

export function GamePlay() {
  const { gameKey } = useParams()
  const meta = gameKey ? GAME_BY_KEY[gameKey as GameKey] : undefined
  if (!meta) {
    return (
      <div>
        <p className="text-slate-700">Không tìm thấy game này.</p>
        <Link to="/games" className="font-semibold text-accent underline">Về Trung tâm Giả lập</Link>
      </div>
    )
  }
  return <Play key={meta.key} meta={meta} />
}

function Play({ meta }: { meta: GameMeta }) {
  const { refreshProfile } = useAuth()
  const qc = useQueryClient()
  const { data: cfgData } = useQuery({ queryKey: ['game-config'], queryFn: fetchGameConfig })
  const cfg = cfgData ?? DEFAULT_CONFIG
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cur, setCur] = useState<Case | null>(null)
  const [caseNo, setCaseNo] = useState(0)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [stamp, setStamp] = useState<Stamp>(null)
  const [last, setLast] = useState<{ ok: boolean; reason: string } | null>(null)
  const [endAt, setEndAt] = useState(0)
  const [seconds, setSeconds] = useState(60)
  const [result, setResult] = useState<FinishResult | null>(null)
  const [sendError, setSendError] = useState('')

  const rng = useRef<Rng>(() => 0)
  const sessionId = useRef('')
  const counts = useRef({ correct: 0, wrong: 0 })
  const locked = useRef(false)
  const finished = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timeout.current), [])

  const score = stats.correct * POINTS_RIGHT - stats.wrong * POINTS_WRONG

  async function start() {
    setBusy(true)
    setError('')
    try {
      const s = await startSession(meta.key)
      rng.current = mulberry32(s.seed)
      sessionId.current = s.session_id
      counts.current = { correct: 0, wrong: 0 }
      finished.current = false
      locked.current = false
      setStats({ correct: 0, wrong: 0 })
      setLast(null)
      setStamp(null)
      setResult(null)
      setSendError('')
      setSeconds(s.seconds)
      setCur(generate(meta.key, rng.current))
      setCaseNo(1)
      setEndAt(Date.now() + s.seconds * 1000)
      setPhase('playing')
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function sendResult() {
    setSendError('')
    try {
      setResult(await finishSession(sessionId.current, counts.current.correct, counts.current.wrong))
      await refreshProfile()
      qc.invalidateQueries({ queryKey: ['factory-progress'] })
      qc.invalidateQueries({ queryKey: ['game-sessions'] })
      qc.invalidateQueries({ queryKey: ['game-board'] })
    } catch (e) {
      setSendError(friendlyError(e))
    }
  }

  function finish() {
    if (finished.current) return
    finished.current = true
    locked.current = true
    clearTimeout(timeout.current)
    setStamp(null)
    setPhase('done')
    void sendResult()
  }

  function nextCase(delay: number) {
    timeout.current = setTimeout(() => {
      if (finished.current) return
      setStamp(null)
      setCur(generate(meta.key, rng.current))
      setCaseNo((n) => n + 1)
      locked.current = false
    }, delay)
  }

  function record(ok: boolean, reason: string, stampType: Stamp) {
    counts.current = { correct: counts.current.correct + (ok ? 1 : 0), wrong: counts.current.wrong + (ok ? 0 : 1) }
    setStats({ ...counts.current })
    setLast({ ok, reason })
    setStamp(stampType)
    nextCase(ok ? 450 : 700)
  }

  function decide(approve: boolean) {
    if (locked.current || !cur || cur.kind !== 'binary') return
    locked.current = true
    record(approve === cur.valid, cur.reason, approve ? 'approved' : 'rejected')
  }
  const decideRef = useRef(decide)
  decideRef.current = decide

  function submitPuzzle(ok: boolean, reason: string) {
    if (locked.current) return
    locked.current = true
    record(ok, reason, ok ? 'approved' : 'rejected')
  }

  function skip() {
    if (locked.current) return
    locked.current = true
    setLast(null)
    nextCase(0)
  }

  useEffect(() => {
    if (phase !== 'playing' || meta.mode !== 'binary') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decideRef.current(true)
      if (e.key === 'ArrowLeft') decideRef.current(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, meta.mode])

  const Icon = meta.icon

  if (phase === 'intro') {
    return (
      <div className="max-w-2xl">
        <Link to="/games" className="text-sm font-semibold text-accent underline">← Trung tâm Giả lập</Link>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-slate-100 text-ink"><Icon size={22} aria-hidden="true" /></span>
            <div>
              <div className="text-xs font-semibold text-slate-600">Phòng {meta.dept}</div>
              <h1 className="text-xl font-semibold">{meta.title}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-700">{meta.blurb}</p>
          <h2 className="mt-4 text-sm font-semibold">Cách chơi</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {meta.rules.map((r) => <li key={r}>{r}</li>)}
            <li>Mỗi ca kéo dài {cfg.seconds} giây. Đúng +{POINTS_RIGHT} điểm, sai −{POINTS_WRONG} điểm.</li>
            <li>Hết ca, điểm quy đổi thành Credits (mỗi điểm = {cfg.credits_per_point} Credits, tối đa {cfg.max_credits_per_session} Credits mỗi ca, {cfg.max_credit_sessions_per_day} ca có thưởng mỗi ngày).</li>
            <li>Điểm trên {cfg.progress_bonus_threshold} cộng thêm {cfg.progress_bonus_per_session}% vào tiến độ nhà máy.</li>
            <li>Thoát giữa chừng thì ca không được tính.</li>
          </ul>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <button onClick={start} disabled={busy} className="mt-5 min-h-12 rounded-md bg-accent px-6 font-semibold text-white disabled:opacity-60">
            {busy ? 'Đang chuẩn bị…' : `Bắt đầu ca làm việc (${cfg.seconds} giây)`}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="max-w-xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Hết ca làm việc</h1>
          <p className="mt-1 text-sm text-slate-600">{meta.title}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[['Điểm', String(score)], ['Đúng', String(stats.correct)], ['Sai', String(stats.wrong)]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-100 p-3"><dt className="text-xs text-slate-600">{k}</dt><dd className="text-2xl font-bold">{v}</dd></div>
            ))}
          </dl>
          {result ? (
            <div role="status" className="mt-4 text-sm text-slate-800">
              <p>Credits nhận được: <b>+{result.credits}</b></p>
              {result.progress_bonus > 0 && <p>Tiến độ nhà máy: <b>+{result.progress_bonus}%</b></p>}
              {result.capped && <p className="text-amber-800">Bạn đã đạt giới hạn ca có thưởng Credits hôm nay. Điểm vẫn được ghi vào bảng xếp hạng.</p>}
              {result.credits === 0 && !result.capped && score <= 0 && <p className="text-slate-600">Điểm chưa dương nên chưa có Credits. Thử lại nhé.</p>}
            </div>
          ) : sendError ? (
            <div role="alert" className="mt-4 text-sm text-red-700">
              <p>Chưa ghi nhận được kết quả: {sendError}</p>
              <button onClick={() => void sendResult()} className="mt-2 min-h-11 rounded-md border border-slate-300 px-4 font-semibold text-slate-900">Thử gửi lại</button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">Đang ghi nhận kết quả…</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => { setPhase('intro'); setError('') }} className="min-h-11 rounded-md bg-accent px-5 font-semibold text-white">Chơi lại</button>
            <Link to="/leaderboard" className="grid min-h-11 place-items-center rounded-md border border-slate-300 px-5 font-semibold">Xem Xếp hạng</Link>
            <Link to="/games" className="grid min-h-11 place-items-center px-3 font-semibold text-accent underline">Trung tâm Giả lập</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Icon size={20} aria-hidden="true" />
          <h1 className="text-lg font-semibold">{meta.title}</h1>
        </div>
        <dl className="flex gap-4 text-sm">
          <div><dt className="inline text-slate-600">Điểm: </dt><dd className="inline font-bold">{score}</dd></div>
          <div><dt className="inline text-slate-600">Đúng: </dt><dd className="inline font-bold text-green-800">{stats.correct}</dd></div>
          <div><dt className="inline text-slate-600">Sai: </dt><dd className="inline font-bold text-red-800">{stats.wrong}</dd></div>
        </dl>
        <div className="ml-auto"><Timer endAt={endAt} total={seconds} onExpire={finish} /></div>
      </div>
      {cur?.kind === 'binary' && <BinaryDesk key={caseNo} c={cur} meta={meta} stamp={stamp} disabled={!!stamp} onDecide={decide} />}
      {cur?.kind === 'production' && <ProductionDesk key={caseNo} c={cur} meta={meta} stamp={stamp} disabled={!!stamp} onSubmit={submitPuzzle} onSkip={skip} />}
      {cur?.kind === 'rnd' && <RndDesk key={caseNo} c={cur} meta={meta} stamp={stamp} disabled={!!stamp} onSubmit={submitPuzzle} onSkip={skip} />}
      <p role="status" className={`min-h-6 text-sm font-medium ${last?.ok ? 'text-green-800' : 'text-red-800'}`}>
        {last && `${last.ok ? `+${POINTS_RIGHT} Đúng` : `−${POINTS_WRONG} Sai`}: ${last.reason}`}
      </p>
    </div>
  )
}
