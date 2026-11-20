import {
  AlertTriangle,
  Compass,
  Eye,
  Factory,
  FlaskConical,
  Grid3X3,
  HardHat,
  HelpCircle,
  Lock,
  Receipt,
  Ruler,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import type { GameKey } from './types'

export type GameMeta = {
  key: GameKey
  dept: string // tên phòng ban (khớp bảng departments)
  title: string
  blurb: string
  icon: LucideIcon
  mode: 'binary' | 'production' | 'rnd' | 'scenario'
  approveLabel?: string
  rejectLabel?: string
  leftTitle: string
  rightTitle: string
  rules: string[]
}

export const GAMES: GameMeta[] = [
  {
    key: 'accounting', dept: 'Tài chính', title: 'Giả lập Kế toán - Duyệt Hóa Đơn', icon: Receipt, mode: 'binary',
    blurb: 'Đối chiếu hóa đơn với đơn đặt hàng PO: mã đơn, đơn giá, số lượng, VAT và tổng tiền.',
    approveLabel: 'Đóng dấu Duyệt', rejectLabel: 'Từ chối', leftTitle: 'Đơn gốc và quy tắc', rightTitle: 'Hóa đơn cần duyệt',
    rules: ['So hóa đơn với PO ở bên trái.', 'Kiểm tra thành tiền, VAT 10% và tổng cộng.', 'Hóa đơn đúng hoàn toàn thì Duyệt, có một chỗ sai thì Từ chối.'],
  },
  {
    key: 'qc', dept: 'QC', title: 'Giả lập Kiểm định QC', icon: Ruler, mode: 'binary',
    blurb: 'So thông số đo thực tế của sản phẩm trên băng chuyền với bảng tiêu chuẩn và dung sai.',
    approveLabel: 'Pass', rejectLabel: 'Reject', leftTitle: 'Bảng tiêu chuẩn kỹ thuật', rightTitle: 'Sản phẩm trên băng chuyền',
    rules: ['Tìm đúng dòng tiêu chuẩn theo mã sản phẩm.', 'Mọi thông số phải nằm trong dung sai (kể cả giá trị sát biên).', 'Một thông số ngoài dung sai là Reject.'],
  },
  {
    key: 'hr', dept: 'HR', title: 'Giả lập Tuyển dụng HR', icon: UserCheck, mode: 'binary',
    blurb: 'Đối chiếu tiêu chí tuyển dụng của nhà máy với hồ sơ ứng viên.',
    approveLabel: 'Tuyển', rejectLabel: 'Loại', leftTitle: 'Tiêu chí tuyển dụng', rightTitle: 'Hồ sơ ứng viên',
    rules: ['Đối chiếu trình độ, kinh nghiệm, chứng chỉ còn hạn, kỹ năng và ca làm việc.', 'Thiếu bất kỳ tiêu chí nào thì Loại.', 'Chỉ xét tiêu chí liên quan công việc.'],
  },
  {
    key: 'ehs', dept: 'EHS', title: 'Thanh tra An toàn EHS', icon: HardHat, mode: 'binary',
    blurb: 'Đọc báo cáo hiện trường và phát hiện vi phạm quy tắc an toàn lao động.',
    approveLabel: 'An toàn', rejectLabel: 'Đình chỉ xử lý', leftTitle: 'Quy tắc an toàn lao động', rightTitle: 'Báo cáo hiện trường',
    rules: ['Đọc kỹ các con số trong báo cáo (tải, tốc độ, khoảng cách, lượng hóa chất).', 'Có một vi phạm nhỏ cũng phải Đình chỉ xử lý.', 'Không vi phạm thì chọn An toàn.'],
  },
  {
    key: 'production', dept: 'Sản xuất', title: 'Điều phối Dây chuyền', icon: Factory, mode: 'production',
    blurb: 'Phân bổ giờ chạy máy và nguyên vật liệu để đạt KPI sản lượng.',
    leftTitle: 'Sổ tay điều phối', rightTitle: 'Bảng phân bổ giờ chạy máy',
    rules: ['Chọn số giờ chạy cho từng máy (tối đa 8 giờ).', 'Sản lượng phải đạt KPI và nguyên vật liệu không vượt kho.', 'Máy có sp/kg cao dùng nguyên liệu hiệu quả hơn. Bấm Bỏ qua nếu bí (không mất điểm).'],
  },
  {
    key: 'rnd', dept: 'R&D', title: 'Thử nghiệm Công thức', icon: FlaskConical, mode: 'rnd',
    blurb: 'Chọn tỷ lệ phối trộn nguyên liệu để đạt độ bền mục tiêu mà không vượt chi phí.',
    leftTitle: 'Yêu cầu công thức', rightTitle: 'Bàn pha trộn',
    rules: ['Chọn tỷ lệ % cho hai nguyên liệu đầu, nguyên liệu thứ ba tự lấy phần còn lại.', 'Độ bền phải trong sai số cho phép và chi phí không vượt trần.', 'Bấm Bỏ qua nếu bí (không mất điểm).'],
  },

  // --- 6 MINI-GAME TÌNH HUỐNG VẬN HÀNH & RA QUYẾT ĐỊNH THỰC TẾ ---
  {
    key: 'audit_bingo', dept: 'EHS', title: 'Audit Bingo: Rà Soát Chốt Chặn', icon: Grid3X3, mode: 'scenario',
    blurb: 'Thẩm định bằng chứng thực tế trên lưới 3x3 để phát hiện lỗ hổng quy trình và an toàn ẩn.',
    leftTitle: 'Bảng kiểm toán 3x3', rightTitle: 'Bằng chứng hiện trường',
    rules: [
      'Bấm chọn từng ô trong 9 hạng mục vận hành để đọc bằng chứng ghi nhận tại xưởng.',
      'Phân loại chính xác đâu là Chốt chặn Đạt chuẩn và đâu là Rủi ro ẩn.',
      'Hoàn thành toàn bộ 9 ô để tổng kết điểm và nhận Aurora Credits.',
    ],
  },
  {
    key: 'hr_escape', dept: 'HR', title: 'HR Escape Room: Giải Mã Hồ Sơ', icon: Lock, mode: 'scenario',
    blurb: 'Phá giải 5 tình huống lương thưởng, thăng chức và tuyển dụng để tìm mật mã mở khóa.',
    leftTitle: 'Hồ sơ nhân sự mật', rightTitle: 'Bảng nhập mật mã 5 số',
    rules: [
      'Phân tích dữ kiện trong từng hồ sơ nhân sự để phát hiện bất cập và tìm ra con số mật mã.',
      'Giải đúng lần lượt 5 hồ sơ để mở khóa toàn bộ 5 chữ số thoát phòng.',
    ],
  },
  {
    key: 'assumption_alert', dept: 'HR', title: 'Assumption Alert: Bắt Lỗi Giả Định', icon: AlertTriangle, mode: 'scenario',
    blurb: 'Nhận diện các giả định cảm tính và định kiến ngầm trong giao tiếp công việc hàng ngày.',
    leftTitle: 'Bối cảnh giao tiếp', rightTitle: 'Phân loại phát ngôn',
    rules: [
      'Đọc kỹ từng phát ngôn trong cuộc họp và trao đổi công việc hàng ngày.',
      'Bấm "Bắt lỗi Giả định / Định kiến" nếu phát ngôn mang tính chủ quan, hoặc xác nhận "Giao tiếp Khách quan".',
    ],
  },
  {
    key: 'meeting_observer', dept: 'Sản xuất', title: 'Meeting Observer: Điểm Mù Cuộc Họp', icon: Eye, mode: 'scenario',
    blurb: 'Quan sát diễn biến cuộc họp dự án và chỉ ra các điểm nghẽn phối hợp liên phòng ban.',
    leftTitle: 'Diễn biến cuộc họp', rightTitle: 'Đánh giá điều phối',
    rules: [
      'Theo dõi từng tình huống diễn ra xuyên suốt cuộc họp dự án.',
      'Chọn đúng hành vi đang làm giảm hiệu quả hoặc xác nhận cách điều phối minh bạch.',
    ],
  },
  {
    key: 'leadership_90d', dept: 'Tài chính', title: '90-Day Plant Leader: Điều Hành 90 Ngày', icon: Compass, mode: 'scenario',
    blurb: 'Cân bằng 3 chỉ số Hiệu suất – An toàn – Gắn kết qua 3 chặng điều hành nhà máy.',
    leftTitle: 'Bảng chỉ số KPI nhà máy', rightTitle: 'Quyết định điều hành',
    rules: [
      'Đưa ra quyết định quản trị qua 3 giai đoạn: Ngày 1–30, Ngày 31–60 và Ngày 61–90.',
      'Giữ cho cả 3 chỉ số Hiệu suất, An toàn & Chất lượng, và Gắn kết nhân sự tăng trưởng bền vững.',
    ],
  },
  {
    key: 'myth_fact', dept: 'QC', title: 'Myth or Fact: Lầm Tưởng Hay Sự Thật?', icon: HelpCircle, mode: 'scenario',
    blurb: 'Phân loại nhanh các nhận định phổ biến về năng suất, an toàn và quản trị vận hành.',
    leftTitle: 'Nhận định thực tế', rightTitle: 'Kiểm chứng dữ liệu',
    rules: [
      'Đọc nhanh từng nhận định về vận hành sản xuất và quản trị con người.',
      'Chọn Lầm tưởng (Myth) hoặc Sự thật (Fact) và xem giải thích dựa trên dữ liệu thực tế.',
    ],
  },
]

export const GAME_BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g])) as Record<GameKey, GameMeta>