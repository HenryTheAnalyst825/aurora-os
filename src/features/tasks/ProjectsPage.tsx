import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Download, ExternalLink, FileText, FolderKanban } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { fetchDocuments, signedUrl } from '../documents/api'
import { canPreview, fmtSize } from '../documents/files'
import { useMyDepartmentId } from '../documents/hooks'
import type { Dept } from '../documents/types'
import { createProject, fetchProjects } from './api'
import { downloadOriginalDoc, fetchDocuments, signedUrl } from '../documents/api'
type DeptKey = 'production' | 'qc' | 'ehs' | 'hr' | 'finance' | 'rnd'

type DataTableBlock = {
  title: string
  headers: string[]
  rows: string[][]
}

type DeptBrief = {
  key: DeptKey
  tabLabel: string
  title: string
  matchKeywords: string[]
  mission: string
  metrics: { label: string; value: string }[]
  tables: DataTableBlock[]
  deliverables: string[]
}

const DEPT_BRIEFS: Record<DeptKey, DeptBrief> = {
  production: {
    key: 'production',
    tabLabel: 'Sản xuất',
    title: '1. Đề Bài Phòng Sản Xuất (Production)',
    matchKeywords: ['sản xuất', 'production'],
    mission:
      'Đánh giá năng lực vận hành hiện tại của Dây chuyền 3 và đề xuất kế hoạch nâng sản lượng từ ~10.000 lên 40.000 sản phẩm/tháng trong 90 ngày.',
    metrics: [
      { label: 'Tổng thời gian khảo sát', value: '12.480 phút (26 ca)' },
      { label: 'OEE trung bình', value: '~48,0%' },
      { label: 'Tổn thất dừng máy', value: '118 lần · 4.060 phút' },
      { label: 'Tổn thất tốc độ', value: '2.396 phút' },
    ],
    tables: [
      {
        title: 'Bảng 1A: Phân bổ dừng máy theo 4 trạm trên Line 3 (26 ca khảo sát)',
        headers: ['Trạm', 'Công đoạn', 'Số lần dừng', 'Tổng thời gian', 'Ghi nhận hiện trường'],
        rows: [
          ['ST-01', 'Cấp phôi & Định hình', '24 lần', '740 phút', '18 lần dừng vặt < 5 phút do lệch băng dẫn phôi'],
          ['ST-02', 'Gia công chính xác', '46 lần', '1.680 phút', '18 lần đổi khuôn (1.420p) + 28 lần kẹt cơ khí/quá nhiệt'],
          ['ST-03', 'Kiểm tra & Cảm biến', '31 lần', '1.090 phút', '22 lần cảm biến quang báo dừng giả cuối ca'],
          ['ST-04', 'Đóng gói & Xuất xưởng', '17 lần', '550 phút', 'Chờ bán thành phẩm từ trạm trước & thay cuộn tem'],
        ],
      },
      {
        title: 'Bảng 1B: Nhật ký mẫu quan sát hiện trường (D04 – D25)',
        headers: ['Mã mẫu', 'Ca làm việc', 'Trạm', 'Thời lượng', 'Nội dung ghi nhận'],
        rows: [
          ['D04', 'Ca 1 (Ngày)', 'ST-02', '85 phút', 'Chuyển đổi khuôn mã hàng A sang B, siết 16 bu-lông thủ công'],
          ['D08', 'Ca 2 (Đêm)', 'ST-01', '32 phút', 'Lệch băng dẫn phôi đầu ca, dừng máy chỉnh cơ khí 4 lần'],
          ['D12', 'Ca 1 (Ngày)', 'ST-02', '64 phút', 'Quá nhiệt cụm gia công khi chạy liên tục giờ thứ 6'],
          ['D16', 'Ca 2 (Đêm)', 'ST-03', '45 phút', 'Cảm biến quang báo lỗi giả liên tục, phải vệ sinh thủ công'],
          ['D21', 'Ca 2 (Đêm)', 'ST-02', '92 phút', 'Đổi khuôn ca đêm thiếu kỹ thuật viên chính, chờ hỗ trợ 30 phút'],
          ['D25', 'Ca 1 (Ngày)', 'ST-04', '28 phút', 'Gián đoạn đóng gói do thiếu phôi đầu vào từ trạm ST-03'],
        ],
      },
    ],
    deliverables: [
      'Xác định các nguyên nhân làm giảm OEE trên Line 3.',
      'Đề xuất lộ trình nâng công suất lên 40.000 sp/tháng theo từng chặng 30 – 60 – 90 ngày.',
    ],
  },
  qc: {
    key: 'qc',
    tabLabel: 'QA/QC',
    title: '2. Đề Bài Phòng Chất Lượng (QA/QC)',
    matchKeywords: ['chất lượng', 'qc', 'qa'],
    mission:
      'Kiểm soát tỷ lệ lỗi sản phẩm khi tăng tốc độ dây chuyền, đảm bảo ngưỡng lỗi khách hàng dưới 500 ppm (< 0,05%) và không để lọt lỗi ra ngoài.',
    metrics: [
      { label: 'Mẫu bị từ chối (26 ca)', value: '56 mẫu' },
      { label: 'Hàng phải làm lại (Rework)', value: '470 sản phẩm' },
      { label: 'Tỷ lệ lỗi khách hàng', value: '1.100 ppm (Mục tiêu < 500)' },
      { label: 'Chu kỳ lấy mẫu hiện tại', value: '30 phút / lần' },
    ],
    tables: [
      {
        title: 'Bảng 2A: Thống kê phân loại lỗi ghi nhận tại Trạm ST-03 & Phòng Lab',
        headers: ['Nhóm lỗi', 'Số lượng mẫu', 'Tỷ trọng', 'Thông số kỹ thuật ghi nhận'],
        rows: [
          ['Sai lệch kích thước khớp nối', '34 mẫu', '60,7%', 'Vượt dung sai ±0,05 mm sau các lần chuyển đổi mã hàng'],
          ['Rò rỉ vi mô đường hàn', '22 mẫu', '39,3%', 'Không đạt áp suất thử kín tại Trạm ST-03'],
          ['Hàng làm lại (Rework)', '470 sản phẩm', '100% đạt sau sửa', 'Tốn thêm 18 giờ công kiểm tra & gia công lại'],
          ['Thiết bị đo độ bền kéo (Lab)', '—', '—', 'Quá hạn hiệu chuẩn định kỳ 40 ngày chưa bảo trì'],
        ],
      },
    ],
    deliverables: [
      'Đề xuất phương án kiểm soát chất lượng trên chuyền (In-line QC) khi tăng sản lượng gấp 4 lần.',
      'Xây dựng quy trình ngăn ngừa lỗi tái diễn sau mỗi lần chuyển đổi khuôn.',
    ],
  },
  ehs: {
    key: 'ehs',
    tabLabel: 'An toàn EHS',
    title: '3. Đề Bài Phòng An Toàn & Môi Trường (EHS)',
    matchKeywords: ['an toàn', 'ehs', 'môi trường'],
    mission:
      'Đảm bảo mục tiêu 0 tai nạn lao động và tuân thủ giới hạn xả thải môi trường khi Line 3 vận hành tăng cường 3 ca liên tục.',
    metrics: [
      { label: 'Sự cố suýt tai nạn (Near-Miss)', value: '6 vụ trên Line 3' },
      { label: 'Tải lượng xử lý nước thải', value: '92% công suất thiết kế' },
      { label: 'Độ ồn tại cụm ST-02', value: '86 dBA (ca cao điểm)' },
      { label: 'Ngân sách hạng mục B04', value: '140 triệu VNĐ' },
    ],
    tables: [
      {
        title: 'Bảng 3A: Nhật ký chi tiết 6 vụ Near-Miss ghi nhận trên Line 3',
        headers: ['Mã sự cố', 'Vị trí', 'Ca làm việc', 'Tình huống ghi nhận'],
        rows: [
          ['NM-L3-01', 'Trạm ST-02', 'Ca 1 (Ngày)', 'Công nhân đưa tay gạt phôi kẹt khi băng tải chưa dừng hẳn'],
          ['NM-L3-02', 'Trạm ST-03', 'Ca 2 (Đêm)', 'Thao tác lấy mẫu kiểm tra gần cụm cảm biến khi máy đang chạy'],
          ['NM-L3-03', 'Trạm ST-02', 'Ca 2 (Đêm)', 'Găng tay bảo hộ quá rộng bị vướng nhẹ vào thanh dẫn hướng'],
          ['NM-L3-04', 'Trạm ST-03', 'Ca 1 (Ngày)', 'Vệ sinh mắt cảm biến quang học khi chưa ngắt nguồn khí nén'],
          ['NM-L3-05', 'Khu vực ST-01', 'Ca 1 (Ngày)', 'Trượt chân do rò rỉ dầu bôi trơn dưới sàn thao tác'],
          ['NM-L3-06', 'Tủ điều khiển phụ', 'Ca 2 (Đêm)', 'Mở nắp tủ kiểm tra rơ-le nhưng chưa thực hiện khóa nguồn LOTO'],
        ],
      },
    ],
    deliverables: [
      'Đề xuất giải pháp kỹ thuật và quy trình loại bỏ nguy cơ tai nạn tại ST-02 và ST-03.',
      'Phương án kiểm soát tải lượng nước thải và tiếng ồn trong giới hạn ngân sách.',
    ],
  },
  hr: {
    key: 'hr',
    tabLabel: 'Nhân sự HR',
    title: '4. Đề Bài Phòng Nhân Sự (HR)',
    matchKeywords: ['nhân sự', 'hr'],
    mission:
      'Hoạch định định biên nhân sự, lịch chia ca và chương trình đào tạo đa kỹ năng để vận hành ổn định sản lượng 40.000 sp/tháng.',
    metrics: [
      { label: 'Định biên hiện tại', value: '18 người / ca' },
      { label: 'Tỷ lệ nghỉ việc (< 6 tháng)', value: '22% / năm' },
      { label: 'Nhân sự biết đổi khuôn', value: '35% tổng quân số' },
      { label: 'Tỷ lệ tăng ca (OT)', value: '+28% so với quý trước' },
    ],
    tables: [
      {
        title: 'Bảng 4A: Hồ sơ nhân sự & năng lực vận hành mẫu trên Line 3 (NS-01 – NS-05)',
        headers: ['Mã hồ sơ', 'Vị trí / Nhóm', 'Thâm niên', 'Chứng chỉ kỹ năng', 'Ghi nhận vận hành'],
        rows: [
          ['NS-01', 'Kỹ thuật viên trưởng ca', '4,5 năm', 'Bậc 4/4 (Đổi khuôn & Bảo trì)', 'Chỉ có 3 người toàn xưởng, phải trực chéo cả ca đêm'],
          ['NS-02', 'Tổ trưởng dây chuyền', '3,0 năm', 'Bậc 3/4 (Vận hành tổng hợp)', 'Thạo vận hành nhưng chưa được cấp quyền chỉnh thông số khuôn'],
          ['NS-03', 'Vận hành viên Trạm ST-02', '1,5 năm', 'Bậc 2/4 (Vận hành cơ bản)', 'Đứng máy ổn định, chưa biết quy trình tháo lắp khuôn nhanh'],
          ['NS-04', 'Vận hành viên ca đêm', '4 tháng', 'Bậc 1/4 (Đào tạo tại chỗ)', 'Thường xuyên tăng ca > 10h/ngày, tỷ lệ sai thao tác cao'],
          ['NS-05', 'Nhân sự mới tuyển', '1,5 tháng', 'Chưa hoàn thành sát hạch', 'Chưa được thực hành xử lý kẹt phôi an toàn trên Line 3'],
        ],
      },
    ],
    deliverables: [
      'Đề xuất phương án bố trí ca kíp và giảm phụ thuộc vào tăng ca (OT) kéo dài.',
      'Kế hoạch đào tạo chéo (Cross-training) nâng tỷ lệ nhân sự biết đổi khuôn.',
    ],
  },
  finance: {
    key: 'finance',
    tabLabel: 'Tài chính',
    title: '5. Đề Bài Phòng Tài Chính (Finance)',
    matchKeywords: ['tài chính', 'kế toán', 'finance'],
    mission:
      'Phân bổ ngân sách đầu tư (CAPEX) trong trần 1.710 triệu VNĐ và kiểm soát giá thành đơn vị khi mở rộng sản lượng lên 40.000 sp/tháng.',
    metrics: [
      { label: 'Trần ngân sách phê duyệt', value: '1.710 triệu VNĐ' },
      { label: 'Tác động dừng máy lên giá vốn', value: '+14% giá thành đơn vị' },
      { label: 'Chi phí tăng ca OT hiện tại', value: '185 triệu VNĐ / tháng' },
      { label: 'Thời hạn hoàn vốn yêu cầu', value: '≤ 12 tháng' },
    ],
    tables: [
      {
        title: 'Bảng 5A: Danh mục chi tiết 9 hạng mục đề xuất ngân sách (B01 – B09)',
        headers: ['Mã', 'Hạng mục đề xuất', 'Chi phí dự kiến', 'Phòng ban đề xuất'],
        rows: [
          ['B01', 'Bộ gá kẹp nhanh chuyển đổi khuôn (Changeover) ST-02', '260 triệu VNĐ', 'Sản xuất & Kỹ thuật'],
          ['B02', 'Cải tạo hệ thống tản nhiệt & truyền động cụm ST-02', '220 triệu VNĐ', 'Sản xuất'],
          ['B03', 'Hệ thống cảm biến quang & camera kiểm lỗi In-line ST-03', '310 triệu VNĐ', 'QA/QC'],
          ['B04', 'Che chắn an toàn liên động, khóa LOTO & xử lý nước thải', '140 triệu VNĐ', 'An toàn EHS'],
          ['B05', 'Chương trình đào tạo chéo & sát hạch tay nghề 3 ca', '120 triệu VNĐ', 'Nhân sự HR'],
          ['B06', 'Chuẩn hóa bộ khuôn & hiệu chỉnh thông số vật liệu mới', '180 triệu VNĐ', 'R&D / Kỹ thuật'],
          ['B07', 'Gói phụ tùng thay thế chiến lược (Spare parts) 90 ngày', '120 triệu VNĐ', 'Bảo trì & Sản xuất'],
          ['B08', 'Chi phí chạy thử nghiệm Pilot Run & hiệu chuẩn thiết bị Lab', '160 triệu VNĐ', 'R&D & QA/QC'],
          ['B09', 'Quỹ dự phòng rủi ro vận hành & biến động đơn hàng', '200 triệu VNĐ', 'Tài chính'],
        ],
      },
    ],
    deliverables: [
      'Đánh giá hiệu quả tài chính và thứ tự ưu tiên giải ngân các hạng mục B01–B09 trong trần 1.710 triệu VNĐ.',
      'Tính toán mức giảm giá thành đơn vị khi OEE đạt mục tiêu.',
    ],
  },
  rnd: {
    key: 'rnd',
    tabLabel: 'R&D / Kỹ thuật',
    title: '6. Đề Bài Phòng Nghiên Cứu & Kỹ Thuật (R&D)',
    matchKeywords: ['nghiên cứu', 'kỹ thuật', 'r&d', 'rd'],
    mission:
      'Tối ưu thông số kỹ thuật khuôn mẫu, độ tương thích vật liệu mới và đánh giá 2 gói giải pháp nâng cấp thiết bị trên Line 3.',
    metrics: [
      { label: 'Thời gian đổi khuôn chuẩn', value: '78 phút / lần (16 bu-lông)' },
      { label: 'Độ co ngót vật liệu mới', value: 'Lệch 0,15% so với chuẩn cũ' },
      { label: 'Gói nâng cấp A', value: '360 triệu · 35 ngày triển khai' },
      { label: 'Gói nâng cấp B', value: '260 triệu · 20 ngày triển khai' },
    ],
    tables: [
      {
        title: 'Bảng 6A: So sánh thông số kỹ thuật 2 gói cải tiến thiết bị Trạm ST-02',
        headers: ['Tiêu chí', 'Gói A (Tự động hóa toàn phần)', 'Gói B (Cơ cấu kẹp nhanh bán tự động)'],
        rows: [
          ['Chi phí đầu tư', '360 triệu VNĐ', '260 triệu VNĐ'],
          ['Thời gian lắp đặt & dừng máy', '35 ngày', '20 ngày'],
          ['Thời gian đổi khuôn sau cải tiến', '12 phút / lần', '22 phút / lần'],
          ['Yêu cầu trình độ vận hành', 'Cần kỹ sư chuyên trách lập trình', 'Công nhân hiện tại thao tác được sau 2 ngày đào tạo'],
          ['Khả năng tương thích vật liệu mới', 'Cần nâng cấp thêm bộ điều khiển nhiệt', 'Tương thích trực tiếp với dải nhiệt hiện tại'],
        ],
      },
    ],
    deliverables: [
      'Lựa chọn phương án kỹ thuật phù hợp với tiến độ 90 ngày và điều kiện nhân sự hiện tại.',
      'Đề xuất bộ thông số nhiệt độ – áp suất chuẩn cho lô vật liệu polymer mới.',
    ],
  },
}

