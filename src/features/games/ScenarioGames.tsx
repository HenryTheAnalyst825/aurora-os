import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Compass, Eye, Grid3X3, HelpCircle, Lock, ShieldCheck, Unlock } from 'lucide-react'
import type { ScenarioGameKey } from './types'

type Props = {
  gameKey: ScenarioGameKey
  disabled: boolean
  onRecord: (ok: boolean, reason: string) => void
  onCompleteAll: () => void
}

// ============================================================================
// GAME 1: AUDIT BINGO — RÀ SOÁT CHỐT CHẶN AN TOÀN & QUY TRÌNH NHÀ MÁY (LƯỚI 3x3)
// ============================================================================
const BINGO_CELLS = [
  {
    id: 0,
    title: 'Đồ bảo hộ (PPE) đa kích cỡ',
    evidence: 'Kho phát đủ găng tay chống cắt size S/M/L/XL và kính bảo hộ vừa khuôn mặt cho 100% công nhân thời vụ.',
    status: 'pass' as const,
    explain: 'Đạt chuẩn: Giảm trực tiếp nguy cơ cuốn găng tay vào băng chuyền khi tăng ca đêm.',
  },
  {
    id: 1,
    title: 'Quy trình phản ánh sự cố ẩn danh',
    evidence: 'Hộp thư góp ý đặt ngay cạnh phòng Tổ trưởng, muốn gửi báo cáo phải ghi rõ Họ tên & Mã nhân viên.',
    status: 'risk' as const,
    explain: 'Rủi ro ẩn: Thiếu ẩn danh khiến công nhân sợ bị trù dập nên giấu nhẹm lỗi suýt tai nạn (Near-Miss).',
  },
  {
    id: 2,
    title: 'Hiệu chuẩn thiết bị đo phòng Lab',
    evidence: 'Máy đo độ bền kéo tại phòng QC có tem hiệu chuẩn hết hạn từ 40 ngày trước nhưng vẫn đang dùng đo xuất xưởng.',
    status: 'risk' as const,
    explain: 'Rủi ro nghiêm trọng: Dữ liệu đo sai lệch làm lọt lô hàng lỗi tới tay khách hàng.',
  },
  {
    id: 3,
    title: 'Minh bạch khung lương theo bậc',
    evidence: 'Bảng mô tả công việc (JD) và dải lương từng bậc kỹ thuật viên được công khai trên cổng nội bộ Aurora OS.',
    status: 'pass' as const,
    explain: 'Đạt chuẩn: Giúp nhân sự hiểu rõ lộ trình tăng bậc dựa trên năng lực thực tế.',
  },
  {
    id: 4,
    title: 'Nút dừng khẩn cấp (E-Stop)',
    evidence: 'Nút E-Stop lắp ở độ cao 1,75m theo chuẩn máy nhập khẩu; công nhân cao 1,55m phải rướn người mới chạm tới.',
    status: 'risk' as const,
    explain: 'Rủi ro công thái học: Chậm 1–2 giây bấm E-Stop khi kẹt máy có thể gây tai nạn nghiêm trọng.',
  },
  {
    id: 5,
    title: 'Phân bổ ca đêm công bằng',
    evidence: 'Hệ thống xoay vòng ca đêm tự động, không ép buộc nhân sự đang mang thai hoặc nuôi con nhỏ dưới 12 tháng.',
    status: 'pass' as const,
    explain: 'Đạt chuẩn: Tuân thủ Bộ luật Lao động và giữ tỷ lệ nghỉ việc ở mức thấp.',
  },
  {
    id: 6,
    title: 'Kiểm soát cảm biến đầu chuyền',
    evidence: 'Tổ trưởng tự ý nới ngưỡng cảnh báo cảm biến quang học để máy chạy nhanh hơn nhằm lấy thưởng sản lượng.',
    status: 'risk' as const,
    explain: 'Rủi ro chất lượng: Đánh đổi tiêu chuẩn kỹ thuật lấy sản lượng ngắn hạn.',
  },
  {
    id: 7,
    title: 'Đào tạo an toàn trước khi đứng máy',
    evidence: '100% lao động thời vụ phải vượt qua bài kiểm tra thực hành an toàn 30 phút trước khi nhận thẻ vào xưởng.',
    status: 'pass' as const,
    explain: 'Đạt chuẩn: Ngăn ngừa tai nạn cho người mới trong tuần đầu tiên.',
  },
  {
    id: 8,
    title: 'Ghi nhận sáng kiến cải tiến (Kaizen)',
    evidence: 'Mọi đề xuất cải tiến của công nhân đứng máy đều được ghi mã số và cộng Credits thưởng minh bạch.',
    status: 'pass' as const,
    explain: 'Đạt chuẩn: Khuyến khích người trực tiếp vận hành phát hiện điểm nghẽn.',
  },
]

