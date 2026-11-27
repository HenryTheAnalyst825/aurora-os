import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  CheckSquare,
  FileSearch,
  HelpCircle,
  Plus,
  Trash2,
} from 'lucide-react'

type DeptKey = 'production' | 'qc' | 'ehs' | 'hr' | 'finance' | 'rnd'

const DEPT_DOSSIERS: Record<
  DeptKey,
  {
    label: string
    title: string
    facts: string[]
    hypotheses: string[]
    crossChecks: string[]
  }
> = {
  production: {
    label: 'Sản xuất',
    title: '1. Hồ Sơ Phòng Sản Xuất (Production)',
    facts: [
      'Tổng thời gian khả dụng khảo sát: 12.480 phút (26 ca × 480 phút), OEE trung bình ~48%.',
      'Tổn thất dừng máy: 118 lần với tổng thời gian 4.060 phút; tổn thất tốc độ: 2.396 phút.',
      'Chuyển đổi mã hàng (Changeover) chiếm 1.420 phút trong 18 lần đổi khuôn trên Trạm ST-02.',
      'Dừng vặt (Micro-stops < 5 phút) xảy ra 64 lần tại cụm cấp phôi ST-01 và cảm biến ST-03.',
    ],
    hypotheses: [
      'Tổ trưởng cho rằng thiếu sản lượng là do thiếu công nhân đứng máy ca đêm.',
      'Bộ phận bảo trì nghi ngờ nguyên liệu lô mới gây kẹt khuôn, chưa đối chiếu với R&D.',
      'Vận hành viên cho rằng tốc độ băng tải bị giới hạn do cảm biến đầu ra báo lỗi giả.',
    ],
    crossChecks: [
      'Hỏi QA/QC: 56 mẫu bị từ chối tập trung vào khung giờ nào và có trùng với lần đổi khuôn không?',
      'Hỏi EHS: 6 vụ Near-Miss xảy ra khi xử lý kẹt phôi hay lúc vệ sinh máy cuối ca?',
      'Hỏi R&D: Thông số vật liệu mới có nằm ngoài dung sai thiết kế của Trạm ST-02?',
    ],
  },
  qc: {
    label: 'QA/QC',
    title: '2. Hồ Sơ Phòng Chất Lượng (QA/QC)',
    facts: [
      'Ghi nhận tổng cộng 56 mẫu sản phẩm không đạt chuẩn (Rejected Samples) tại Trạm ST-03.',
      'Lỗi tập trung ở sai lệch kích thước khớp nối (34 mẫu) và độ kín vi mô (22 mẫu).',
      'Tần suất lấy mẫu kiểm tra hiện tại là 30 phút/lần trên dây chuyền.',
      'Thiết bị đo độ bền kéo tại phòng Lab chưa có tem hiệu chuẩn mới trong 40 ngày gần nhất.',
    ],
    hypotheses: [
      'Ca đêm có tỷ lệ lỗi cao hơn ca ngày do thiếu nhân sự QC giám sát trực tiếp.',
      'Ngưỡng cảnh báo cảm biến quang học tại ST-03 có thể đã bị chỉnh nới lỏng để tránh dừng chuyền.',
    ],
    crossChecks: [
      'Hỏi Sản xuất: Nhật ký thay đổi thông số máy tại Trạm ST-02 và ST-03 trong 26 ca qua.',
      'Hỏi Tài chính: Chi phí tái chế và mức phạt hợp đồng nếu lô hàng lỗi vượt ngưỡng 1,5%.',
    ],
  },
  ehs: {
    label: 'EHS',
    title: '3. Hồ Sơ Phòng An Toàn & Môi Trường (EHS)',
    facts: [
      'Ghi nhận 6 vụ suýt tai nạn (Near-Miss) dọc theo Line 3 trong kỳ khảo sát.',
      '4/6 vụ xảy ra khi công nhân đưa tay gạt phôi kẹt tại Trạm ST-02/ST-03 mà chưa dừng hẳn băng tải.',
      'Hệ thống xử lý nước thải và nhiệt dư hiện vận hành ở mức 92% công suất thiết kế.',
      'Mức độ ồn tại cụm gia công ST-02 đo được 86 dBA vào khung giờ chạy tốc độ cao.',
    ],
    hypotheses: [
      'Găng tay bảo hộ cấp phát hiện tại quá rộng so với cỡ tay công nhân nữ gây vướng thao tác.',
      'Nếu nâng sản lượng lên 40.000 sp/tháng mà không cải tạo hạ tầng, hệ thống xử lý sẽ quá tải.',
    ],
    crossChecks: [
      'Hỏi HR: Tỷ lệ nhân sự mới đứng máy Line 3 chưa hoàn thành đào tạo thực hành an toàn.',
      'Hỏi Tài chính: Hạn mức ngân sách CAPEX có thể phân bổ cho hạng mục an toàn & môi trường.',
    ],
  },
  hr: {
    label: 'HR',
    title: '4. Hồ Sơ Phòng Nhân Sự (HR)',
    facts: [
      'Định biên hiện tại: 18 vận hành viên/ca, tỷ lệ nghỉ việc bình quân 22%/năm ở nhóm dưới 6 tháng.',
      'Chỉ 35% vận hành viên Line 3 có chứng chỉ tự thực hiện chuyển đổi khuôn (Changeover).',
      'Số giờ tăng ca (OT) bình quân tăng 28% trong 2 tháng gần đây.',
    ],
    hypotheses: [
      'Thiếu nhân sự đa kỹ năng (Multi-skilled) khiến mỗi lần đổi khuôn phải chờ 1 kỹ thuật viên chính.',
      'Tăng ca kéo dài làm suy giảm độ tập trung ở nửa cuối ca đêm.',
    ],
    crossChecks: [
      'Hỏi Sản xuất: Thời gian thực tế một thao tác đổi khuôn chuẩn là bao nhiêu phút nếu đủ 2 người?',
      'Hỏi Tài chính: So sánh chi phí đào tạo chéo kỹ năng so với chi phí trả lương OT hàng tháng.',
    ],
  },
  finance: {
    label: 'Tài chính',
    title: '5. Hồ Sơ Phòng Tài Chính (Finance)',
    facts: [
      'Sản lượng hiện tại ~10.000 sp/tháng; mục tiêu mở rộng 40.000 sp/tháng để đáp ứng hợp đồng mới.',
      'Chi phí dừng máy ngoài kế hoạch ước tính làm tăng giá thành đơn vị thêm 14%.',
      'Ngân sách đầu tư cải tiến (CAPEX) được phê duyệt tối đa trong 90 ngày là $150.000.',
    ],
    hypotheses: [
      'Mua thêm 1 dây chuyền mới hoàn toàn sẽ vượt trần ngân sách $150.000 và không kịp tiến độ 90 ngày.',
      'Tối ưu OEE Line 3 từ 48% lên >80% kết hợp cải tiến nút thắt có thể giải quyết phần lớn sản lượng.',
    ],
    crossChecks: [
      'Hỏi Sản xuất & R&D: Phương án nâng cấp cụm ST-02 cần đầu tư bao nhiêu thiết bị mới?',
      'Hỏi QA/QC: Thiệt hại tài chính trực tiếp từ 56 mẫu lỗi và chi phí sàng lọc lại.',
    ],
  },
  rnd: {
    label: 'R&D',
    title: '6. Hồ Sơ Phòng Nghiên Cứu (R&D)',
    facts: [
      'Thiết kế khuôn hiện tại trên Trạm ST-02 yêu cầu siết 16 bu-lông thủ công mỗi lần đổi mã hàng.',
      'Lô vật liệu polymer mới có độ co ngót nhiệt chênh lệch 0,15% so với lô chuẩn trước đây.',
      'Thông số nhiệt độ gia công chưa được cập nhật lại trên bảng hướng dẫn vận hành (SOP).',
    ],
    hypotheses: [
      'Áp dụng cơ cấu kẹp nhanh (Quick-Change) có thể rút ngắn thời gian đổi khuôn xuống dưới 20 phút.',
      'Hiệu chỉnh lại dải nhiệt độ khuôn sẽ triệt tiêu phần lớn lỗi biến dạng khớp nối.',
    ],
    crossChecks: [
      'Hỏi QA/QC: 34 mẫu lỗi kích thước có rơi vào đúng các lô dùng vật liệu polymer mới không?',
      'Hỏi Sản xuất: Khả năng chạy thử nghiệm (Pilot Run) 500 mẫu trên Line 3 vào ca cuối tuần.',
    ],
  },
}

