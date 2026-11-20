import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Crown,
  FileText,
  Gamepad2,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Shield,
  ShoppingBag,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/AuthProvider'

type Announcement = {
  id: string
  title: string
  body?: string | null
  content?: string | null
  created_at: string
  is_pinned?: boolean
}

type LeaderboardEntry = {
  id: string
  full_name: string
  credits: number
  rank_tier?: string | null
  is_manager_tag?: boolean | null
  departments?: { name: string } | null
}

type CasePreview = {
  id: string
  tag_code: string
  department_tag: string
  title: string
  reward_credits: number
}

const RANK_META: Record<string, { label: string; badge: string }> = {
  bronze: { label: 'Đồng', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
  silver: { label: 'Bạc', badge: 'bg-slate-200 text-slate-900 border-slate-400' },
  gold: { label: 'Vàng', badge: 'bg-yellow-100 text-yellow-900 border-yellow-400' },
  emerald: { label: 'Lục Bảo', badge: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
  diamond: { label: 'Kim Cương', badge: 'bg-cyan-100 text-cyan-900 border-cyan-400' },
  master: { label: 'Cao Thủ', badge: 'bg-purple-100 text-purple-900 border-purple-400' },
  challenger: { label: 'Thách Đấu', badge: 'bg-amber-200 text-slate-950 border-amber-500' },
}

async function fetchDashboardOverview(userId?: string) {
  const [progressRes, tasksRes, announcementsRes, topUsersRes, casesRes] = await Promise.all([
    supabase.rpc('factory_progress'),
    userId
      ? supabase.from('tasks').select('id, status').eq('assignee_id', userId)
      : Promise.resolve({ data: [] }),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
    supabase
      .from('profiles')
      .select('id, full_name, credits, rank_tier, is_manager_tag, departments(name)')
      .eq('is_active', true)
      .order('credits', { ascending: false })
      .limit(5),
    supabase.from('case_studies').select('id, tag_code, department_tag, title, reward_credits').limit(4),
  ])

  const progress =
    !progressRes.error && progressRes.data !== null ? Number(progressRes.data) : 0

  const myTasks = (tasksRes.data ?? []) as { id: string; status: string }[]
  const pendingTasks = myTasks.filter((t) => t.status !== 'done').length
  const doneTasks = myTasks.filter((t) => t.status === 'done').length

  return {
    progress,
    pendingTasks,
    doneTasks,
    totalMyTasks: myTasks.length,
    announcements: (announcementsRes.data ?? []) as Announcement[],
    topUsers: (topUsersRes.data ?? []) as unknown as LeaderboardEntry[],
    cases: (casesRes.data ?? []) as CasePreview[],
  }
}

export function Home() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const extProfile = profile as
    | (typeof profile & { rank_tier?: string | null; is_manager_tag?: boolean | null })
    | null
  const myRank = extProfile?.rank_tier ? RANK_META[extProfile.rank_tier] : null
  const isManager = Boolean(extProfile?.is_manager_tag)

  const { data, isLoading } = useQuery({
    queryKey: ['home-dashboard', profile?.id],
    queryFn: () => fetchDashboardOverview(profile?.id),
    enabled: Boolean(profile?.id),
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 1. HERO BANNER: ĐỊNH DANH NHÂN SỰ & ĐIỀU HƯỚNG NHANH */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-0.5 text-xs font-semibold text-teal-300 ring-1 ring-teal-400/30">
                <span className="size-1.5 rounded-full bg-teal-400" />
                Aurora Precision Operations Portal
              </span>
              {isManager && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  <Crown size={12} aria-hidden="true" />
                  MANAGER
                </span>
              )}
              {myRank && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/40">
                  <Shield size={12} aria-hidden="true" />
                  Super Star · {myRank.label}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Xin chào, {profile?.full_name || (isAdmin ? 'Quản trị viên' : 'Cán bộ nhân viên')}
            </h1>

            <p className="text-sm text-slate-300">
              Mã nhân viên:{' '}
              <span className="font-mono font-semibold text-white">
                {profile?.employee_code || 'ADMIN-0001'}
              </span>{' '}
              • Phòng ban:{' '}
              <span className="font-semibold text-white">
                {profile?.departments?.name || (isAdmin ? 'Ban Quản Trị Hệ Thống' : 'Chưa phân phòng')}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/board"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-teal-400"
            >
              <ClipboardList size={17} aria-hidden="true" />
              Bảng Công Việc & Dự Án
            </Link>
            <Link
              to="/games"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
            >
              <Gamepad2 size={17} aria-hidden="true" />
              Giả lập Nghiệp vụ
            </Link>
            <Link
              to="/shop"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400/15 px-4 text-sm font-semibold text-amber-300 ring-1 ring-amber-400/30 transition hover:bg-amber-400/25"
            >
              <ShoppingBag size={17} aria-hidden="true" />
              Đổi Đặc Quyền
            </Link>
          </div>
        </div>
      </section>

      {/* 2. BỐN THẺ CHỈ SỐ HOẠT ĐỘNG (LIVE KPI CARDS) */}
      <section aria-label="Chỉ số hoạt động" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Tiến độ Nhà máy</span>
            <CheckCircle2 size={16} className="text-teal-600" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{data?.progress ?? 0}%</span>
            <span className="text-xs text-slate-500">mục tiêu vận hành</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-all"
              style={{ width: `${Math.min(100, data?.progress ?? 0)}%` }}
            />
          </div>
        </div>

        <Link
          to="/board"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-400"
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Công việc của tôi</span>
            <ClipboardList size={16} className="text-blue-600" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {isLoading ? '—' : data?.pendingTasks ?? 0}
            </span>
            <span className="text-xs text-slate-500">
              việc cần làm ({data?.doneTasks ?? 0} đã xong)
            </span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:underline">
            Mở bảng Kanban <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          to="/projects"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-400"
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Case Study Phòng ban</span>
            <BookOpen size={16} className="text-purple-600" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {isLoading ? '—' : data?.cases.length ?? 0}
            </span>
            <span className="text-xs text-slate-500">tình huống đang mở</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 group-hover:underline">
            Giải Case nhận thưởng <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          to="/shop"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-amber-400"
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Quỹ Aurora Credits</span>
            <Sparkles size={16} className="text-amber-500" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{profile?.credits ?? 0}</span>
            <span className="text-xs font-medium text-slate-500">Credits khả dụng</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 group-hover:underline">
            Nâng bậc Rank & Đặc quyền <ArrowRight size={13} />
          </div>
        </Link>
      </section>

      {/* 3. KHU VỰC CHÍNH: BẢNG TIN BTC + ONBOARDING (TRÁI) & BẢNG XẾP HẠNG + CASE STUDY (PHẢI) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CỘT TRÁI (7 CỘT): BẢNG TIN BAN TỔ CHỨC & LỘ TRÌNH VẬN HÀNH */}
        <div className="space-y-6 lg:col-span-7">
          {/* Bảng tin từ Ban Tổ Chức */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-orange-600" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-900">Thông báo & Chỉ đạo Điều hành</h2>
              </div>
              <Link to="/notifications" className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline">
                Xem tất cả
              </Link>
            </div>

            {data?.announcements && data.announcements.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {data.announcements.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {new Date(item.created_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {(item.body || item.content) && (
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                        {item.body || item.content}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
                Hệ thống đang vận hành ổn định. Các thông báo khẩn cấp và tín hiệu chuyển chặng từ Ban Điều Phối sẽ hiển thị trực tiếp tại đây.
              </div>
            )}
          </section>

          {/* Lộ trình 4 bước tác nghiệp chuẩn */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Quy trình Tác nghiệp Chuẩn (4 Bước)</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Lộ trình phối hợp liên phòng ban và tích lũy điểm thưởng trên Aurora OS
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Sẵn sàng
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Link
                to="/documents"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-900 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-teal-700">Bước 01</span>
                  <FileText size={16} className="text-slate-400" />
                </div>
                <h3 className="mt-1.5 text-sm font-bold text-slate-900">Tra cứu Dữ liệu Phòng ban</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Đọc tài liệu nội bộ, báo cáo thông số và quy trình chuẩn của 6 phòng ban.
                </p>
              </Link>

              <Link
                to="/projects"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-900 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-teal-700">Bước 02</span>
                  <BookOpen size={16} className="text-slate-400" />
                </div>
                <h3 className="mt-1.5 text-sm font-bold text-slate-900">Giải Case Study & Kanban</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Phân tích tình huống thực tế của phòng ban và nộp phương án xử lý nhận thưởng.
                </p>
              </Link>

              <Link
                to="/games"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-900 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-teal-700">Bước 03</span>
                  <Gamepad2 size={16} className="text-slate-400" />
                </div>
                <h3 className="mt-1.5 text-sm font-bold text-slate-900">Giả lập Ca làm việc (60s)</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Thử thách phản xạ nghiệp vụ đúng chuyên môn để tăng tiến độ nhà máy & Credits.
                </p>
              </Link>

              <Link
                to="/chat"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-900 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-teal-700">Bước 04</span>
                  <MessageSquare size={16} className="text-slate-400" />
                </div>
                <h3 className="mt-1.5 text-sm font-bold text-slate-900">Thương lượng & Copilot</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Trao đổi trực tiếp qua kênh Chat liên phòng hoặc hỏi trợ lý Aurora Copilot.
                </p>
              </Link>
            </div>
          </section>
        </div>

        {/* CỘT PHẢI (5 CỘT): BẢNG XẾP HẠNG VINH DANH & CASE STUDY NỔI BẬT */}
        <div className="space-y-6 lg:col-span-5">
          {/* Top 5 Bảng xếp hạng Credits */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-900">Bảng Vinh Danh Dẫn Đầu</h2>
              </div>
              <Link to="/leaderboard" className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline">
                Chi tiết
              </Link>
            </div>

            {data?.topUsers && data.topUsers.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {data.topUsers.map((u, idx) => {
                  const r = u.rank_tier ? RANK_META[u.rank_tier] : null
                  return (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5"
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
                            {u.is_manager_tag ? `Manager - ${u.full_name}` : u.full_name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            <span>{u.departments?.name ?? 'Thành viên'}</span>
                            {r && (
                              <span className={`rounded border px-1.5 py-0.2 font-semibold ${r.badge}`}>
                                {r.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
                        {u.credits ?? 0} Cr
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-slate-500">Đang cập nhật dữ liệu xếp hạng…</p>
            )}
          </section>

          {/* Truy cập nhanh Hỗ trợ & Trợ lý AI */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white">
                <HelpCircle size={20} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-900">Cần hỗ trợ kỹ thuật hoặc giải đáp?</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Sử dụng trợ lý <b>Aurora Copilot</b> hoặc gửi phiếu hỗ trợ trực tiếp tới Ban Điều Phối.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/incidents"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Award size={14} />
                    Mở Trung tâm Hỗ trợ
                  </Link>
                  <Link
                    to="/chat"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Vào Kênh Chat
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// Trang giữ chỗ cho các tính năng sẽ làm ở giai đoạn sau
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">
          Phân hệ này đang được đồng bộ giao diện với cơ sở dữ liệu và sẽ mở khóa trong bản cập nhật kế tiếp.
        </p>
        <Link
          to="/"
          className="mt-2 inline-block rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
        >
          ← Quay về Tổng quan
        </Link>
      </div>
    </div>
  )
}

// Trang lỗi 404 (Bắt mọi đường dẫn không tồn tại)
export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-5xl font-black text-slate-900">404</div>
        <h1 className="text-lg font-bold text-slate-800">Không tìm thấy trang yêu cầu</h1>
        <p className="text-sm text-slate-500">
          Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được di chuyển trong hệ thống Aurora OS.
        </p>
        <Link
          to="/"
          className="inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Quay về Trang Tổng quan
        </Link>
      </div>
    </div>
  )
}
