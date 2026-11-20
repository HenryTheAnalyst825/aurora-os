import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  Calculator,
  CheckCircle2,
  Clock,
  FileEdit,
  Flame,
  Gamepad2,
  HelpCircle,
  Play,
  Plus,
  RotateCcw,
  Scale,
  Send,
  Sparkles,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

type QuestionType = 'mcq' | 'true_false' | 'should_do' | 'calculation' | 'keyword_essay' | 'mini_game'

type QuizQuestion = {
  id: string
  sort_order: number
  department: string
  q_type: QuestionType
  badge_label: string
  scenario_context: string | null
  question: string
  options: string[]
  correct_index: number
  accepted_keywords: string[]
  min_keywords: number
  points: number
  explanation: string
}

type LeaderboardRow = {
  id: string
  total_score: number
  correct_count: number
  total_questions: number
  created_at: string
  profiles?: { full_name: string; departments?: { name: string } | null } | null
}

type SubmitResponse = {
  credits_awarded: number
  capped: boolean
  remaining_today: number
}

const DEPARTMENTS = ['ALL', 'Sản xuất', 'QC', 'EHS', 'HR', 'Tài chính', 'R&D'] as const
const SECONDS_PER_QUESTION = 30

const TYPE_META: Record<
  QuestionType,
  { title: string; badgeClass: string; cardBorder: string; icon: typeof Flame }
> = {
  mcq: {
    title: 'Case Thực Tế',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    cardBorder: 'border-slate-200',
    icon: HelpCircle,
  },
  calculation: {
    title: 'Tính Toán Nghiệp Vụ (+15đ)',
    badgeClass: 'bg-cyan-100 text-cyan-950 border-cyan-300',
    cardBorder: 'border-cyan-300',
    icon: Calculator,
  },
  should_do: {
    title: 'Nên hay Không nên',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
    cardBorder: 'border-amber-300',
    icon: Scale,
  },
  true_false: {
    title: 'Đúng hay Sai',
    badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    cardBorder: 'border-emerald-300',
    icon: CheckCircle2,
  },
  keyword_essay: {
    title: 'Tự Luận Bắt Từ Khóa (+15đ)',
    badgeClass: 'bg-orange-100 text-orange-950 border-orange-300',
    cardBorder: 'border-orange-300',
    icon: FileEdit,
  },
  mini_game: {
    title: 'Mini-Game Phòng Ban (+15đ)',
    badgeClass: 'bg-purple-100 text-purple-950 border-purple-300',
    cardBorder: 'border-purple-400 ring-1 ring-purple-200',
    icon: Gamepad2,
  },
}

function normalizeText(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim()
}

async function fetchQuizBank(): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('quiz_bank')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as QuizQuestion[]
}

async function fetchArenaLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, total_score, correct_count, total_questions, created_at, profiles(full_name, departments(name))')
    .order('total_score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(8)
  if (error) return []
  return (data ?? []) as unknown as LeaderboardRow[]
}