const PARETO_ITEMS = [
  { label: '1. Chuyển đổi mã hàng (Changeover)', minutes: 1420, count: 18, color: 'bg-teal-500' },
  { label: '2. Hỏng hóc cơ khí & kẹt Trạm ST-02', minutes: 1180, count: 28, color: 'bg-sky-500' },
  { label: '3. Dừng vặt cảm biến & cấp phôi', minutes: 840, count: 55, color: 'bg-amber-500' },
  { label: '4. Chờ vật tư & hiệu chuẩn QC', minutes: 620, count: 17, color: 'bg-slate-400' },
]

type EvidenceNote = {
  id: string
  kind: 'fact' | 'hypothesis'
  text: string
}

export function Line3ProjectPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paramDept = searchParams.get('dept') as DeptKey | null
  const [activeDept, setActiveDept] = useState<DeptKey>(
    paramDept && DEPT_DOSSIERS[paramDept] ? paramDept : 'production'
  )
  const [paretoMode, setParetoMode] = useState<'minutes' | 'count'>('minutes')
  const [notes, setNotes] = useState<EvidenceNote[]>([
    {
      id: 'n1',
      kind: 'fact',
      text: 'Changeover (1.420p) + Kẹt cơ khí ST-02 (1.180p) chiếm 64% tổng thời gian dừng máy (2.600 / 4.060 phút).',
    },
    {
      id: 'n2',
      kind: 'hypothesis',
      text: '56 mẫu lỗi tại ST-03 có thể liên quan trực tiếp đến thông số vật liệu mới sau các lần đổi khuôn ST-02.',
    },
  ])
  const [noteKind, setNoteKind] = useState<'fact' | 'hypothesis'>('fact')
  const [noteInput, setNoteInput] = useState('')

  useEffect(() => {
    if (paramDept && DEPT_DOSSIERS[paramDept]) {
      setActiveDept(paramDept)
    }
  }, [paramDept])

  const dossier = DEPT_DOSSIERS[activeDept]
  const totalVal = paretoMode === 'minutes' ? 4060 : 118
  const sortedPareto = [...PARETO_ITEMS].sort((a, b) =>
    paretoMode === 'minutes' ? b.minutes - a.minutes : b.count - a.count
  )

  function selectDept(k: DeptKey) {
    setActiveDept(k)
    setSearchParams({ dept: k })
  }

  function addNote(e: FormEvent) {
    e.preventDefault()
    if (!noteInput.trim()) return
    setNotes((prev) => [{ id: String(Date.now()), kind: noteKind, text: noteInput.trim() }, ...prev])
    setNoteInput('')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* Header điều hướng */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-5 text-white">
        <div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 hover:underline">
            <ArrowLeft size={14} /> Quay về Trang Tổng Quan
          </Link>
          <h1 className="mt-1.5 text-xl font-bold">
            Bàn Phân Tích Dự Án & Đối Chiếu Chứng Cứ — Line 3 Expansion
          </h1>
        </div>
        <Link
          to="/board"
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
        >
          Mở Bảng Công Việc & Lịch →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* CỘT TRÁI (7 CỘT): HỒ SƠ ĐIỀU TRA 6 PHÒNG BAN */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Hồ Sơ Điều Tra Phòng Ban</h2>
            <span className="text-xs font-semibold text-slate-400">Dữ liệu gốc chưa qua xử lý</span>
          </div>

          {/* 6 Tabs Phòng ban */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DEPT_DOSSIERS) as DeptKey[]).map((key) => {
              const active = activeDept === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDept(key)}
                  className={`min-h-9 rounded-lg px-3.5 text-xs font-bold transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {DEPT_DOSSIERS[key].label}
                </button>
              )
            })}
          </div>

          <h3 className="pt-1 text-base font-bold text-slate-900">{dossier.title}</h3>

          {/* 1. Dữ liệu đã ghi nhận */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-teal-900">
              <FileSearch size={14} /> 1. Dữ Liệu Đã Ghi Nhận (Verified Facts)
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-800">
              {dossier.facts.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* 2. Giả thuyết chưa kiểm chứng */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-amber-900">
              <HelpCircle size={14} /> 2. Giả Thuyết Chưa Kiểm Chứng (Unverified Hypotheses)
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-800">
              {dossier.hypotheses.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* 3. Câu hỏi cần đối chiếu chéo */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-slate-800">
              <CheckSquare size={14} /> 3. Điểm Cần Đối Chiếu Chéo Với Phòng Ban Khác
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
              {dossier.crossChecks.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 font-mono font-bold text-teal-700">[?]</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): PARETO ANALYZER & BẢNG BẰNG CHỨNG NHÓM */}
        <div className="space-y-6 lg:col-span-5">
          {/* Interactive Pareto Analyzer */}
          <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-teal-300">
              <BarChart3 size={15} /> Interactive Pareto Analyzer (80/20)
            </div>
            <h2 className="text-lg font-bold">Phân Tích Tổn Thất: Tổng Phút vs. Tần Suất</h2>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setParetoMode('minutes')}
                className={`min-h-9 rounded-lg px-3 text-xs font-bold transition ${
                  paretoMode === 'minutes'
                    ? 'bg-teal-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Theo Tổng Phút (4.060p)
              </button>
              <button
                type="button"
                onClick={() => setParetoMode('count')}
                className={`min-h-9 rounded-lg px-3 text-xs font-bold transition ${
                  paretoMode === 'count'
                    ? 'bg-teal-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Theo Tần Suất (118 lần)
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {sortedPareto.map((item) => {
                const val = paretoMode === 'minutes' ? item.minutes : item.count
                const pct = Math.round((val / totalVal) * 100)
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200">{item.label}</span>
                      <span className="font-bold text-white">
                        {paretoMode === 'minutes' ? `${val}p` : `${val} lần`} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-800">
                      <div
                        className={`h-2.5 rounded-full transition-all ${item.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="rounded-lg bg-slate-800/80 p-3 text-[11px] leading-relaxed text-amber-300">
              Gợi ý phân tích: Hãy so sánh nhóm chiếm nhiều <b>Tổng Phút</b> nhất (Changeover & kẹt ST-02) với nhóm xảy ra nhiều <b>Tần Suất</b> nhất (Dừng vặt 55 lần).
            </p>
          </div>

          {/* Bảng Ghi Chép Bằng Chứng Nhóm */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Bảng Ghi Chép Bằng Chứng Nhóm</h2>
              <p className="text-xs text-slate-500">
                Phân loại phát hiện của nhóm thành <b>Sự thật (Fact)</b> hoặc <b>Giả thuyết (Hypothesis)</b>
              </p>
            </div>

            <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between gap-2 rounded-xl border p-3 text-xs ${
                    n.kind === 'fact'
                      ? 'border-teal-200 bg-teal-50/70 text-teal-950'
                      : 'border-amber-200 bg-amber-50/70 text-amber-950'
                  }`}
                >
                  <div>
                    <div className="font-extrabold uppercase text-[10px]">
                      {n.kind === 'fact' ? 'FACT · ĐÃ XÁC MINH' : 'HYPOTHESIS · CẦN KIỂM CHỨNG'}
                    </div>
                    <p className="mt-1 leading-relaxed">{n.text}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Xóa ghi chú"
                    onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={addNote} className="space-y-2.5 border-t border-slate-100 pt-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNoteKind('fact')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                    noteKind === 'fact' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  + Thẻ Fact
                </button>
                <button
                  type="button"
                  onClick={() => setNoteKind('hypothesis')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                    noteKind === 'hypothesis' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  + Thẻ Hypothesis
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Ghi chú bằng chứng hoặc câu hỏi đối chiếu..."
                  className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-xs"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-slate-900 px-3.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Plus size={14} /> Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}