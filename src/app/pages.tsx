import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  ShieldAlert,
  Target,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'

type StationId = 'ST-01' | 'ST-02' | 'ST-03' | 'ST-04'

const STATIONS: {
  id: StationId
  code: string
  name: string
  stops: string
  note: string
  tone: 'neutral' | 'warning' | 'danger'
  rawLogs: string[]
}[] = [
  {
    id: 'ST-01',
    code: 'TRẠM ST-01 · FEEDING',
    name: 'Cấp Phôi & Định Hình',
    stops: 'Log dừng: 24 lần · 740 phút',
    note: 'Bấm xem log chi tiết →',
    tone: 'neutral',
    rawLogs: [
      'Ghi nhận 18 lần dừng vặt (< 5 phút) do lệch băng dẫn phôi đầu vào ở đầu ca sáng và ca đêm.',
      'Thời gian chờ cấp cuộn vật liệu mới trung bình 14 phút/lần khi chuyển mã sản phẩm.',
      'Chưa ghi nhận sự cố mất an toàn lao động trực tiếp tại cụm cấp phôi.',
    ],
  },
  {
    id: 'ST-02',
    code: 'TRẠM ST-02 · FORMING',
    name: 'Gia Công Chính Xác',
    stops: 'Log dừng: 46 lần · 1.680 phút',
    note: 'Bấm xem log chi tiết →',
    tone: 'warning',
    rawLogs: [
      'Chiếm tỷ trọng thời gian dừng máy cao nhất trên Line 3 (1.680 / 4.060 phút dừng máy).',
      'Gồm 18 lần chuyển đổi khuôn (Changeover) tiêu tốn 1.420 phút và 28 lần kẹt cơ khí/quá nhiệt.',
      'Tổn thất tốc độ (Speed loss) ghi nhận nhiều nhất khi chạy vật liệu lô mới.',
    ],
  },
  {
    id: 'ST-03',
    code: 'TRẠM ST-03 · INSPECTION',
    name: 'Kiểm Tra & Cảm Biến',
    stops: 'Log dừng: 31 lần · 1.090 phút',
    note: '56 mẫu bị từ chối · 6 Near-Miss',
    tone: 'danger',
    rawLogs: [
      'Phát hiện 56 mẫu sản phẩm không đạt dung sai kích thước và độ kín khớp nối trong 26 ca khảo sát.',
      'Ghi nhận 6 vụ suýt tai nạn (Near-Miss) khi vận hành viên thao tác gạt phôi lỗi gần cụm cảm biến.',
      'Cảm biến quang học báo dừng giả 22 lần khi bụi mịn tích tụ cuối ca.',
    ],
  },
  {
    id: 'ST-04',
    code: 'TRẠM ST-04 · PACKING',
    name: 'Đóng Gói & Xuất Xưởng',
    stops: 'Log dừng: 17 lần · 550 phút',
    note: 'Bấm xem log chi tiết →',
    tone: 'neutral',
    rawLogs: [
      '17 lần dừng chủ yếu do chờ bán thành phẩm từ các trạm phía trước (Starvation) và thay cuộn tem nhãn.',
      'Tốc độ đóng gói thực tế đạt 92% công suất thiết kế khi nguồn phôi đầu vào ổn định.',
    ],
  },
]

