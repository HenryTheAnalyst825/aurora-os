// Hàm thuần (không gọi mạng) để dễ kiểm thử
export const MAX_MB = 25

export const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}
export const ACCEPT = Object.keys(MIME).map((e) => `.${e}`).join(',')
const PREVIEW = new Set(['pdf', 'png', 'jpg', 'jpeg', 'txt'])

export const ext = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')
export const canPreview = (name: string | null) => !!name && PREVIEW.has(ext(name))
export const stripExt = (name: string) => (name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name)

// Tên file an toàn cho khóa Storage: bỏ dấu tiếng Việt, ký tự lạ thành "_"
export const safeName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w.-]+/g, '_').slice(-100) || 'file'

export function checkFile(f: { name: string; size: number }): string | null {
  if (!MIME[ext(f.name)]) return 'Định dạng không được hỗ trợ'
  if (f.size === 0) return 'File rỗng'
  if (f.size > MAX_MB * 1e6) return `Vượt quá ${MAX_MB} MB`
  return null
}

export const fmtSize = (b: number | null) => (b == null ? '' : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)

// Tìm kiếm không phân biệt hoa thường và dấu
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd')
