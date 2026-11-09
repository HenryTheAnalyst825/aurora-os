export type GameKey = 'accounting' | 'qc' | 'hr' | 'ehs' | 'production' | 'rnd'

export type Row = { label: string; value: string }
export type Section = { title: string; rows: Row[] }

// Game duyệt hồ sơ: đúng/sai theo quy chuẩn bên trái
export type BinaryCase = {
  kind: 'binary'
  reference: Section[]
  document: Section[]
  valid: boolean // true = hồ sơ hợp lệ (nên duyệt / pass / tuyển / an toàn)
  reason: string // lý do hiển thị sau khi quyết định
  facts?: Record<string, unknown> // số liệu gốc, dùng để kiểm thử bộ sinh hồ sơ
}

export type Machine = { name: string; perHour: number; kgPerHour: number }
export type ProductionCase = {
  kind: 'production'
  reference: Section[]
  machines: Machine[]
  maxHours: number
  target: number // KPI sản lượng tối thiểu
  stock: number // nguyên vật liệu tối đa (kg)
  solution: number[] // một phương án đạt (để kiểm thử)
}

export type Ingredient = { name: string; strength: number; cost: number }
export type RndCase = {
  kind: 'rnd'
  reference: Section[]
  ingredients: Ingredient[]
  target: number // độ bền mục tiêu (MPa)
  tolerance: number
  budget: number // chi phí tối đa (đồng/kg)
  solution: number[] // tỷ lệ % một phương án đạt (để kiểm thử)
}

export type Case = BinaryCase | ProductionCase | RndCase

export type FinishResult = {
  score: number
  correct: number
  wrong: number
  credits: number
  progress_bonus: number
  capped: boolean
}