export function ProjectsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const isAdmin = profile?.role === 'admin'
  const myDeptId = useMyDepartmentId().data ?? null

  const [searchParams, setSearchParams] = useSearchParams()
  const paramDept = searchParams.get('dept') as DeptKey | null

  const [activeTab, setActiveTab] = useState<'briefs' | 'projects'>('briefs')
  const [activeDept, setActiveDept] = useState<DeptKey>(
    paramDept && DEPT_BRIEFS[paramDept] ? paramDept : 'production'
  )
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    if (paramDept && DEPT_BRIEFS[paramDept]) {
      setActiveTab('briefs')
      setActiveDept(paramDept)
    }
  }, [paramDept])

  const docsQuery = useQuery({ queryKey: ['documents'], queryFn: fetchDocuments })
  const { data: depts = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () =>
      ((await supabase.from('departments').select('id, name').order('name')).data ?? []) as Dept[],
  })

  const brief = DEPT_BRIEFS[activeDept]

  const deptFiles = useMemo(() => {
    return (docsQuery.data ?? []).filter((d) => {
      const canSee =
        isAdmin ||
        d.uploaded_by === profile?.id ||
        !d.department_id ||
        (myDeptId !== null && d.department_id === myDeptId)
      if (!canSee || !d.department_id) return false
      const deptName = depts.find((x) => x.id === d.department_id)?.name?.toLowerCase() ?? ''
      return brief.matchKeywords.some((kw) => deptName.includes(kw))
    })
  }, [docsQuery.data, depts, brief.matchKeywords, isAdmin, profile?.id, myDeptId])

  function selectDept(k: DeptKey) {
    setActiveDept(k)
    const next = new URLSearchParams(searchParams)
    next.set('dept', k)
    setSearchParams(next)
  }

  async function openOriginalFile(storagePath: string, fileName: string | null, inline: boolean) {
  setFileError('')
  try {
    if (inline) {
      const url = await signedUrl(storagePath)
      window.open(url, '_blank', 'noopener')
    } else {
      await downloadOriginalDoc(storagePath, fileName)
    }
  } catch (e: unknown) {
    setFileError((e as { message?: string })?.message ?? 'Không tải được tệp gốc.')
  }
}

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

  const input =
    'mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-normal focus:outline-2 focus:outline-accent'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Trung tâm Dự án & Hồ Sơ Phòng Ban</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tra cứu đề bài, dữ liệu hiện trường từng phòng ban (Line 3 Expansion) hoặc theo dõi Bảng Dự Án Kanban.
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'briefs'}
            onClick={() => setActiveTab('briefs')}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              activeTab === 'briefs' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen aria-hidden="true" size={16} />
            Hồ Sơ 6 Phòng Ban
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
            <FolderKanban aria-hidden="true" size={16} />
            Bảng Dự Án ({projects.length})
          </button>
        </div>
      </div>

      {activeTab === 'briefs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DEPT_BRIEFS) as DeptKey[]).map((key) => {
                const active = activeDept === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDept(key)}
                    className={`min-h-10 rounded-xl px-4 text-xs font-bold transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white'
                    }`}
                  >
                    {DEPT_BRIEFS[key].tabLabel}
                  </button>
                )
              })}
            </div>
            <Link to="/documents" className="text-xs font-bold text-teal-700 hover:underline">
              Mở Kho tài liệu gốc →
            </Link>
          </div>

          <article className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
            <div className="space-y-2 border-b border-slate-100 pb-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                DỰ ÁN MỞ RỘNG DÂY CHUYỀN 3 · OKWAY PRECISION VIETNAM
              </div>
              <h2 className="text-xl font-bold text-slate-900">{brief.title}</h2>
              <p className="text-sm leading-relaxed text-slate-600">{brief.mission}</p>
            </div>

            {deptFiles.length > 0 && (
              <div className="space-y-2 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-teal-900">
                  Tệp dữ liệu gốc đính kèm ({brief.tabLabel})
                </div>
                {fileError && <p className="text-xs font-semibold text-red-700">{fileError}</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {deptFiles.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText size={15} className="shrink-0 text-teal-600" />
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900">{doc.title}</div>
                          <div className="text-[11px] text-slate-500">{fmtSize(doc.size_bytes)}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {canPreview(doc.file_name) && (
                          <button
                            type="button"
                            onClick={() => void openOriginalFile(doc.storage_path, doc.file_name, true)}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink size={11} /> Mở
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void openOriginalFile(doc.storage_path, doc.file_name, false)}
                          className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          <Download size={11} /> Tải
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {brief.metrics.map((m) => (
                <div key={m.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {m.label}
                  </div>
                  <div className="mt-1.5 text-base font-extrabold text-slate-900">{m.value}</div>
                </div>
              ))}
            </div>

            {brief.tables.map((tbl) => (
              <div key={tbl.title} className="space-y-2.5">
                <h3 className="text-sm font-bold text-slate-900">{tbl.title}</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                      <tr>
                        {tbl.headers.map((h) => (
                          <th key={h} className="px-4 py-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {tbl.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/60">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className={`px-4 py-3 ${cIdx === 0 ? 'font-bold text-slate-900' : ''}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                Yêu cầu đầu ra cần trình bày
              </div>
              <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
                {brief.deliverables.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold">Danh sách Dự án</h2>
          {isLoading && <p className="mt-3 text-sm text-slate-600">Đang tải…</p>}
          {!isLoading && projects.length === 0 && <p className="mt-3 text-sm text-slate-600">Chưa có dự án nào.</p>}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
                  to={`/projects/${p.id}`}
                >
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