export function QuizPage() {
  const { profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const isAdmin = profile?.role === 'admin'

  const bankQuery = useQuery({ queryKey: ['quiz-bank'], queryFn: fetchQuizBank })
  const boardQuery = useQuery({ queryKey: ['quiz-leaderboard'], queryFn: fetchArenaLeaderboard })

  // Trạng thái thi đấu
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'summary'>('lobby')
  const [roundQuestions, setRoundQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [essayInput, setEssayInput] = useState('')
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION)
  const [correctCount, setCorrectCount] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null)
  const [submitError, setSubmitError] = useState('')

  // Form Admin thêm câu hỏi mới
  const [showAddForm, setShowAddForm] = useState(false)
  const [fDept, setFDept] = useState('Sản xuất')
  const [fType, setFType] = useState<QuestionType>('mcq')
  const [fContext, setFContext] = useState('')
  const [fQuestion, setFQuestion] = useState('')
  const [fOpt0, setFOpt0] = useState('')
  const [fOpt1, setFOpt1] = useState('')
  const [fOpt2, setFOpt2] = useState('')
  const [fOpt3, setFOpt3] = useState('')
  const [fCorrect, setFCorrect] = useState(0)
  const [fKeywords, setFKeywords] = useState('')
  const [fExplain, setFExplain] = useState('')

  const currentQ = roundQuestions[currentIndex] ?? null

  // Đồng hồ đếm ngược 30s mỗi câu
  useEffect(() => {
    if (phase !== 'playing' || answered) return
    if (timeLeft <= 0) {
      setAnswered(true)
      setIsCurrentCorrect(false)
      setSelectedOption(-1)
      setStreak(0)
      return
    }
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [phase, answered, timeLeft])

  function startArena(deptFilter: string) {
    const all = bankQuery.data ?? []
    const pool =
      deptFilter === 'ALL'
        ? all
        : all.filter((q) => q.department.toLowerCase() === deptFilter.toLowerCase())
    if (pool.length === 0) return

    setSelectedDept(deptFilter)
    setRoundQuestions(pool)
    setCurrentIndex(0)
    setAnswered(false)
    setIsCurrentCorrect(false)
    setSelectedOption(null)
    setEssayInput('')
    setMatchedKeywords([])
    setTimeLeft(SECONDS_PER_QUESTION)
    setCorrectCount(0)
    setScore(0)
    setStreak(0)
    setSubmitResult(null)
    setSubmitError('')
    setPhase('playing')
  }

  function handleOptionAnswer(idx: number) {
    if (answered || !currentQ) return
    const ok = idx === currentQ.correct_index
    setAnswered(true)
    setSelectedOption(idx)
    setIsCurrentCorrect(ok)
    if (ok) {
      const speedBonus = timeLeft >= 18 ? 2 : 0
      setCorrectCount((c) => c + 1)
      setScore((s) => s + currentQ.points + speedBonus)
      setStreak((st) => st + 1)
    } else {
      setStreak(0)
    }
  }

  function handleEssaySubmit(e: FormEvent) {
    e.preventDefault()
    if (answered || !currentQ || !essayInput.trim()) return
    const normUser = normalizeText(essayInput)
    const kws = currentQ.accepted_keywords ?? []
    const found = kws.filter((k) => normUser.includes(normalizeText(k)))
    const needed = Math.max(1, currentQ.min_keywords || 2)
    const ok = found.length >= needed

    setMatchedKeywords(found)
    setAnswered(true)
    setIsCurrentCorrect(ok)
    if (ok) {
      setCorrectCount((c) => c + 1)
      setScore((s) => s + currentQ.points)
      setStreak((st) => st + 1)
    } else {
      setStreak(0)
    }
  }

  async function nextStep() {
    if (currentIndex + 1 < roundQuestions.length) {
      setCurrentIndex((i) => i + 1)
      setAnswered(false)
      setIsCurrentCorrect(false)
      setSelectedOption(null)
      setEssayInput('')
      setMatchedKeywords([])
      setTimeLeft(SECONDS_PER_QUESTION)
    } else {
      setPhase('summary')
      try {
        const { data, error } = await supabase.rpc('submit_quiz_arena', {
          p_mode: selectedDept,
          p_total: roundQuestions.length,
          p_correct: correctCount,
          p_score: score,
        })
        if (error) throw error
        setSubmitResult(data as SubmitResponse)
        await refreshProfile()
        qc.invalidateQueries({ queryKey: ['quiz-leaderboard'] })
      } catch (e: unknown) {
        setSubmitError((e as { message?: string })?.message ?? 'Không thể ghi nhận kết quả.')
      }
    }
  }

  const createQuestion = useMutation({
    mutationFn: async () => {
      const isBinary = fType === 'true_false' || fType === 'should_do'
      const isEssay = fType === 'keyword_essay'
      const opts = isEssay
        ? []
        : isBinary
        ? [fOpt0.trim(), fOpt1.trim()]
        : [fOpt0.trim(), fOpt1.trim(), fOpt2.trim(), fOpt3.trim()]
      const kwList = isEssay
        ? fKeywords.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      const nextOrder = (bankQuery.data?.length ?? 0) + 1
      const highPoints = ['calculation', 'keyword_essay', 'mini_game'].includes(fType)

      const { error } = await supabase.from('quiz_bank').insert({
        sort_order: nextOrder,
        department: fDept,
        q_type: fType,
        badge_label: `${TYPE_META[fType].title.replace(' (+15đ)', '')} · ${fDept}`,
        scenario_context: fContext.trim() || null,
        question: fQuestion.trim(),
        options: opts,
        correct_index: fCorrect,
        accepted_keywords: kwList,
        min_keywords: 2,
        points: highPoints ? 15 : 10,
        explanation: fExplain.trim() || 'Đáp án chuẩn theo quy trình vận hành Aurora OS.',
      })
      if (error) throw error
    },
    onSuccess: () => {
      setFContext('')
      setFQuestion('')
      setFOpt0('')
      setFOpt1('')
      setFOpt2('')
      setFOpt3('')
      setFKeywords('')
      setFExplain('')
      setShowAddForm(false)
      qc.invalidateQueries({ queryKey: ['quiz-bank'] })
    },
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* BANNER ĐẤU TRƯỜNG */}
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
            <Users size={13} />
            Chế độ Thi Đấu Đồng Loạt Toàn Hội Trường
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Đấu Trường Tình Huống & Nghiệp Vụ (Interactive Quiz)
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Ngân hàng <b>{bankQuery.data?.length ?? 0} thử thách</b> đa định dạng: Case thực tế, Tính toán, Đúng/Sai, Nên/Không nên, Tự luận bắt từ khóa & Mini-Game.
          </p>
        </div>

        {isAdmin && phase === 'lobby' && (
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-slate-950 hover:bg-slate-100"
          >
            <Plus size={16} />
            {showAddForm ? 'Đóng form thêm câu hỏi' : 'Bổ sung câu hỏi mới'}
          </button>
        )}
      </header>

      {/* FORM ADMIN THÊM CÂU HỎI MỚI */}
      {isAdmin && showAddForm && phase === 'lobby' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            createQuestion.mutate()
          }}
          className="space-y-4 rounded-xl border border-slate-300 bg-white p-6 shadow-xs"
        >
          <h2 className="text-base font-bold text-slate-900">Bổ sung câu hỏi mới vào Ngân hàng Quiz</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-slate-700">
              Phòng ban
              <select
                value={fDept}
                onChange={(e) => setFDept(e.target.value)}
                className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              >
                {DEPARTMENTS.filter((d) => d !== 'ALL').map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Hình thức câu hỏi
              <select
                value={fType}
                onChange={(e) => {
                  setFType(e.target.value as QuestionType)
                  setFCorrect(0)
                }}
                className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              >
                <option value="mcq">Case Thực Tế (4 lựa chọn)</option>
                <option value="calculation">Tính Toán Nghiệp Vụ (+15đ)</option>
                <option value="should_do">Nên hay Không nên (2 lựa chọn)</option>
                <option value="true_false">Đúng hay Sai (2 lựa chọn)</option>
                <option value="keyword_essay">Tự Luận Bắt Từ Khóa (+15đ)</option>
                <option value="mini_game">Mini-Game Phòng Ban (+15đ)</option>
              </select>
            </label>
            {fType !== 'keyword_essay' && (
              <label className="block text-xs font-semibold text-slate-700">
                Đáp án chính xác
                <select
                  value={fCorrect}
                  onChange={(e) => setFCorrect(Number(e.target.value))}
                  className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                >
                  <option value={0}>Phương án 1 (A)</option>
                  <option value={1}>Phương án 2 (B)</option>
                  {fType !== 'true_false' && fType !== 'should_do' && (
                    <>
                      <option value={2}>Phương án 3 (C)</option>
                      <option value={3}>Phương án 4 (D)</option>
                    </>
                  )}
                </select>
              </label>
            )}
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            Bối cảnh / Dữ kiện tình huống (Case Scenario)
            <textarea
              rows={2}
              value={fContext}
              onChange={(e) => setFContext(e.target.value)}
              placeholder="Nhập dữ kiện thực tế tại xưởng hoặc số liệu tính toán..."
              className="mt-1 block w-full rounded-md border border-slate-300 p-2.5 text-sm"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Câu hỏi yêu cầu quyết định
            <input
              required
              value={fQuestion}
              onChange={(e) => setFQuestion(e.target.value)}
              className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          </label>

          {fType === 'keyword_essay' ? (
            <label className="block text-xs font-semibold text-slate-700">
              Danh sách từ khóa chấm điểm (cách nhau bởi dấu phẩy — chỉ cần đúng từ 2 từ khóa trở lên)
              <input
                required
                placeholder="VD: ẩn danh, qr, không phạt, khen thưởng, credits"
                value={fKeywords}
                onChange={(e) => setFKeywords(e.target.value)}
                className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              />
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <input required placeholder="Phương án 1 (A)" value={fOpt0} onChange={(e) => setFOpt0(e.target.value)} className="min-h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <input required placeholder="Phương án 2 (B)" value={fOpt1} onChange={(e) => setFOpt1(e.target.value)} className="min-h-10 rounded-md border border-slate-300 px-3 text-sm" />
              {fType !== 'true_false' && fType !== 'should_do' && (
                <>
                  <input required placeholder="Phương án 3 (C)" value={fOpt2} onChange={(e) => setFOpt2(e.target.value)} className="min-h-10 rounded-md border border-slate-300 px-3 text-sm" />
                  <input required placeholder="Phương án 4 (D)" value={fOpt3} onChange={(e) => setFOpt3(e.target.value)} className="min-h-10 rounded-md border border-slate-300 px-3 text-sm" />
                </>
              )}
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-700">
            Giải thích kiến thức sau khi trả lời
            <input
              required
              value={fExplain}
              onChange={(e) => setFExplain(e.target.value)}
              className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          </label>

          <button
            disabled={createQuestion.isPending}
            className="min-h-10 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white"
          >
            {createQuestion.isPending ? 'Đang lưu...' : 'Lưu vào Ngân hàng Quiz'}
          </button>
        </form>
      )}

      {/* ==================== MÀN HÌNH 1: SẢNH CHỜ & BẢNG VÀNG ==================== */}
      {phase === 'lobby' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="space-y-4 rounded-2xl border-2 border-teal-600 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold uppercase text-teal-900">
                  Thi Đấu Đồng Loạt Sự Kiện
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {bankQuery.data?.length ?? 0} câu · Bộ đề đồng bộ 100%
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  1. Đấu Trường Tổng Hợp 6 Phòng Ban
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Tất cả thành viên cùng chinh phục chuỗi thử thách đa dạng: <b>Case thực tế</b>, <b>Tính toán OEE/ROI</b>, <b>Đúng/Sai</b>, <b>Nên/Không nên</b>, <b>Tự luận bắt từ khóa</b> và <b>Mini-Game</b>.
                </p>
              </div>
              <button
                type="button"
                disabled={bankQuery.isLoading || (bankQuery.data?.length ?? 0) === 0}
                onClick={() => startArena('ALL')}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-extrabold text-white shadow-xs transition hover:bg-teal-700 disabled:opacity-50 sm:w-auto"
              >
                <Play size={18} />
                Vào Đấu Trường Đồng Loạt ({bankQuery.data?.length ?? 0} câu)
              </button>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  2. Chinh Phục Theo Từng Phòng Ban
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Mỗi phòng ban gồm trọn bộ các hình thức câu hỏi nghiệp vụ & tính toán chuyên sâu.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {DEPARTMENTS.filter((d) => d !== 'ALL').map((dept) => {
                  const count = (bankQuery.data ?? []).filter(
                    (q) => q.department.toLowerCase() === dept.toLowerCase()
                  ).length
                  return (
                    <button
                      key={dept}
                      type="button"
                      disabled={count === 0}
                      onClick={() => startArena(dept)}
                      className="flex flex-col items-start rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-left transition hover:border-slate-900 hover:bg-white disabled:opacity-40"
                    >
                      <span className="text-sm font-bold text-slate-900">Phòng {dept}</span>
                      <span className="mt-1 text-xs font-medium text-teal-700">
                        {count} thử thách →
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Cột phải: Bảng Vàng */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-amber-500" />
                  <h2 className="text-base font-bold text-slate-900">Bảng Vàng Đấu Trường Quiz</h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Live Ranking</span>
              </div>

              {boardQuery.data && boardQuery.data.length > 0 ? (
                <ul className="mt-4 space-y-2.5">
                  {boardQuery.data.map((row, idx) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">
                            {row.profiles?.full_name ?? 'Thành viên'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {row.profiles?.departments?.name ?? 'Aurora'} · Đúng {row.correct_count}/{row.total_questions}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-extrabold text-teal-900">
                        {row.total_score} đ
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  Chưa có lượt hoàn thành nào. Hãy là người đầu tiên ghi danh lên Bảng Vàng!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MÀN HÌNH 2: ĐANG THI ĐẤU (6 ĐỊNH DẠNG ĐỘNG) ==================== */}
      {phase === 'playing' && currentQ && (() => {
        const meta = TYPE_META[currentQ.q_type] ?? TYPE_META.mcq
        const TypeIcon = meta.icon
        const isBinaryLayout = currentQ.q_type === 'true_false' || currentQ.q_type === 'should_do'

        return (
          <div className={`space-y-5 rounded-2xl border-2 bg-white p-6 shadow-sm ${meta.cardBorder}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-black text-white">
                  Câu {currentIndex + 1} / {roundQuestions.length}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${meta.badgeClass}`}>
                  <TypeIcon size={14} />
                  {currentQ.badge_label}
                </span>
                {streak >= 2 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">
                    <Flame size={13} /> Chuỗi {streak}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-slate-500">Điểm số</div>
                  <div className="text-base font-black text-teal-700">{score} đ</div>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-base font-black tabular-nums ${
                    timeLeft <= 6 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-950'
                  }`}
                >
                  <Clock size={17} />
                  {timeLeft}s
                </div>
              </div>
            </div>

            {currentQ.scenario_context && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Dữ kiện Tình huống
                </div>
                {currentQ.scenario_context}
              </div>
            )}

            <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
              {currentQ.question}
            </h2>

            {/* ĐỊNH DẠNG TỰ LUẬN BẮT TỪ KHÓA (DETECT-KEYWORD) */}
            {currentQ.q_type === 'keyword_essay' ? (
              <form onSubmit={handleEssaySubmit} className="space-y-3">
                <textarea
                  rows={3}
                  disabled={answered}
                  value={essayInput}
                  onChange={(e) => setEssayInput(e.target.value)}
                  placeholder="Nhập giải pháp xử lý của bạn (hệ thống tự động chấm điểm dựa trên các từ khóa nghiệp vụ cốt lõi)..."
                  className="block w-full rounded-xl border-2 border-slate-300 p-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
                />
                {!answered && (
                  <button
                    type="submit"
                    disabled={!essayInput.trim()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-40"
                  >
                    <Send size={15} /> Chấm điểm câu trả lời
                  </button>
                )}
              </form>
            ) : (
              /* ĐỊNH DẠNG CHỌN PHƯƠNG ÁN (MCQ / CALCULATION / TRUE_FALSE / SHOULD_DO / MINI_GAME) */
              <div className={isBinaryLayout ? 'grid gap-3.5 sm:grid-cols-2' : 'grid gap-3'}>
                {currentQ.options.map((opt, idx) => {
                  const isCorrect = idx === currentQ.correct_index
                  const isChosen = idx === selectedOption

                  let style = 'border-slate-200 bg-white text-slate-900 hover:border-slate-900 hover:bg-slate-50'
                  if (isBinaryLayout && !answered) {
                    style =
                      idx === 0
                        ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 hover:border-emerald-600'
                        : 'border-rose-300 bg-rose-50/60 text-rose-950 hover:border-rose-600'
                  }

                  if (answered) {
                    if (isCorrect) {
                      style = 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/30'
                    } else if (isChosen) {
                      style = 'border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-500/30'
                    } else {
                      style = 'border-slate-200 bg-slate-50/40 text-slate-400'
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answered}
                      onClick={() => handleOptionAnswer(idx)}
                      className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 p-4 text-left text-sm transition ${style}`}
                    >
                      <div className="flex items-start gap-3">
                        {!isBinaryLayout && (
                          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-900/10 text-xs font-extrabold">
                            {['A', 'B', 'C', 'D'][idx]}
                          </span>
                        )}
                        <span>{opt}</span>
                      </div>
                      {answered && isCorrect && <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />}
                      {answered && isChosen && !isCorrect && <XCircle size={20} className="shrink-0 text-rose-600" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* PHẢN HỒI SAU KHI TRẢ LỜI */}
            {answered && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-extrabold">
                  {isCurrentCorrect ? (
                    <span className="text-emerald-700">✓ Đạt chuẩn! (+{currentQ.points} điểm)</span>
                  ) : selectedOption === -1 ? (
                    <span className="text-amber-700">⏰ Hết thời gian!</span>
                  ) : (
                    <span className="text-rose-700">✕ Chưa đạt yêu cầu</span>
                  )}
                </div>

                {currentQ.q_type === 'keyword_essay' && (
                  <div className="text-xs text-slate-700">
                    Từ khóa nhận diện được:{' '}
                    {matchedKeywords.length > 0 ? (
                      <span className="font-bold text-emerald-700">{matchedKeywords.join(', ')}</span>
                    ) : (
                      <span className="font-semibold text-rose-700">Chưa trúng từ khóa cốt lõi</span>
                    )}{' '}
                    (Cần tối thiểu {currentQ.min_keywords} từ khóa trong bộ: <i>{currentQ.accepted_keywords.join(', ')}</i>)
                  </div>
                )}

                <p className="text-xs leading-relaxed text-slate-700">
                  <b>Đáp án & Giải thích chuẩn:</b> {currentQ.explanation}
                </p>

                <button
                  type="button"
                  onClick={() => void nextStep()}
                  className="min-h-11 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white hover:bg-slate-800"
                >
                  {currentIndex + 1 < roundQuestions.length ? 'Thử thách tiếp theo →' : 'Hoàn thành & Nhận Credits'}
                </button>
              </div>
            )}
          </div>
        )
      })()}

      {/* ==================== MÀN HÌNH 3: TỔNG KẾT & CỘNG THƯỞNG ==================== */}
      {phase === 'summary' && (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <Award size={34} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Hoàn Thành Đấu Trường Quiz!</h2>
            <p className="mt-1 text-sm text-slate-600">
              Bạn vượt qua <b>{correctCount}/{roundQuestions.length}</b> thử thách · Tổng điểm: <b>{score} điểm</b>
            </p>
          </div>

          {submitResult ? (
            <div className="mx-auto max-w-md space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <div className="inline-flex items-center gap-1.5 text-lg font-black text-amber-800">
                <Sparkles size={20} />
                +{submitResult.credits_awarded} Aurora Credits
              </div>
              <p className="text-xs text-amber-800">
                {submitResult.capped
                  ? 'Bạn đã dùng hết 5 lượt nhận thưởng Quiz hôm nay (điểm vẫn được ghi nhận lên Bảng Vàng).'
                  : `Còn lại ${submitResult.remaining_today}/5 lượt nhận thưởng Credits trong hôm nay.`}
              </p>
            </div>
          ) : submitError ? (
            <p className="text-sm font-semibold text-red-700">{submitError}</p>
          ) : (
            <p className="text-sm text-slate-500">Đang đồng bộ điểm và cộng Credits…</p>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPhase('lobby')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700"
            >
              <RotateCcw size={16} /> Quay lại Sảnh Đấu Trường
            </button>
            <Link
              to="/shop"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Đổi Đặc Quyền & Rank
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}