import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Download, ExternalLink, FileText, FolderKanban } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { downloadOriginalDoc, fetchDocuments, signedUrl } from '../documents/api'
import { canPreview, fmtSize } from '../documents/files'
import { useMyDepartmentId } from '../documents/hooks'
import type { Dept } from '../documents/types'
import { createProject, fetchProjects } from './api'

type DeptKey = 'production' | 'qc' | 'ehs' | 'hr' | 'finance' | 'rnd'

type DataTableBlock = {
  title: string
  subtitle?: string
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
  notes?: string[]
  tables: DataTableBlock[]
  deliverables: string[]
}

const DEPT_BRIEFS: Record<DeptKey, DeptBrief> = {
  production: {
    key: 'production',
    tabLabel: 'Sản xuất',
    title: '1. Hồ Sơ Chuyên Môn — Phòng Sản Xuất (Production)',
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
      'Xác định các nguyên nhân làm giảm OEE trên Line 3 và lập A3 trọng tâm.',
      'Đề xuất lộ trình nâng công suất lên 40.000 sp/tháng theo các mốc M01 – M02 – M03.',
    ],
  },
  qc: {
    key: 'qc',
    tabLabel: 'QA/QC',
    title: '2. Hồ Sơ Chuyên Môn — Phòng Chất Lượng (QA/QC)',
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
          ['Hàng làm lại (Rework)', '470 sản phẩm', '100% đạt sau sửa', 'Phát sinh thêm giờ công kiểm tra & gia công lại'],
          ['Thiết bị đo độ bền kéo (Lab)', '—', '—', 'Quá hạn hiệu chuẩn định kỳ 40 ngày chưa bảo trì'],
        ],
      },
    ],
    deliverables: [
      'Đề xuất phương án kiểm soát chất lượng trên chuyền (In-line QC) khi tăng sản lượng gấp 4 lần.',
      'Xây dựng quy trình ngăn ngừa lỗi tái diễn sau mỗi lần chuyển đổi khuôn và xác nhận QC độc lập.',
    ],
  },
  ehs: {
    key: 'ehs',
    tabLabel: 'An toàn EHS',
    title: '3. Hồ Sơ Chuyên Môn — Phòng An Toàn & Môi Trường (EHS)',
    matchKeywords: ['an toàn', 'ehs', 'môi trường'],
    mission:
      'Đánh giá các mối nguy ảnh hưởng đến việc mở rộng vận hành Line 3; chọn một vấn đề trọng tâm để lập A3, xác định biện pháp kiểm soát và điều kiện an toàn phải hoàn tất trước khi triển khai.',
    metrics: [
      { label: 'Ghi nhận chạy thử (D01–D26)', value: '6 sự kiện Near-Miss' },
      { label: 'Ngân sách tham chiếu B04', value: '140 triệu đồng' },
      { label: 'Mặt bàn tham chiếu ST-04', value: '900 mm (Khay 1.650 mm)' },
      { label: 'Nguyên tắc triển khai', value: 'Hoàn tất an toàn trước vận hành' },
    ],
    notes: [
      'Thứ tự ưu tiên và khả năng phân kỳ do kết quả đánh giá rủi ro quyết định, không mặc định hạng mục nào luôn có thể hoãn.',
      'Các thay đổi đồ gá/cảm biến trong gói Engineering A/B không được tính trùng với chi phí biện pháp an toàn E1–E5.',
    ],
    tables: [
      {
        title: 'Bảng 3A: Các ghi nhận EHS trong kỳ chạy thử (Mẫu 26 ca D01–D26)',
        subtitle: 'Phân loại ban đầu giúp xác định hướng đánh giá; chưa thay thế kết luận điều tra chính thức.',
        headers: ['Mã / Ca', 'Trạm', 'Phân loại sơ bộ', 'Hiện tượng và trạng thái cần xác minh'],
        rows: [
          ['NM-L3-01 · D04', 'ST-02', 'Điều kiện bảo hộ', 'Găng tay cỡ M rộng; chưa có xác nhận đã chọn được kích cỡ phù hợp.'],
          ['NM-L3-02 · D10', 'ST-02', 'Tình huống nguy hiểm khi xử lý kẹt', 'Người thao tác tiếp cận vùng có nguy cơ kẹp; đã dừng để xử lý mối nguy. Cần xác minh mức độ suýt gây tai nạn và biện pháp kiểm soát sau dừng.'],
          ['NM-L3-03 · D13', 'ST-04', 'Điều kiện công thái học', 'Người thao tác phải với lên khay cao; chưa có kết quả đo tầm với thực tế.'],
          ['NM-L3-04 · D17', 'ST-01', 'Điều kiện bố trí vật tư', 'Xe cấp vật tư nằm ngoài vị trí đánh dấu; chưa có đánh giá tác động đến lối đi.'],
          ['NM-L3-05 · D22', 'ST-03', 'Điều kiện che chắn thiết bị', 'Cửa che cụm truyền động không khép kín; chưa có bằng chứng xác nhận đã kiểm tra và nghiệm thu biện pháp khắc phục.'],
          ['NM-L3-06 · D25', 'ST-02', 'Bảo hộ và thao tác', 'Găng tay làm giảm độ linh hoạt khi lắp gioăng; chưa xác định nguyên nhân và giải pháp phù hợp.'],
        ],
      },
      {
        title: 'Bảng 3B: Các dữ kiện giúp kiểm tra biện pháp kiểm soát',
        headers: ['Vị trí / Nguồn', 'Thông tin hiện có', 'Cần xác minh'],
        rows: [
          ['ST-02 · D10', 'Có ghi nhận tạm dừng khi phát hiện nguy cơ tiếp cận điểm kẹp trong lúc xử lý kẹt.', 'Quy trình xử lý kẹt, trạng thái cô lập năng lượng, chức năng che chắn và năng lực người được phép can thiệp.'],
          ['ST-03 · D22', 'Cửa che bộ truyền động không đóng kín; hồ sơ chưa có kết quả nghiệm thu sửa chữa.', 'Tình trạng cơ cấu bảo vệ và quyết định cho phép vận hành; không gắn sự kiện này với dừng tại ST-02 chỉ vì cùng ngày.'],
          ['ST-04 · D13', 'Thông số bố trí tham chiếu: mặt bàn cao 900 mm, mép trên khay linh kiện cao 1.650 mm so với sàn.', 'Đo tầm với, tư thế thực tế và mức phù hợp với nhiều người sử dụng; chưa được kết luận nguyên nhân.'],
        ],
      },
      {
        title: 'Bảng 3C: Dự toán EHS và các lựa chọn phân kỳ (Gói tham chiếu B04 — 140 triệu đồng)',
        subtitle: 'Cơ cấu dự toán bổ sung cho hoạt động mô phỏng; không cộng thêm 140 triệu vào tổng ngân sách chung.',
        headers: ['Hạng mục dự toán', 'Chi phí (Triệu đồng)', 'Nội dung dự kiến / Điều kiện đánh giá'],
        rows: [
          ['E1. Kiểm soát điểm kẹp và che chắn máy', '55', 'Khảo sát, cải tạo bảo vệ tại khu vực có nguy cơ; xác nhận hiệu lực trước khi cho vận hành tương ứng.'],
          ['E2. Phương tiện xử lý kẹt an toàn', '25', 'Dụng cụ hỗ trợ và điều kiện kiểm soát năng lượng khi can thiệp; phối hợp Engineering/Sản xuất.'],
          ['E3. Cải thiện bố trí và tầm với', '30', 'Điều chỉnh vị trí khay/trạm sau khảo sát công thái học; có thể xem xét thực hiện theo giai đoạn nếu kiểm soát tạm thời đủ an toàn.'],
          ['E4. Trang bị bảo hộ phù hợp', '20', 'Khảo sát kích cỡ, thử tính phù hợp thao tác và cấp trang bị cho các vị trí liên quan.'],
          ['E5. Đánh giá, xác nhận kiểm soát an toàn', '10', 'Đánh giá hiện trường, rà soát hướng dẫn xử lý sự cố và xác nhận năng lực theo nhiệm vụ; không trùng đào tạo ca 2 trong ngân sách Nhân sự.'],
          ['TỔNG CỘNG', '140', 'Chi phí mô phỏng trong gói B04; không cộng thêm 140 triệu vào tổng ngân sách chung.'],
        ],
      },
      {
        title: 'Bảng 3D: Thông tin EHS cần phối hợp xác nhận liên phòng',
        headers: ['Phòng', 'Thông tin EHS cần nhận hoặc xác nhận'],
        rows: [
          ['Sản xuất', 'Cách xử lý kẹt, trạng thái máy khi can thiệp, lối đi/vị trí vật tư và kế hoạch mở rộng ca.'],
          ['Engineering', 'Cấu tạo che chắn, cơ chế bảo vệ, thông số trạm ST-04 và tính khả thi của điều chỉnh thiết bị.'],
          ['Nhân sự / QA/QC', 'Năng lực xử lý sự cố, mức phù hợp PPE; tác động của thay đổi thao tác đến kiểm soát chất lượng.'],
          ['Tài chính', 'Giá dự toán, giới hạn ngân sách, hạng mục có thể phân kỳ nếu được EHS xác nhận đủ kiểm soát.'],
        ],
      },
    ],
    deliverables: [
      'Trước M01: Nêu vấn đề ưu tiên, bằng chứng ban đầu và ít nhất một điểm đã đối chiếu với phòng khác.',
      'Trước M02: Hoàn thiện A3 (giả thuyết nguyên nhân, phương án kiểm soát, kiểm chứng hiệu lực, chi phí và điều kiện phối hợp).',
      'Trước M03: Đề xuất hạng mục cần hoàn tất trước vận hành, phương án phân kỳ ngân sách và trách nhiệm xác nhận.',
    ],
  },
  hr: {
    key: 'hr',
    tabLabel: 'Nhân sự HR',
    title: '4. Hồ Sơ Chuyên Môn — Phòng Nhân Sự (HR)',
    matchKeywords: ['nhân sự', 'hr'],
    mission:
      'Đề xuất phương án chuẩn bị nhân lực cho việc mở rộng Line 3: đủ số người, đúng năng lực theo vị trí, đáp ứng thời điểm vận hành và điều kiện tham gia thực tế.',
    metrics: [
      { label: 'Ca 1 hiện hữu', value: 'Định biên 30 CN (16–19 độc lập)' },
      { label: 'Ca 2 cần bổ sung', value: '32 CN & 5 QC' },
      { label: 'Dự báo ngày 56', value: '29 CN & 4 QC (Thiếu 3 CN + 1 QC)' },
      { label: 'Khung giờ đào tạo / Ca 2', value: '17:00–21:00 / Hết ca 22:00' },
    ],
    notes: [
      'Đối chiếu số lượng: 4 vị trí công nhân ban đầu bị ảnh hưởng − 1 vị trí có người thay thế = 3 công nhân còn thiếu; cùng 1 vị trí QC chưa đạt → đúng mức thiếu 3 + 1.',
      'Tách rõ 3 vấn đề khi rà soát: (1) năng lực thực hiện công việc; (2) cơ hội tiếp cận đào tạo/đánh giá; (3) khả năng tham gia lịch ca được xác minh với chính người liên quan. Không suy luận từ giới tính hay tình trạng gia đình.',
    ],
    tables: [
      {
        title: 'Bảng 4A: Nhu cầu và mức độ sẵn sàng nhân lực theo phạm vi ca',
        headers: ['Phạm vi', 'Thông tin đã được cung cấp'],
        rows: [
          ['Ca 1 hiện hữu', 'Định biên tham chiếu 30 công nhân. Trong ngày vận hành thông thường, 16–19 người được ghi nhận làm việc độc lập; mức độ bao phủ kỹ năng theo trạm chưa rõ. Số QC ca 1 chưa xác nhận.'],
          ['Ca 2 cần bổ sung', 'Nhu cầu: 32 công nhân và 5 nhân viên kiểm tra chất lượng (QC).'],
          ['Dự báo ngày 56', 'Dự kiến có 29 công nhân và 4 QC đủ chuẩn → thiếu 3 công nhân và 1 QC.'],
          ['Ca ngoài lịch chuẩn', 'Chưa có kíp, danh sách người và lịch phân công được xác nhận; không mặc định có thể sử dụng nhân lực ca 2 cho các ca này.'],
        ],
      },
      {
        title: 'Bảng 4B: Năm hồ sơ nhân sự cần rà soát (NS-01 – NS-05)',
        subtitle: 'Tình trạng dưới đây là dữ liệu mô phỏng bổ sung, chưa phải kết luận về nguyên nhân.',
        headers: ['Mã / Vị trí', 'Trạng thái tại mốc rà soát', 'Thông tin cần xác minh'],
        rows: [
          ['NS-01 · CN, ST-01', 'Đã học nội dung cơ bản; chưa hoàn thành đánh giá thao tác độc lập.', 'Lịch đánh giá lại; người hướng dẫn và điều kiện thực hành.'],
          ['NS-02 · CN, ST-02', 'Chưa hoàn thành buổi thực hành theo lịch 17:00–21:00; lý do tham gia chưa được xác nhận trực tiếp.', 'Thời gian có thể tham gia; phương án đào tạo thay thế.'],
          ['NS-03 · CN, ST-03', 'Đã dự đánh giá nhưng chưa đạt phần xử lý bất thường tại trạm.', 'Nội dung thiếu, cơ hội bổ sung và thời gian đánh giá lại.'],
          ['NS-04 · CN, ST-04', 'Ứng viên kế hoạch ban đầu không tiếp tục; đã có người thay thế đạt chuẩn trước ngày 56.', 'Xác nhận hồ sơ người thay thế để tránh tính thiếu trùng.'],
          ['NS-05 · QC, ST-03', 'Đã hoàn thành nội dung lý thuyết; chưa được xác nhận thực hiện kiểm tra độc lập.', 'Tiêu chuẩn QC, bài đánh giá thực hành và người có thẩm quyền xác nhận.'],
        ],
      },
      {
        title: 'Bảng 4C: Những thông tin HR cần chủ động trao đổi liên phòng',
        headers: ['Phòng liên quan', 'Cần hỏi / đối chiếu'],
        rows: [
          ['Sản xuất', '32 công nhân được phân bổ theo vị trí/trạm thế nào? Thời điểm cần người? Phương án ca bổ sung yêu cầu bao nhiêu lượt phân công?'],
          ['Chất lượng (QA/QC)', 'Tiêu chí và thẩm quyền xác nhận QC làm việc độc lập là gì? Vị trí QC còn thiếu cần năng lực cụ thể nào?'],
          ['Kỹ thuật (Engineering)', 'Các thay đổi máy, đồ gá hoặc phương pháp vận hành có làm phát sinh yêu cầu đào tạo/đánh giá lại không?'],
          ['EHS', 'Yêu cầu đối với làm việc ca tối, thời gian nghỉ, điều kiện đi lại và các rủi ro của vị trí có được đánh giá chưa?'],
          ['Tài chính', 'Ngân sách đào tạo và hỗ trợ di chuyển hiện là bao nhiêu? Phần nào chịu tác động khi thay đổi lịch hoặc tăng số ca?'],
        ],
      },
    ],
    deliverables: [
      'Trước M01: Một phát hiện có bằng chứng, mức ảnh hưởng và ít nhất một thông tin được yêu cầu xác minh từ phòng khác.',
      'Trước M02: A3 trình bày hiện trạng, mục tiêu, giả thuyết nguyên nhân, lựa chọn biện pháp, kế hoạch thực hiện và cách kiểm chứng.',
      'Trước M03: Phương án bù thiếu nhân lực (phân biệt nhân sự sẵn sàng cho ca 2 với ca bổ sung) và kế hoạch ca đã cập nhật; thông tin chưa xác nhận ghi rõ "Cần xác minh".',
    ],
  },
  finance: {
    key: 'finance',
    tabLabel: 'Tài chính',
    title: '5. Hồ Sơ Chuyên Môn — Phòng Tài Chính (Finance)',
    matchKeywords: ['tài chính', 'kế toán', 'finance'],
    mission:
      'Thẩm định và đề xuất cách phân bổ nguồn lực cho kế hoạch mở rộng Line 3 trong 90 ngày; cân đối chi phí, tiến độ, hiệu quả dự kiến và các điều kiện về chất lượng, an toàn, lao động.',
    metrics: [
      { label: 'Hạn mức 90 ngày', value: '1.710 triệu đồng' },
      { label: 'Danh mục chọn gói A', value: '1.680 triệu đồng' },
      { label: 'Danh mục chọn gói B', value: '1.580 triệu đồng' },
      { label: 'Mô hình B06 (n ≤ 16 ca)', value: '0 (n=0) | 55 + 12,5×n tr' },
    ],
    notes: [
      'A và B là hai lựa chọn thay thế nhau. B07 và B09 không nằm trong giá gói kỹ thuật. B09 chỉ được xem xét hoãn khi Engineering xác nhận rủi ro phù hợp. Khoản B06 chưa chứng minh có đủ kíp vận hành.',
      'Nguyên tắc: Không cắt bỏ biện pháp an toàn, chất lượng hoặc điều kiện lao động bắt buộc để cân đối ngân sách. Chi phí nằm trong hạn mức chưa đồng nghĩa dự án đủ điều kiện triển khai hay đạt mục tiêu sản lượng.',
    ],
    tables: [
      {
        title: 'Bảng 5A: Hạn mức và danh mục chi phí tham chiếu (B01 – B09)',
        subtitle: 'Các khoản dưới đây là dự toán tham chiếu trước khi phát sinh thay đổi; chưa đồng nghĩa với chi phí đã được phê duyệt.',
        headers: ['Mã', 'Hạng mục', 'Triệu đồng'],
        rows: [
          ['B01', 'Gói kỹ thuật A hoặc B', '360 / 260'],
          ['B02', 'Ổn định vận hành', '245'],
          ['B03', 'Đo lường, kiểm soát chất lượng', '220'],
          ['B04', 'An toàn và công thái học', '140'],
          ['B05', 'Đào tạo và hỗ trợ ca 2', '240'],
          ['B06', 'Vận hành tối đa 16 ca bổ sung', '255'],
          ['B07', 'Phụ tùng dự trữ tối thiểu', '80'],
          ['B08', 'Chạy thử, nghiệm thu thay đổi', '90'],
          ['B09', 'Dự trữ phụ tùng mở rộng', '50'],
        ],
      },
      {
        title: 'Bảng 5B: Cấu phần chi phí cần thẩm định chi tiết',
        subtitle: 'B06 áp dụng cho tối đa 16 ca (8 giờ/ca) ngoài lịch 2 ca/ngày trong tháng thứ ba.',
        headers: ['Mã / Tổng', 'Cơ cấu dự toán (Triệu đồng)', 'Giới hạn / Điều kiện'],
        rows: [
          ['B02 · 245', 'Chuẩn bị đổi mã và bố trí dụng cụ 95; tổ chức cung ứng vật tư tại trạm 80; ghi nhận và theo dõi tổn thất 70.', 'Không bao gồm thay đổi đồ gá B01, phụ tùng B07/B09.'],
          ['B03 · 220', 'Thiết bị đo và hiệu chuẩn thường kỳ 110; kiểm tra mẫu đầu và theo dõi đặc tính trọng yếu 70; ghi nhận và truy xuất chất lượng 40.', 'Khác với thử nghiệm/nghiệm thu thay đổi tại B08.'],
          ['B05 · 240', 'Đào tạo và xác nhận năng lực công nhân 135; đào tạo/đánh giá QC 45; hỗ trợ di chuyển ca 2 trong kỳ triển khai 60.', 'Cần kế hoạch nhân sự được xác nhận; không tính hỗ trợ ca bổ sung trong B06.'],
          ['B06 · 255', 'Chuẩn bị tổ chức ca bổ sung 55 (chỉ khi thực hiện); chi phí theo ca 12,5 × tối đa 16 ca = 200.', 'Tính theo số ca thực tế dự kiến; cần kíp, QC và giờ chạy được chấp thuận.'],
        ],
      },
      {
        title: 'Bảng 5C: Thông tin cần đề nghị cung cấp từ các phòng ban để thẩm định',
        headers: ['Đầu mối', 'Thông tin cần đề nghị cung cấp', 'Ý nghĩa thẩm định'],
        rows: [
          ['Sản xuất', 'Số giờ chạy cần bổ sung, mức tổn thất và phương án ca.', 'Đánh giá B02, B06 và năng lực dự kiến.'],
          ['Engineering', 'Phạm vi A/B, thời gian chuẩn bị, kế hoạch thử và điều kiện hoãn B09.', 'Đánh giá mức phù hợp, tiến độ và rủi ro B01.'],
          ['QA/QC', 'Khối lượng làm lại, sản phẩm loại, yêu cầu kiểm tra và xác nhận sau thay đổi.', 'Kiểm tra nhu cầu B03/B08; không suy ra tiền tiết kiệm khi thiếu đơn giá.'],
          ['Nhân sự', 'Tiến độ nhân lực ca 2, kíp ca bổ sung, yêu cầu đào tạo và điều kiện tham gia.', 'Xác minh hiệu quả sử dụng B05/B06.'],
          ['EHS', 'Điều kiện kiểm soát mối nguy và thứ tự triển khai hạng mục an toàn.', 'Xác định phạm vi bắt buộc/có thể phân kỳ B04.'],
        ],
      },
    ],
    deliverables: [
      'Trước M01: Nêu một rủi ro hoặc vấn đề sử dụng ngân sách có bằng chứng; đối chiếu ít nhất một thông tin liên phòng.',
      'Trước M02: Hoàn thành A3 7 bước về một quyết định tài chính cụ thể; trình bày các phương án cùng điều kiện phê duyệt (ghi "Cần xác minh" nếu thiếu dữ liệu).',
      'Trước M03: Danh mục ngân sách đề xuất có căn cứ (phương án chọn, thứ tự ưu tiên, khoản hoãn có điều kiện, người xác nhận, tổng chi & phần dư/thiếu).',
    ],
  },
  rnd: {
    key: 'rnd',
    tabLabel: 'R&D / Kỹ thuật',
    title: '6. Hồ Sơ Chuyên Môn — Phòng Nghiên Cứu & Kỹ Thuật (R&D / Engineering)',
    matchKeywords: ['nghiên cứu', 'kỹ thuật', 'r&d', 'rd', 'engineering'],
    mission:
      'Tối ưu thông số kỹ thuật khuôn mẫu, độ tương thích vật liệu mới và đánh giá 2 gói giải pháp nâng cấp thiết bị A/B trên Line 3.',
    metrics: [
      { label: 'Thời gian đổi khuôn chuẩn', value: '78 phút / lần (16 bu-lông)' },
      { label: 'Độ co ngót vật liệu mới', value: 'Lệch 0,15% so với chuẩn cũ' },
      { label: 'Gói kỹ thuật A', value: '360 triệu · 35 ngày triển khai' },
      { label: 'Gói kỹ thuật B', value: '260 triệu · 20 ngày triển khai' },
    ],
    tables: [
      {
        title: 'Bảng 6A: So sánh thông số kỹ thuật 2 gói cải tiến thiết bị Trạm ST-02 (B01)',
        headers: ['Tiêu chí', 'Gói A (Tự động hóa toàn phần)', 'Gói B (Cơ cấu kẹp nhanh bán tự động)'],
        rows: [
          ['Chi phí đầu tư (B01)', '360 triệu đồng (Chưa gồm B07/B09)', '260 triệu đồng (Chưa gồm B07/B09)'],
          ['Thời gian lắp đặt & dừng máy', '35 ngày', '20 ngày'],
          ['Thời gian đổi khuôn sau cải tiến', '12 phút / lần', '22 phút / lần'],
          ['Yêu cầu trình độ vận hành', 'Cần kỹ sư chuyên trách lập trình', 'Công nhân hiện tại thao tác được sau 2 ngày đào tạo'],
          ['Điều kiện phụ tùng dự trữ', 'Bắt buộc có gói B07 + B09', 'Có thể xem xét hoãn B09 nếu xác nhận rủi ro phù hợp'],
        ],
      },
    ],
    deliverables: [
      'Lựa chọn phương án kỹ thuật A hoặc B phù hợp với tiến độ 90 ngày, điều kiện nhân sự và xác nhận điều kiện hoãn B09.',
      'Phối hợp EHS về cấu tạo che chắn, cơ chế bảo vệ, thông số trạm ST-04 và hiệu chỉnh thông số vật liệu mới.',
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
      if (!canSee) return false

      const deptName = (
        depts.find((x) => x.id === d.department_id)?.name ?? ''
      ).toLowerCase()
      const fileLabel = `${d.title ?? ''} ${d.file_name ?? ''}`.toLowerCase()

      return brief.matchKeywords.some(
        (kw) => deptName.includes(kw) || fileLabel.includes(kw)
      )
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

            {/* Khung Tệp dữ liệu gốc đính kèm của phòng ban (luôn hiển thị rõ) */}
            <div className="space-y-2.5 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-extrabold uppercase tracking-wide text-teal-900">
                  Tệp dữ liệu gốc đính kèm ({brief.tabLabel})
                </div>
                {isAdmin && (
                  <Link
                    to="/documents"
                    className="text-[11px] font-bold text-teal-700 hover:underline"
                  >
                    + Tải thêm file gốc lên Kho tài liệu →
                  </Link>
                )}
              </div>

              {fileError && <p className="text-xs font-semibold text-red-700">{fileError}</p>}

              {deptFiles.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {deptFiles.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2.5 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText size={16} className="shrink-0 text-teal-600" />
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900">{doc.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {doc.file_name} · {fmtSize(doc.size_bytes)}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {canPreview(doc.file_name) && (
                          <button
                            type="button"
                            onClick={() => void openOriginalFile(doc.storage_path, doc.file_name, true)}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink size={11} /> Mở
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void openOriginalFile(doc.storage_path, doc.file_name, false)}
                          className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          <Download size={11} /> Tải về
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  {docsQuery.isLoading
                    ? 'Đang kiểm tra tệp gốc trên hệ thống…'
                    : 'Chưa có tệp gốc được gắn cho phòng ban này (hoặc bạn chưa có quyền truy cập phòng này).'}
                </p>
              )}
            </div>

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

            {brief.notes && brief.notes.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs leading-relaxed text-slate-800">
                <div className="font-extrabold uppercase tracking-wide text-amber-900">
                  Quy tắc & Lưu ý dữ liệu của phòng ban
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {brief.notes.map((n, idx) => (
                    <li key={idx}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            {brief.tables.map((tbl) => (
              <div key={tbl.title} className="space-y-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{tbl.title}</h3>
                  {tbl.subtitle && <p className="mt-0.5 text-xs text-slate-500">{tbl.subtitle}</p>}
                </div>
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
                Yêu cầu đầu ra & Các mốc bàn giao (M01 – M03)
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