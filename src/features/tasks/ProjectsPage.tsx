import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, BookOpen, CheckCircle2, FolderKanban, Plus, Send, Sparkles, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { createProject, fetchProjects } from './api'

type CaseStudy = {
  id: string
  tag_code: string
  department_tag: string
  title: string
  role_title: string
  difficulty: string
  reward_credits: number
  scenario: string
  questions: string
  created_at: string
}

type CaseSubmission = {
  id: string
  case_id: string
  user_id: string
  analysis: string
  solution: string
  status: 'submitted' | 'approved'
  awarded_credits: number
  created_at: string
  profiles?: { full_name: string } | null
}

const DEPT_TAGS = ['ALL', 'QC/QA', 'EHS', 'R&D', 'HR', 'FINANCE', 'SALES'] as const

const TAG_BADGE_STYLE: Record<string, string> = {
  'QC/QA': 'bg-cyan-100 text-cyan-900 border-cyan-300',
  EHS: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  'R&D': 'bg-purple-100 text-purple-900 border-purple-300',
  HR: 'bg-amber-100 text-amber-900 border-amber-300',
  FINANCE: 'bg-blue-100 text-blue-900 border-blue-300',
  SALES: 'bg-rose-100 text-rose-900 border-rose-300',
}

async function fetchCaseStudies(): Promise<CaseStudy[]> {
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as CaseStudy[]
}