const DEPARTMENTS_CARDS = [
  {
    key: 'production',
    title: '1. Phòng Sản Xuất (Production)',
    desc: 'Nhật ký 118 lần dừng máy & tổn thất tốc độ 2.396 phút',
    cta: 'Hồ sơ Sản xuất →',
  },
  {
    key: 'qc',
    title: '2. Phòng Chất Lượng (QA/QC)',
    desc: 'Phân bổ 56 mẫu lỗi & nhật ký hiệu chuẩn thiết bị đo',
    cta: 'Hồ sơ QA/QC →',
  },
  {
    key: 'ehs',
    title: '3. Phòng An Toàn & Môi Trường (EHS)',
    desc: 'Chi tiết 6 vụ Near-Miss Line 3 & tải lượng xử lý môi trường',
    cta: 'Hồ sơ EHS →',
  },
  {
    key: 'hr',
    title: '4. Phòng Nhân Sự (HR)',
    desc: 'Định biên ca kíp, tỷ lệ nghỉ việc & tay nghề vận hành',
    cta: 'Hồ sơ HR →',
  },
  {
    key: 'finance',
    title: '5. Phòng Tài Chính (Finance)',
    desc: 'Cấu trúc chi phí vận hành, ngân sách CAPEX & biên lợi nhuận',
    cta: 'Hồ sơ Tài chính →',
  },
  {
    key: 'rnd',
    title: '6. Phòng Nghiên Cứu (R&D)',
    desc: 'Thông số vật liệu, thiết kế khuôn & giới hạn kỹ thuật Line 3',
    cta: 'Hồ sơ R&D →',
  },
]

