import { Factory, FlaskConical, HardHat, Receipt, Ruler, UserCheck, type LucideIcon } from 'lucide-react'
import type { GameKey } from './types'

export type GameMeta = {
  key: GameKey
  dept: string // tên phòng ban (khớp bảng departments)
  title: string
  blurb: string
  icon: LucideIcon
  mode: 'binary' | 'production' | 'rnd'
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
]

export const GAME_BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g])) as Record<GameKey, GameMeta>