async function fetchCaseSubmissions(caseId: string): Promise<CaseSubmission[]> {
  const { data, error } = await supabase
    .from('case_submissions')
    .select('*, profiles(full_name)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as CaseSubmission[]
}

export function ProjectsPage() {
  const { profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const isAdmin = profile?.role === 'admin'

  // Chuyển đổi giữa tab Dự án thường và tab Case Study
  const [activeTab, setActiveTab] = useState<'projects' | 'cases'>('cases')

  // --- State cho Tab Dự án Kanban ---
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const create = useMutation({
    mutationFn: () => createProject(name.trim(), desc.trim() || null, profile!.id),
    onSuccess: () => {
      setName('')
      setDesc('')
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  // --- State cho Tab Case Study ---
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState('')
  const [solution, setSolution] = useState('')
  const [caseMsg, setCaseMsg] = useState('')
  const [caseErr, setCaseErr] = useState('')
  const [showNewCaseForm, setShowNewCaseForm] = useState(false)

  // State tạo Case Study mới (dành cho Admin)
  const [newTagCode, setNewTagCode] = useState('')
  const [newDeptTag, setNewDeptTag] = useState('QC/QA')
  const [newTitle, setNewTitle] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newReward, setNewReward] = useState(150)
  const [newScenario, setNewScenario] = useState('')
  const [newQuestions, setNewQuestions] = useState('')

  const casesQuery = useQuery({
    queryKey: ['case-studies'],
    queryFn: fetchCaseStudies,
  })

  const filteredCases = useMemo(() => {
    const list = casesQuery.data ?? []
    if (selectedDept === 'ALL') return list
    return list.filter((c) => c.department_tag.toUpperCase() === selectedDept)
  }, [casesQuery.data, selectedDept])

  const activeCase = useMemo(() => {
    const list = filteredCases.length > 0 ? filteredCases : (casesQuery.data ?? [])
    return list.find((c) => c.id === selectedCaseId) ?? list[0] ?? null
  }, [filteredCases, casesQuery.data, selectedCaseId])

  const submissionsQuery = useQuery({
    queryKey: ['case-submissions', activeCase?.id],
    queryFn: () => fetchCaseSubmissions(activeCase!.id),
    enabled: Boolean(activeCase?.id),
  })

  const submitSolution = useMutation({
    mutationFn: async () => {
      if (!activeCase || !profile) return
      const { error } = await supabase.from('case_submissions').upsert(
        {
          case_id: activeCase.id,
          user_id: profile.id,
          analysis: analysis.trim(),
          solution: solution.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'case_id,user_id' }
      )
      if (error) throw error
    },
    onSuccess: () => {
      setCaseErr('')
      setCaseMsg('Đã lưu và nộp bài giải Case Study thành công!')
      qc.invalidateQueries({ queryKey: ['case-submissions', activeCase?.id] })
    },
    onError: (e: unknown) => {
      setCaseMsg('')
      setCaseErr((e as { message?: string })?.message ?? 'Không thể nộp bài giải.')
    },
  })

  const approveSubmission = useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase.rpc('approve_case_submission', {
        p_submission_id: submissionId,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['case-submissions', activeCase?.id] })
      if (refreshProfile) await refreshProfile()
    },
    onError: (e: unknown) => {
      setCaseErr((e as { message?: string })?.message ?? 'Không thể duyệt thưởng.')
    },
  })

  const createCaseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('case_studies').insert({
        tag_code: newTagCode.trim() || `${newDeptTag} - CASE`,
        department_tag: newDeptTag,
        title: newTitle.trim(),
        role_title: newRole.trim() || 'Department Manager',
        difficulty: 'Trung bình',
        reward_credits: newReward,
        scenario: newScenario.trim(),
        questions: newQuestions.trim(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewTagCode('')
      setNewTitle('')
      setNewRole('')
      setNewScenario('')
      setNewQuestions('')
      setShowNewCaseForm(false)
      qc.invalidateQueries({ queryKey: ['case-studies'] })
    },
  })

  const input =
    'mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-normal focus:outline-2 focus:outline-accent'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header & Thanh chuyển đổi Tab Dự án / Case Study */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Trung tâm Dự án & Case Study Phòng Ban</h1>
          <p className="mt-1 text-sm text-slate-600">
            Quản lý tiến độ công việc theo dự án hoặc tham gia giải Case Study nghiệp vụ để tích lũy Aurora Credits.
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cases'}
            onClick={() => setActiveTab('cases')}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              activeTab === 'cases' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen aria-hidden="true" size="{16}"/>
            Case Study ({casesQuery.data?.length ?? 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              activeTab === 'projects' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FolderKanban aria-hidden="true" size="{16}"/>
            Bảng Dự Án ({projects.length})
          </button>
        </div>
      </div>

      {/* ================= NHÁNH 1: THƯ VIỆN CASE STUDY THEO PHÒNG BAN ================= */}
      {activeTab === 'cases' && (
        <div className="space-y-5">
          {/* Thanh lọc Tag theo Phòng ban */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Tag aria-hidden="true" size="{14}"/>
                Tag Phòng Ban:
              </span>
              {DEPT_TAGS.map((tag) => {
                const active = selectedDept === tag
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedDept(tag)}
                    className={`min-h-9 rounded-full border px-3.5 text-xs font-bold transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tag === 'ALL' ? 'Tất cả phòng ban' : tag}
                  </button>
                )
              })}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowNewCaseForm((v) => !v)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Plus aria-hidden="true" size="{14}"/>
                {showNewCaseForm ? 'Đóng form thêm Case' : 'Thêm Case Study'}
              </button>
            )}
          </div>

          {/* Form Admin tạo thêm Case mới nếu cần */}
          {isAdmin && showNewCaseForm && (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                createCaseMutation.mutate()
              }}
              className="rounded-xl border border-slate-300 bg-slate-50 p-5 space-y-4"
            >
              <h2 className="font-bold text-slate-900">Thêm Case Study mới vào Thư viện</h2>
              <div className="grid gap-4 sm:grid-cols-4">
                <label className="block text-xs font-semibold text-slate-700">
                  Phòng ban (Tag)
                  <select
                    value={newDeptTag}
                    onChange={(e) => setNewDeptTag(e.target.value)}
                    className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  >
                    {DEPT_TAGS.filter((t) => t !== 'ALL').map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Mã Tag (VD: QC/QA - CASE 3)
                  <input
                    value={newTagCode}
                    onChange={(e) => setNewTagCode(e.target.value)}
                    placeholder="QC/QA - CASE 3"
                    className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Vai trò đóng vai
                  <input
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="QA/QC Manager"
                    className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Thưởng Credits
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={newReward}
                    onChange={(e) => setNewReward(Number(e.target.value))}
                    className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Tiêu đề Case Study
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nhập tiêu đề tình huống..."
                  className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Nội dung bối cảnh & Dữ kiện đề bài
                <textarea
                  required
                  rows={5}
                  value={newScenario}
                  onChange={(e) => setNewScenario(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-3 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Câu hỏi yêu cầu giải quyết
                <textarea
                  required
                  rows={3}
                  value={newQuestions}
                  onChange={(e) => setNewQuestions(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-3 text-sm"
                />
              </label>
              <button
                disabled={createCaseMutation.isPending}
                className="min-h-10 rounded-lg bg-accent px-5 text-sm font-bold text-white"
              >
                {createCaseMutation.isPending ? 'Đang lưu...' : 'Lưu Case Study'}
              </button>
            </form>
          )}

          {casesQuery.isLoading && <p className="text-sm text-slate-600">Đang tải danh sách Case Study…</p>}

          {casesQuery.isError && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Chưa tìm thấy bảng <code>case_studies</code> trên Supabase. Bạn hãy copy đoạn SQL ở Bước 1 và bấm Run trong
              Supabase SQL Editor để nạp sẵn 7 Case Study nhé!
            </div>
          )}

          {!casesQuery.isLoading && filteredCases.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Cột trái: Danh sách các thẻ Tag Case Study */}
              <div className="space-y-3 lg:col-span-4">
                {filteredCases.map((c) => {
                  const isSelected = activeCase?.id === c.id
                  const badgeStyle =
                    TAG_BADGE_STYLE[c.department_tag.toUpperCase()] ??
                    'bg-slate-100 text-slate-800 border-slate-300'
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCaseId(c.id)
                        setCaseMsg('')
                        setCaseErr('')
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                            isSelected ? 'border-amber-400 bg-amber-400 text-slate-950' : badgeStyle
                          }`}
                        >
                          {c.tag_code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            isSelected ? 'text-amber-300' : 'text-orange-700'
                          }`}
                        >
                          <Sparkles aria-hidden="true" size="{13}"/>+{c.reward_credits} Credits
                        </span>
                      </div>
                      <h3 className="mt-2.5 text-sm font-bold leading-snug">{c.title}</h3>
                      <p className={`mt-1.5 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        Vai trò: <b>{c.role_title}</b> · Độ khó: {c.difficulty}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Cột phải: Nội dung chi tiết Case Study & Khu vực nộp lời giải */}
              {activeCase && (
                <div className="space-y-6 lg:col-span-8">
                  <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2.5 py-1 text-xs font-black uppercase ${
                            TAG_BADGE_STYLE[activeCase.department_tag.toUpperCase()] ??
                            'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {activeCase.tag_code}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          Phòng ban: {activeCase.department_tag}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          Vai trò: {activeCase.role_title}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">
                        <Award aria-hidden="true" size="{15}"/>
                        Thưởng hoàn thành: +{activeCase.reward_credits} Credits
                      </span>
                    </div>

                    <h2 className="mt-4 text-lg font-bold text-slate-900">{activeCase.title}</h2>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Bối cảnh & Dữ kiện Tình huống (Case Scenario)
                      </h3>
                      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                        {activeCase.scenario}
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/70 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-orange-900">
                        Câu hỏi & Yêu cầu Giải quyết
                      </h3>
                      <div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-900">
                        {activeCase.questions}
                      </div>
                    </div>
                  </article>

                  {/* Form Nộp lời giải của Thành viên / Phòng ban */}
                  <form
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      if (analysis.trim() && solution.trim()) submitSolution.mutate()
                    }}
                    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
                  >
                    <h3 className="text-base font-bold text-slate-900">
                      Nộp Phương Án Giải Case ({activeCase.tag_code})
                    </h3>
                    <label className="block text-sm font-medium text-slate-700">
                      1. Phân tích nguyên nhân cốt lõi (Root Cause & Bottlenecks)
                      <textarea
                        required
                        rows={4}
                        value={analysis}
                        onChange={(e) => setAnalysis(e.target.value)}
                        placeholder="Trình bày các nguyên nhân chính, số liệu phân tích hoặc rủi ro phát hiện được..."
                        className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-2 focus:outline-accent"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      2. Đề xuất giải pháp & Kế hoạch hành động (Action Plan)
                      <textarea
                        required
                        rows={5}
                        value={solution}
                        onChange={(e) => setSolution(e.target.value)}
                        placeholder="Đề xuất phương án xử lý ngắn hạn / dài hạn, KPI đo lường và phối hợp liên phòng ban..."
                        className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-2 focus:outline-accent"
                      />
                    </label>

                    {caseMsg && <p className="text-sm font-semibold text-emerald-700">{caseMsg}</p>}
                    {caseErr && (
                      <p role="alert" className="text-sm font-semibold text-red-700">
                        {caseErr}
                      </p>
                    )}

                    <button
                      disabled={submitSolution.isPending}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
                    >
                      <Send aria-hidden="true" size="{16}"/>
                      {submitSolution.isPending ? 'Đang gửi bài giải…' : 'Nộp / Cập nhật Bài Giải'}
                    </button>
                  </form>

                  {/* Danh sách bài giải các thành viên đã nộp */}
                  <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Bài giải đã nộp ({submissionsQuery.data?.length ?? 0})
                    </h3>
                    {(submissionsQuery.data ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Chưa có thành viên nào nộp lời giải cho Case này. Hãy là người đầu tiên!
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {(submissionsQuery.data ?? []).map((sub) => (
                          <li key={sub.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {sub.profiles?.full_name ?? 'Thành viên'}
                              </span>
                              <div className="flex items-center gap-2">
                                {sub.status === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                                    <CheckCircle2 aria-hidden="true" size="{13}"/>
                                    Đã duyệt thưởng (+{sub.awarded_credits} Credits)
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                                    Đang chờ chấm
                                  </span>
                                )}
                                {isAdmin && sub.status !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => approveSubmission.mutate(sub.id)}
                                    disabled={approveSubmission.isPending}
                                    className="min-h-8 rounded-md bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800"
                                  >
                                    Duyệt & Cộng +{activeCase.reward_credits} Credits
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500">
                              Nộp lúc: {new Date(sub.created_at).toLocaleString('vi-VN')}
                            </div>
                            <div className="mt-2 rounded-lg bg-white p-3 text-sm">
                              <div className="font-semibold text-slate-700">Phân tích nguyên nhân:</div>
                              <p className="mt-1 whitespace-pre-wrap text-slate-800">{sub.analysis}</p>
                              <div className="mt-3 font-semibold text-slate-700">Giải pháp đề xuất:</div>
                              <p className="mt-1 whitespace-pre-wrap text-slate-800">{sub.solution}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= NHÁNH 2: BẢNG DỰ ÁN KANBAN (GIỮ NGUYÊN 100%) ================= */}
      {activeTab === 'projects' && (
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold">Danh sách Dự án</h2>
          {isLoading && <p className="mt-3 text-sm text-slate-600">Đang tải…</p>}
          {!isLoading && projects.length === 0 && <p className="mt-3 text-sm text-slate-600">Chưa có dự án nào.</p>}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent" to="{`/projects/${p.id}`}">
                  <div className="font-semibold">{p.name}</div>
                  {p.description && <div className="mt-1 text-sm text-slate-600">{p.description}</div>}
                </Link>
              </li>
            ))}
          </ul>
          {profile?.role === 'admin' && (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                create.mutate()
              }}
              className="mt-8 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h2 className="font-semibold">Tạo dự án mới</h2>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Tên dự án
                <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Mô tả
                <input value={desc} onChange={(e) => setDesc(e.target.value)} className={input} />
              </label>
              {create.isError && <p role="alert" className="mt-3 text-sm text-red-700">Không tạo được dự án. Thử lại sau.</p>}
              <button
                disabled={create.isPending}
                className="mt-4 min-h-11 rounded-md bg-accent px-4 font-semibold text-white disabled:opacity-60"
              >
                Tạo dự án
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}