export function Home() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [selectedStation, setSelectedStation] = useState<StationId | null>(null)

  const activeStation = STATIONS.find((s) => s.id === selectedStation) ?? null

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      {/* 1. HERO BANNER TỐI MÀU (OKWAY PRECISION) */}
      <section className="flex flex-col justify-between gap-5 rounded-2xl bg-slate-900 p-6 text-white shadow-sm sm:p-7 lg:flex-row lg:items-center">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-full bg-teal-950 px-3.5 py-1 text-[11px] font-extrabold tracking-wider text-teal-300 ring-1 ring-teal-500/30">
              OKWAY PRECISION
            </span>
            {profile?.full_name && (
              <span className="text-xs text-slate-400">
                Xin chào, <b className="text-slate-200">{profile.full_name}</b>
                {profile.departments?.name ? ` · Phòng ${profile.departments.name}` : ''}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[26px]">
            Mở Rộng Dây Chuyền 3 (Line 3 Expansion)
          </h1>
          <p className="text-sm text-slate-300">
            Mục tiêu: <b className="text-white">~10.000 → 40.000 sp/tháng</b> · OEE hiện tại{' '}
            <b className="text-amber-300">~48%</b> (12.480 phút / 26 ca)
          </p>
        </div>

        <Link
          to="/projects"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 text-sm font-extrabold text-slate-950 shadow-xs transition hover:bg-teal-400"
        >
          Phân tích chi tiết <ArrowRight size={16} />
        </Link>
      </section>

      {/* 2. 4 THẺ KPI NỀN TẢNG */}
      <section aria-label="Chỉ số nền tảng Line 3" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            <span>SẢN LƯỢNG & MỤC TIÊU</span>
            <Target size={15} className="text-teal-600" />
          </div>
          <div className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">~10.000 sp</div>
          <div className="mt-2 text-xs font-bold text-teal-600">Mục tiêu mở rộng: 40.000 sp/tháng</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            <span>HIỆU SUẤT OEE HIỆN TẠI</span>
            <Activity size={15} className="text-amber-500" />
          </div>
          <div className="mt-2.5 text-3xl font-extrabold tracking-tight text-amber-600">~48.0%</div>
          <div className="mt-2 text-xs font-medium text-slate-500">Trên tổng 12.480 phút (26 ca)</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            <span>TỔN THẤT DỪNG & TỐC ĐỘ</span>
            <Clock size={15} className="text-rose-600" />
          </div>
          <div className="mt-2.5 text-3xl font-extrabold tracking-tight text-rose-600">6.456 phút</div>
          <div className="mt-2 text-xs font-medium text-slate-500">118 lần dừng (4.060p) + chậm (2.396p)</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            <span>CHẤT LƯỢNG & AN TOÀN</span>
            <ShieldAlert size={15} className="text-rose-600" />
          </div>
          <div className="mt-2.5 text-3xl font-extrabold tracking-tight text-rose-600">56 mẫu lỗi</div>
          <div className="mt-2 text-xs font-bold text-rose-600">Ghi nhận 6 vụ Near-Miss Line 3</div>
        </div>
      </section>

      {/* 3. THANH LỘ TRÌNH ĐIỀU PHỐI WAR-GAME (150 PHÚT) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Lộ Trình Điều Phối War-Game (150 Phút)</h2>
          <span className="text-xs font-medium text-slate-500">4 giai đoạn phân tích & phản biện</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
          <div className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white lg:col-span-3">
            0–20p: Đọc Dữ Liệu Tổng Quan
          </div>
          <div className="rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-bold text-white lg:col-span-3">
            20–75p: Thảo luận
          </div>
          <div className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 lg:col-span-4">
            75–120p: Lập Phương Án Tối Ưu
          </div>
          <div className="rounded-lg bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 lg:col-span-2">
            120–150p: Phản Biện Hội Đồng
          </div>
        </div>
      </section>

      {/* 4. SƠ ĐỒ 4 TRẠM LINE 3 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Sơ Đồ 4 Trạm Line 3</h2>
          </div>
          <span className="text-xs text-slate-500">Bấm vào từng trạm để xem nhật ký sự cố thô</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STATIONS.map((st) => {
            const isSelected = selectedStation === st.id
            const cardStyle =
              st.tone === 'warning'
                ? 'border-amber-400 bg-amber-50/60 hover:border-amber-500'
                : st.tone === 'danger'
                ? 'border-rose-400 bg-rose-50/60 hover:border-rose-500'
                : 'border-slate-200 bg-slate-50/70 hover:border-slate-400'

            const codeColor =
              st.tone === 'warning'
                ? 'text-amber-700'
                : st.tone === 'danger'
                ? 'text-rose-600'
                : 'text-teal-700'

            const metricColor =
              st.tone === 'warning'
                ? 'text-amber-800 font-bold'
                : st.tone === 'danger'
                ? 'text-rose-600 font-bold'
                : 'text-slate-600'

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStation(isSelected ? null : st.id)}
                className={`flex flex-col justify-between rounded-xl border-2 p-4 text-left transition ${cardStyle} ${
                  isSelected ? 'ring-2 ring-slate-900' : ''
                }`}
              >
                <div>
                  <div className={`text-[11px] font-extrabold uppercase tracking-wide ${codeColor}`}>
                    {st.code}
                  </div>
                  <div className="mt-1.5 text-base font-bold text-slate-900">{st.name}</div>
                  <div className={`mt-2.5 text-xs ${metricColor}`}>{st.stops}</div>
                </div>
                <div className={`mt-3 text-xs font-semibold ${codeColor}`}>
                  {isSelected ? 'Đang mở nhật ký bên dưới ↑' : st.note}
                </div>
              </button>
            )
          })}
        </div>

        {/* Ngăn kéo hiển thị Nhật ký thô khi bấm vào trạm */}
        {activeStation && (
          <div className="rounded-xl border border-slate-300 bg-slate-900 p-4 text-white space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-teal-300">
                <AlertTriangle size={14} />
                Nhật ký hiện trường thô — {activeStation.code} ({activeStation.name})
              </div>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="rounded-lg bg-teal-500 px-3 py-1 text-xs font-extrabold text-slate-950 hover:bg-teal-400"
              >
                Đưa sang Bàn Phân Tích →
              </button>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-200">
              {activeStation.rawLogs.map((log, idx) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 5. HỒ SƠ DỮ LIỆU 6 PHÒNG BAN */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">Hồ Sơ Dữ Liệu 6 Phòng Ban</h2>
          <span className="text-xs text-slate-500">Bấm để mở hồ sơ chi tiết trong Trung tâm Dự án</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS_CARDS.map((dept) => (
            <Link
              key={dept.key}
              to={`/projects?dept=${dept.key}`}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-teal-600 hover:shadow-sm"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700">
                  {dept.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{dept.desc}</p>
              </div>
              <div className="mt-4 text-xs font-extrabold text-teal-600 group-hover:translate-x-0.5 transition-transform">
                {dept.cta}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

// Trang giữ chỗ cho các tính năng mở rộng
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