function AuditBingoDesk({ disabled, onRecord, onCompleteAll }: Omit<Props, 'gameKey'>) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [activeId, setActiveId] = useState<number>(0)
  const cell = BINGO_CELLS[activeId]

  function classify(choice: 'pass' | 'risk') {
    if (disabled || checked[cell.id]) return
    const ok = choice === cell.status
    const next = { ...checked, [cell.id]: true }
    setChecked(next)
    onRecord(ok, cell.explain)
    if (Object.keys(next).length >= BINGO_CELLS.length) {
      setTimeout(onCompleteAll, 600)
    } else {
      const nextUnchecked = BINGO_CELLS.find((c) => !next[c.id])
      if (nextUnchecked) setActiveId(nextUnchecked.id)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-slate-600">
            <Grid3X3 size={15} /> Bảng Kiểm Toán 3x3 ({Object.keys(checked).length}/9 ô)
          </span>
          <span className="text-xs text-slate-500">Chọn từng ô để thẩm định bằng chứng</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {BINGO_CELLS.map((c) => {
            const done = checked[c.id]
            const selected = activeId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex min-h-24 flex-col justify-between rounded-lg border p-2.5 text-left text-xs transition ${
                  done
                    ? c.status === 'pass'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                      : 'border-amber-400 bg-amber-50 text-amber-950'
                    : selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-400'
                }`}
              >
                <span className="font-bold leading-snug">{c.title}</span>
                <span className="text-[10px] font-semibold uppercase opacity-80">
                  {done ? (c.status === 'pass' ? '✓ Đạt chuẩn' : '⚠ Rủi ro ẩn') : 'Chưa thẩm định'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
        <div>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
            Hạng mục #{cell.id + 1}: {cell.title}
          </span>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <b>Bằng chứng ghi nhận tại xưởng:</b>
            <p className="mt-1">{cell.evidence}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={disabled || !!checked[cell.id]}
            onClick={() => classify('pass')}
            className="min-h-12 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            ✓ Chốt chặn Đạt chuẩn
          </button>
          <button
            type="button"
            disabled={disabled || !!checked[cell.id]}
            onClick={() => classify('risk')}
            className="min-h-12 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            ⚠ Cảnh báo Rủi ro ẩn
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// GAME 2: HR ESCAPE ROOM — GIẢI MÃ 5 HỒ SƠ TUYỂN DỤNG & ĐÃI NGỘ
// ============================================================================
const ESCAPE_PUZZLES = [
  {
    codeDigit: '4',
    title: 'Hồ sơ #1: Lệch khung lương cùng vị trí',
    clue: 'Kỹ sư A (5 năm kinh nghiệm, đạt KPI 112%) nhận lương 22 triệu. Kỹ sư B (4 năm kinh nghiệm, KPI 105%, tuyển sau) nhận lương 26 triệu do "đàm phán lương khởi điểm tốt hơn". Chênh lệch lương giữa hai người là bao nhiêu triệu/tháng? (Nhập số để lấy mật mã thứ 1)',
    options: [
      { val: '2', label: '2 triệu (Bỏ qua vì do thỏa thuận cá nhân)' },
      { val: '4', label: '4 triệu — Cần rà soát lại dải lương theo năng lực (Pay Equity Audit)' },
      { val: '0', label: '0 triệu — Không cần điều chỉnh' },
    ],
    reason: 'Chênh lệch 4 triệu/tháng cho cùng bậc năng lực gây rủi ro mất nhân sự chủ chốt.',
  },
  {
    codeDigit: '7',
    title: 'Hồ sơ #2: Ghi chú phỏng vấn cảm tính',
    clue: 'Có 4 ứng viên nộp vào vị trí Trưởng ca Sản xuất. Hội đồng phỏng vấn loại ứng viên nữ có 7 năm kinh nghiệm quản lý chuyền với ghi chú: "Lo ngại không chịu được áp lực tăng ca đêm". Số năm kinh nghiệm thực tế của ứng viên bị loại là bao nhiêu?',
    options: [
      { val: '3', label: '3 năm' },
      { val: '7', label: '7 năm — Loại ứng viên bằng giả định thay vì kiểm tra năng lực thực tế' },
      { val: '5', label: '5 năm' },
    ],
    reason: '7 năm kinh nghiệm thực chiến bị gạt bỏ bởi định kiến chủ quan không có dữ liệu kiểm chứng.',
  },
  {
    codeDigit: '2',
    title: 'Hồ sơ #3: Thăng chức "hành lang"',
    clue: 'Trong 10 suất đề bạt Tổ trưởng năm nay, có 8 suất được quyết định qua giới thiệu nội bộ không đăng thông báo công khai, chỉ có 2 suất có hội đồng đánh giá minh bạch. Có bao nhiêu suất được đánh giá đúng quy trình?',
    options: [
      { val: '8', label: '8 suất' },
      { val: '2', label: '2 suất — Thiếu minh bạch làm triệt tiêu động lực phấn đấu của số đông' },
      { val: '10', label: '10 suất' },
    ],
    reason: 'Chỉ 2/10 suất đánh giá công khai khiến nhân sự giỏi cảm thấy cơ hội không công bằng.',
  },
  {
    codeDigit: '9',
    title: 'Hồ sơ #4: Đánh giá hiệu suất cuối năm',
    clue: 'Nhân viên X hoàn thành 9/10 chỉ tiêu giao hàng đúng hạn, nhưng bị hạ bậc đánh giá xuống "Trung bình" vì ít tham gia tiệc liên hoan sau giờ làm. Nhân viên X đã đạt bao nhiêu chỉ tiêu KPI?',
    options: [
      { val: '9', label: '9 chỉ tiêu — Đánh giá phải dựa trên kết quả công việc thay vì mức độ xã giao' },
      { val: '5', label: '5 chỉ tiêu' },
      { val: '1', label: '1 chỉ tiêu' },
    ],
    reason: 'Đạt 9/10 KPI nhưng bị trừ điểm vì yếu tố ngoài công việc là lỗi thiên kiến phổ biến.',
  },
  {
    codeDigit: '5',
    title: 'Hồ sơ #5: Tỷ lệ nghỉ việc sau 6 tháng',
    clue: 'Xưởng đóng gói tuyển 20 nhân sự mới nhưng có 5 người nghỉ việc ngay tháng đầu vì không có người hướng dẫn (Buddy) và thiếu tài liệu quy trình. Có bao nhiêu người đã nghỉ việc?',
    options: [
      { val: '5', label: '5 người (25%) — Cần chuẩn hóa chương trình Onboarding 30 ngày đầu' },
      { val: '2', label: '2 người' },
      { val: '15', label: '15 người' },
    ],
    reason: 'Mất 5/20 nhân sự mới ngay tháng đầu gây lãng phí lớn chi phí tuyển dụng và đào tạo.',
  },
]

function HrEscapeDesk({ disabled, onRecord, onCompleteAll }: Omit<Props, 'gameKey'>) {
  const [step, setStep] = useState(0)
  const [unlockedDigits, setUnlockedDigits] = useState<string[]>([])
  const cur = ESCAPE_PUZZLES[step]

  function pickOption(val: string) {
    if (disabled || !cur) return
    const ok = val === cur.codeDigit
    onRecord(ok, cur.reason)
    if (ok) {
      const nextDigits = [...unlockedDigits, cur.codeDigit]
      setUnlockedDigits(nextDigits)
      if (step + 1 >= ESCAPE_PUZZLES.length) {
        setTimeout(onCompleteAll, 600)
      } else {
        setStep(step + 1)
      }
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          {unlockedDigits.length === 5 ? <Unlock className="text-emerald-600" size={20} /> : <Lock className="text-amber-600" size={20} />}
          <span className="text-sm font-bold text-slate-900">
            Mật mã mở khóa phòng nhân sự ({unlockedDigits.length}/5 số):
          </span>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((idx) => (
            <span
              key={idx}
              className={`grid size-9 place-items-center rounded-lg border font-mono text-base font-black ${
                unlockedDigits[idx]
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-slate-300 bg-slate-100 text-slate-400'
              }`}
            >
              {unlockedDigits[idx] ?? '?'}
            </span>
          ))}
        </div>
      </div>

      {cur && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">{cur.title}</h2>
          <p className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 border border-slate-200">
            {cur.clue}
          </p>
          <div className="grid gap-2.5">
            {cur.options.map((opt) => (
              <button
                key={opt.val}
                type="button"
                disabled={disabled}
                onClick={() => pickOption(opt.val)}
                className="min-h-12 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-900 transition hover:border-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="mr-2 inline-block rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                  Mã {opt.val}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// GAME 3: ASSUMPTION ALERT — BẮT LỖI GIẢ ĐỊNH NGẦM TRONG NGÀY LÀM VIỆC
// ============================================================================
const ASSUMPTION_SCENARIOS = [
  {
    context: '08:30 — Họp giao ban đầu ngày tại Phòng Kỹ thuật',
    quote: 'Trưởng nhóm nói: "Dự án đi công tác lắp đặt máy ở tỉnh xa tuần tới chỉ giao cho mấy bạn nam thôi, mấy bạn nữ có gia đình rồi chắc không đi được đâu."',
    hasBias: true,
    reason: 'Giả định thay cho người khác: Nên công bố yêu cầu công tác minh bạch để tất cả thành viên chủ động đăng ký theo năng lực và điều kiện cá nhân.',
  },
  {
    context: '10:15 — Trao đổi phân bổ ngân sách quý mới',
    quote: 'Quản lý Tài chính nói: "Dựa trên dữ liệu phế phẩm 3 tháng qua tăng 4%, chúng ta cần trích quỹ dự phòng bảo trì khuôn mẫu ngay trong tháng này."',
    hasBias: false,
    reason: 'Quyết định dựa trên số liệu thực tế (Data-driven), hoàn toàn khách quan và hợp lý.',
  },
  {
    context: '14:00 — Thảo luận ứng viên vị trí Chuyên viên Chăm sóc Khách hàng',
    quote: 'Nhân sự phỏng vấn nhận xét: "Ứng viên này làm kỹ thuật 4 năm rồi nên chắc tính cách khô khan, không khéo léo để giao tiếp với khách hàng đâu."',
    hasBias: true,
    reason: 'Định kiến nghề nghiệp (Stereotype): Kinh nghiệm kỹ thuật thực tế giúp tư vấn khách hàng chính xác hơn nếu được đánh giá qua bài test tình huống.',
  },
  {
    context: '15:45 — Phân công người trình bày báo cáo trước Ban Giám đốc',
    quote: 'Trưởng dự án đề xuất: "Bạn Minh là người trực tiếp phân tích bộ số liệu này, nên để Minh đứng trình bày chính và trả lời câu hỏi chuyên sâu."',
    hasBias: false,
    reason: 'Ghi nhận đúng người tạo ra đóng góp chuyên môn (Proper Credit Attribution).',
  },
  {
    context: '16:30 — Nhận xét về nhân viên làm việc đúng giờ hành chính',
    quote: 'Quản lý bộ phận nói: "Cậu Hùng lúc nào cũng 17h30 đúng là về đón con, nhìn không có tinh thần cống hiến bằng mấy người hay ngồi lại tới 20h."',
    hasBias: true,
    reason: 'Thiên kiến hiện diện (Presence Bias): Đánh giá hiệu quả qua số giờ ngồi tại bàn thay vì năng suất và chất lượng đầu ra.',
  },
]

function AssumptionAlertDesk({ disabled, onRecord, onCompleteAll }: Omit<Props, 'gameKey'>) {
  const [idx, setIdx] = useState(0)
  const item = ASSUMPTION_SCENARIOS[idx]

  function answer(flaggedBias: boolean) {
    if (disabled || !item) return
    const ok = flaggedBias === item.hasBias
    onRecord(ok, item.reason)
    if (idx + 1 >= ASSUMPTION_SCENARIOS.length) {
      setTimeout(onCompleteAll, 600)
    } else {
      setIdx(idx + 1)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>Tình huống {idx + 1} / {ASSUMPTION_SCENARIOS.length}</span>
        <span>{item.context}</span>
      </div>
      <blockquote className="rounded-xl border-l-4 border-slate-900 bg-slate-50 p-5 text-base font-medium leading-relaxed text-slate-900">
        “{item.quote}”
      </blockquote>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => answer(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          <AlertTriangle size={17} /> Bắt lỗi Giả định / Định kiến!
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => answer(false)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle2 size={17} /> Giao tiếp Khách quan & Chuẩn mực
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// GAME 4: MEETING OBSERVER — SOI ĐIỂM MÙ TRONG CUỘC HỌP DỰ ÁN
// ============================================================================
const MEETING_MOMENTS = [
  {
    moment: 'Phút 05: Kỹ sư Lan vừa nêu ý tưởng tối ưu layout băng chuyền thì bị ngắt lời ngang; 10 phút sau Kỹ sư Nam nhắc lại đúng ý đó thì cả phòng khen hay.',
    issue: 'appropriating',
    reason: 'Chiếm dụng ý tưởng (Idea Appropriation / Bropropriating): Người điều phối cần ghi nhận đúng tác giả ý tưởng ban đầu.',
  },
  {
    moment: 'Phút 15: Thư ký cuộc họp ghi đầy đủ biên bản, phân công rõ người chịu trách nhiệm (DRI) và hạn hoàn thành cho từng đầu việc.',
    issue: 'healthy',
    reason: 'Vận hành cuộc họp chuẩn: Rõ người, rõ việc, rõ thời hạn.',
  },
  {
    moment: 'Phút 25: Đại diện xưởng sản xuất ở chi nhánh tỉnh tham gia họp online qua Zoom nhưng không ai hỏi ý kiến suốt 40 phút đầu cuộc họp.',
    issue: 'exclusion',
    reason: 'Bỏ quên nhân sự từ xa (Proximity Bias): Người chủ trì cần chủ động mời ý kiến các điểm cầu trực tuyến.',
  },
  {
    moment: 'Phút 35: Khi có sự cố trễ tiến độ, trưởng nhóm chỉ tập trung tìm xem ai làm sai để phạt thay vì rà soát nút thắt quy trình.',
    issue: 'blame',
    reason: 'Văn hóa đổ lỗi (Blame Culture): Khiến nhân viên giấu lỗi thay vì báo cáo sớm để xử lý.',
  },
]

function MeetingObserverDesk({ disabled, onRecord, onCompleteAll }: Omit<Props, 'gameKey'>) {
  const [idx, setIdx] = useState(0)
  const cur = MEETING_MOMENTS[idx]

  function choose(tag: string) {
    if (disabled || !cur) return
    const ok = tag === cur.issue
    onRecord(ok, cur.reason)
    if (idx + 1 >= MEETING_MOMENTS.length) {
      setTimeout(onCompleteAll, 600)
    } else {
      setIdx(idx + 1)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-indigo-700">
        <Eye size={15} /> Quan sát cuộc họp ({idx + 1}/{MEETING_MOMENTS.length})
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-900">
        {cur.moment}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {[
          { key: 'appropriating', label: '1. Ngắt lời & Ghi nhận nhầm chủ ý tưởng' },
          { key: 'exclusion', label: '2. Bỏ sót tiếng nói nhóm làm việc từ xa' },
          { key: 'blame', label: '3. Tập trung đổ lỗi cá nhân thay vì sửa quy trình' },
          { key: 'healthy', label: '4. Điều phối minh bạch & Hiệu quả' },
        ].map((btn) => (
          <button
            key={btn.key}
            type="button"
            disabled={disabled}
            onClick={() => choose(btn.key)}
            className="min-h-12 rounded-lg border border-slate-300 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-800 hover:border-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// GAME 5: 90-DAY PLANT LEADER — ĐIỀU HÀNH NHÀ MÁY 90 NGÀY
// ============================================================================
const LEADERSHIP_ROUNDS = [
  {
    phase: 'Chặng 1 (Ngày 1 – 30): Xử lý áp lực đơn hàng tăng 30%',
    situation: 'Khách hàng lớn yêu cầu giao gấp lô hàng trong 3 tuần. Bạn chọn phương án điều hành nào?',
    choices: [
      {
        label: 'Ép tăng ca đêm liên tục 3 tuần và cắt giảm thời gian bảo trì máy định kỳ',
        ok: false,
        reason: 'Tăng sản lượng tức thời nhưng gây kiệt sức, tăng tai nạn lao động và hỏng máy ở Chặng 2.',
      },
      {
        label: 'Tái cân bằng chuyền, bổ sung nhân sự thời vụ đã qua đào tạo an toàn & chuẩn hóa bảo hộ PPE',
        ok: true,
        reason: 'Quyết định bền vững: Giữ vững cả sản lượng, an toàn lao động lẫn tinh thần đội ngũ.',
      },
    ],
  },
  {
    phase: 'Chặng 2 (Ngày 31 – 60): Giải quyết xung đột giữa Phòng Sản xuất và Phòng QC',
    situation: 'Phòng Sản xuất phàn nàn QC kiểm tra quá khắt khe làm chậm tiến độ xuất hàng.',
    choices: [
      {
        label: 'Thiết lập chốt kiểm soát chất lượng ngay tại từng công đoạn (In-line QC) & KPI thưởng chung theo tỷ lệ hàng đạt chuẩn lần đầu',
        ok: true,
        reason: 'Gắn kết mục tiêu chung giúp phát hiện lỗi sớm ngay đầu chuyền thay vì dồn ứ cuối chuyền.',
      },
      {
        label: 'Yêu cầu QC ký duyệt đặc cách cho qua các lỗi nhỏ để kịp doanh số tháng',
        ok: false,
        reason: 'Gây rủi ro bị khách hàng trả hàng (Recall) và mất uy tín thương hiệu nghiêm trọng.',
      },
    ],
  },
  {
    phase: 'Chặng 3 (Ngày 61 – 90): Giữ chân nhân tài & Văn hóa cải tiến',
    situation: 'Kết thúc quý, bạn còn một khoản ngân sách thưởng và đào tạo cuối kỳ.',
    choices: [
      {
        label: 'Chia đều tiền thưởng cho tất cả mọi người không cần đánh giá hiệu suất để tránh mất lòng',
        ok: false,
        reason: 'Cào bằng làm giảm động lực của những cá nhân nỗ lực và sáng tạo vượt trội.',
      },
      {
        label: 'Thưởng minh bạch theo đóng góp thực tế + Đầu tư nâng cấp trạm làm việc công thái học theo đề xuất của công nhân',
        ok: true,
        reason: 'Vừa ghi nhận đúng người giỏi, vừa tạo môi trường làm việc an toàn và gắn kết dài hạn.',
      },
    ],
  },
]

function Leadership90dDesk({ disabled, onRecord, onCompleteAll }: Omit<Props, 'gameKey'>) {
  const [round, setRound] = useState(0)
  const [kpi, setKpi] = useState({ output: 70, safety: 70, retention: 70 })
  const cur = LEADERSHIP_ROUNDS[round]

  function decide(ok: boolean, reason: string) {
    if (disabled || !cur) return
    setKpi((prev) => ({
      output: Math.min(100, Math.max(20, prev.output + (ok ? 10 : 5))),
      safety: Math.min(100, Math.max(20, prev.safety + (ok ? 10 : -20))),
      retention: Math.min(100, Math.max(20, prev.retention + (ok ? 10 : -15))),
    }))
    onRecord(ok, reason)
    if (round + 1 >= LEADERSHIP_ROUNDS.length) {
      setTimeout(onCompleteAll, 600)
    } else {
      setRound(round + 1)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-900 p-4 text-white">
        <div>
          <div className="text-[11px] uppercase text-slate-400">Hiệu suất Vận hành</div>
          <div className="mt-1 text-xl font-black text-teal-400">{kpi.output}%</div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-slate-400">An toàn & Chất lượng</div>
          <div className="mt-1 text-xl font-black text-emerald-400">{kpi.safety}%</div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-slate-400">Gắn kết Nhân sự</div>
          <div className="mt-1 text-xl font-black text-amber-400">{kpi.retention}%</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-teal-700">
          <Compass size={15} /> {cur.phase}
        </div>
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-900">
          {cur.situation}
        </p>
        <div className="grid gap-3">
          {cur.choices.map((ch, i) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => decide(ch.ok, ch.reason)}
              className="min-h-12 rounded-lg border border-slate-300 bg-white p-4 text-left text-sm font-semibold text-slate-900 hover:border-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// GAME 6: MYTH OR FACT — LẦM TƯỞNG HAY SỰ THẬT TẠI NƠI LÀM VIỆC?
// ============================================================================
const MYTH_FACT_ITEMS = [
  {
    statement: '“Phần lớn sự cố suýt tai nạn (Near-Miss) tại nhà máy đều xuất phát từ sự bất cẩn của công nhân chứ không liên quan đến thiết kế máy móc hay bảo hộ.”',
    isFact: false,
    reason: 'LẦM TƯỞNG (Myth): Theo tháp an toàn công nghiệp, >80% lỗi thao tác bắt nguồn từ thiết kế công thái học chưa phù hợp, PPE sai kích cỡ hoặc quy trình thiếu chốt chặn.',
  },
  {
    statement: '“Các nhóm dự án có sự đa dạng về chuyên môn và góc nhìn thường đưa ra quyết định giải quyết vấn đề phức tạp chính xác hơn nhóm đồng nhất.”',
    isFact: true,
    reason: 'SỰ THẬT (Fact): Đa dạng góc nhìn giúp phát hiện sớm các điểm mù rủi ro mà một nhóm đồng nhất dễ bỏ qua.',
  },
  {
    statement: '“Giấu kín khung lương và tiêu chí thăng chức giúp doanh nghiệp tiết kiệm chi phí nhân sự và tránh so bì nội bộ.”',
    isFact: false,
    reason: 'LẦM TƯỞNG (Myth): Sự thiếu minh bạch làm tăng nghi ngờ, giảm động lực làm việc và khiến nhân sự giỏi rời bỏ tổ chức nhanh hơn.',
  },
  {
    statement: '“Áp dụng 5 Whys (5 lần hỏi Tại sao) giúp tìm ra nguyên nhân gốc rễ của hệ thống thay vì dừng lại ở việc phạt cá nhân làm sai.”',
    isFact: true,
    reason: 'SỰ THẬT (Fact): Đây là công cụ cốt lõi trong sản xuất tinh gọn (Lean Manufacturing) và quản trị chất lượng.',
  },
  {
    statement: '“Tăng giá bán đồng loạt cho tất cả sản phẩm là cách nhanh nhất để giải quyết tình trạng doanh thu tăng nhưng lợi nhuận giảm.”',
    isFact: false,
    reason: 'LẦM TƯỞNG (Myth): Tăng giá cào bằng mà không tách đúng chi phí từng dòng sản phẩm (ABC Costing) sẽ làm mất sức cạnh tranh của dòng sản phẩm chủ lực.',
  },
  {
    statement: '“Chỉ cần ban hành văn bản quy định trên giấy là nhân viên sẽ tự động tuân thủ an toàn và quy trình chuẩn.”',
    isFact: false,
    reason: 'LẦM TƯỞNG (Myth): Quy định chỉ thực sự có hiệu lực khi đi kèm công cụ kiểm chứng, đào tạo thực hành và cơ chế phản hồi an toàn.',
  },
]

function MythFactDesk({ disabled, onRecord, onCompleteAll }: Omit<Props, 'gameKey'>) {
  const [idx, setIdx] = useState(0)
  const item = MYTH_FACT_ITEMS[idx]

  function classify(userSaysFact: boolean) {
    if (disabled || !item) return
    const ok = userSaysFact === item.isFact
    onRecord(ok, item.reason)
    if (idx + 1 >= MYTH_FACT_ITEMS.length) {
      setTimeout(onCompleteAll, 600)
    } else {
      setIdx(idx + 1)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
        <span className="inline-flex items-center gap-1.5 text-amber-700">
          <HelpCircle size={15} /> Nhận định {idx + 1} / {MYTH_FACT_ITEMS.length}
        </span>
        <span>Phân loại nhanh: Lầm tưởng hay Sự thật?</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-base font-bold leading-relaxed text-slate-900">
        {item.statement}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => classify(false)}
          className="min-h-14 rounded-xl bg-rose-600 px-4 text-sm font-extrabold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
        >
          ✕ LẦM TƯỞNG (MYTH)
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => classify(true)}
          className="min-h-14 rounded-xl bg-teal-600 px-4 text-sm font-extrabold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
        >
          ✓ SỰ THẬT (FACT)
        </button>
      </div>
    </div>
  )
}

export function ScenarioGameDesk({ gameKey, disabled, onRecord, onCompleteAll }: Props) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        <ShieldCheck size={14} className="text-teal-600" />
        Mô phỏng Tình huống Vận hành & Ra quyết định Thực tế
      </div>
      {gameKey === 'audit_bingo' && <AuditBingoDesk disabled={disabled} onRecord={onRecord} onCompleteAll={onCompleteAll} />}
      {gameKey === 'hr_escape' && <HrEscapeDesk disabled={disabled} onRecord={onRecord} onCompleteAll={onCompleteAll} />}
      {gameKey === 'assumption_alert' && <AssumptionAlertDesk disabled={disabled} onRecord={onRecord} onCompleteAll={onCompleteAll} />}
      {gameKey === 'meeting_observer' && <MeetingObserverDesk disabled={disabled} onRecord={onRecord} onCompleteAll={onCompleteAll} />}
      {gameKey === 'leadership_90d' && <Leadership90dDesk disabled={disabled} onRecord={onRecord} onCompleteAll={onCompleteAll} />}
      {gameKey === 'myth_fact' && <MythFactDesk disabled={disabled} onRecord={onRecord} onCompleteAll={onCompleteAll} />}
    </div>
  )
}