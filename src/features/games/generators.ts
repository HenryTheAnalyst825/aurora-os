import { chance, int, pick, type Rng } from './rng'
import type { BinaryCase, Case, GameKey, ProductionCase, RndCase, Section } from './types'

export const FLAW_RATE = 0.4 // khoảng 40% hồ sơ bị sai lệch
const vnd = (n: number) => n.toLocaleString('vi-VN') + ' ₫'
const dec = (x: number, d: number) => x.toFixed(d).replace('.', ',')
const sec = (title: string, rows: [string, string][]): Section => ({ title, rows: rows.map(([label, value]) => ({ label, value })) })

// ---------- 1. Kế toán: duyệt hóa đơn ----------
const ITEMS = [
  ['Thép tấm SS400 (kg)', 18500], ['Bu lông M10 (cái)', 1200], ['Dầu bôi trơn (lít)', 85000],
  ['Vòng bi 6204 (cái)', 42000], ['Găng tay bảo hộ (đôi)', 15000], ['Nhựa ABS (kg)', 38000],
] as const
const SUPPLIERS = ['Công ty TNHH Thép Đại Phát', 'Công ty CP Cơ khí Minh An', 'Công ty TNHH Vật tư Hòa Bình', 'Công ty CP Bao bì Tân Tiến']

function accounting(r: Rng): BinaryCase {
  const valid = !chance(r, FLAW_RATE)
  const [item, price] = pick(r, ITEMS)
  const supplier = pick(r, SUPPLIERS)
  const poNo = int(r, 1000, 9999)
  const qty = int(r, 10, 500)
  let invPo = poNo, invPrice: number = price, invQty = qty
  let reason = 'Hóa đơn khớp PO và tính toán đúng.'
  const flaw = valid ? null : pick(r, ['code', 'price', 'qty', 'vat', 'total'] as const)
  if (flaw === 'code') {
    invPo = poNo % 10 === 9 ? poNo - 1 : poNo + 1
    reason = `Mã đơn hàng trên hóa đơn (PO-2026-${invPo}) không khớp PO (PO-2026-${poNo}).`
  } else if (flaw === 'price') {
    const d = Math.max(100, Math.round((price * 0.04) / 100) * 100)
    invPrice = price + (chance(r, 0.5) ? d : -d)
    reason = `Đơn giá trên hóa đơn (${vnd(invPrice)}) khác PO (${vnd(price)}).`
  } else if (flaw === 'qty') {
    invQty = qty + pick(r, [-5, -2, -1, 1, 2, 5])
    reason = `Số lượng trên hóa đơn (${invQty}) khác PO (${qty}).`
  }
  const sub = invPrice * invQty
  let vat = Math.round(sub * 0.1)
  let total = sub + vat
  if (flaw === 'vat') {
    vat = Math.round(sub * pick(r, [0.08, 0.12]))
    total = sub + vat
    reason = `VAT ghi ${vnd(vat)}, nhưng 10% của ${vnd(sub)} là ${vnd(Math.round(sub * 0.1))}.`
  } else if (flaw === 'total') {
    total = sub + vat + pick(r, [-10000, -1000, 1000, 10000])
    reason = `Tổng cộng ghi ${vnd(total)}, nhưng thành tiền + VAT = ${vnd(sub + vat)}.`
  }
  return {
    kind: 'binary', valid, reason,
    reference: [
      sec('Đơn đặt hàng (PO)', [
        ['Mã đơn hàng', `PO-2026-${poNo}`], ['Nhà cung cấp', supplier], ['Mặt hàng', item],
        ['Đơn giá', vnd(price)], ['Số lượng', String(qty)], ['Thuế suất VAT', '10%'],
      ]),
      sec('Quy tắc duyệt', [
        ['1', 'Mã đơn hàng, đơn giá, số lượng phải khớp PO.'], ['2', 'Thành tiền = đơn giá × số lượng.'],
        ['3', 'Thuế VAT = 10% thành tiền.'], ['4', 'Tổng cộng = thành tiền + VAT.'],
      ]),
    ],
    document: [
      sec('Hóa đơn của nhà cung cấp', [
        ['Mã đơn hàng', `PO-2026-${invPo}`], ['Nhà cung cấp', supplier], ['Mặt hàng', item],
        ['Đơn giá', vnd(invPrice)], ['Số lượng', String(invQty)], ['Thành tiền', vnd(sub)],
        ['Thuế VAT', vnd(vat)], ['Tổng cộng', vnd(total)],
      ]),
    ],
    facts: { poNo, invPo, price, invPrice, qty, invQty, sub, vat, total },
  }
}

// ---------- 2. QC: kiểm định theo dung sai ----------
// Giá trị lưu dạng số nguyên theo bậc (nomI = giá trị danh định × 10^dec) để tránh sai số số thực
type Param = readonly [name: string, nomI: number, tolI: number, dec: number]
const PRODUCTS: { code: string; name: string; params: readonly Param[] }[] = [
  { code: 'TR-20', name: 'Trục thép Φ20', params: [['Đường kính (mm)', 2000, 5, 2], ['Chiều dài (mm)', 1500, 5, 1], ['Khối lượng (g)', 370, 10, 0], ['Độ cứng (HRC)', 475, 25, 1]] },
  { code: 'DE-80', name: 'Đế nhôm 80×80', params: [['Chiều rộng (mm)', 8000, 10, 2], ['Độ dày (mm)', 1500, 20, 2], ['Khối lượng (g)', 259, 6, 0]] },
  { code: 'BL-12', name: 'Bu lông M12×60', params: [['Đường kính thân (mm)', 1200, 10, 2], ['Chiều dài (mm)', 600, 5, 1], ['Khối lượng (g)', 52, 2, 0]] },
]
const fromI = (i: number, d: number) => dec(i / 10 ** d, d)

function qc(r: Rng): BinaryCase {
  const valid = !chance(r, FLAW_RATE)
  const p = pick(r, PRODUCTS)
  const bad = valid ? -1 : int(r, 0, p.params.length - 1)
  let reason = 'Mọi thông số nằm trong dung sai.'
  const offs: number[] = []
  const rows: [string, string][] = [['Mã sản phẩm', p.code], ['Số lô', `LOT-${int(r, 100, 999)}`]]
  p.params.forEach(([name, nomI, tolI, d], k) => {
    let off: number
    if (k === bad) {
      off = (tolI + int(r, 1, Math.max(1, Math.round(tolI * 0.4)))) * (chance(r, 0.5) ? 1 : -1)
      reason = `${name} đo được ${fromI(nomI + off, d)}, ngoài khoảng ${fromI(nomI - tolI, d)} đến ${fromI(nomI + tolI, d)}.`
    } else {
      const lim = Math.floor(tolI * 0.95)
      off = int(r, -lim, lim)
    }
    offs.push(off)
    rows.push([name, fromI(nomI + off, d)])
  })
  return {
    kind: 'binary', valid, reason,
    reference: PRODUCTS.map((q) =>
      sec(`${q.code} · ${q.name}`, q.params.map(([name, nomI, tolI, d]) => [name, `${fromI(nomI, d)} ± ${fromI(tolI, d)}`] as [string, string])),
    ),
    document: [sec('Sản phẩm trên băng chuyền', rows)],
    facts: { code: p.code, offs, tols: p.params.map((x) => x[2]) },
  }
}

// ---------- 3. HR: đối chiếu tiêu chí tuyển dụng ----------
// Chỉ xét tiêu chí liên quan công việc (không xét giới tính, tuổi, nơi sinh)
const EDU = ['Sơ cấp', 'Trung cấp', 'Cao đẳng', 'Đại học']
const POSITIONS = [
  { title: 'Vận hành máy CNC', edu: 1, years: 2, cert: 'Chứng chỉ An toàn lao động', skills: ['Đọc bản vẽ kỹ thuật', 'Vận hành máy CNC'], shift: 'Ca xoay' },
  { title: 'Kỹ thuật viên QC', edu: 2, years: 1, cert: 'Chứng chỉ ISO 9001 nội bộ', skills: ['Dùng thước kẹp/panme', 'Lập báo cáo chất lượng'], shift: 'Ca xoay' },
  { title: 'Kế toán kho', edu: 2, years: 1, cert: 'Chứng chỉ Kế toán viên', skills: ['Excel nâng cao', 'Quản lý tồn kho'], shift: 'Giờ hành chính' },
] as const
const EXTRA = ['Làm việc nhóm', 'Tiếng Anh cơ bản', '5S', 'Đọc hiểu quy trình', 'Lập kế hoạch ca']
const NAMES = ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thu Dung', 'Võ Minh Đức', 'Đặng Ngọc Hà', 'Bùi Quang Huy', 'Hoàng Thị Lan']
const REVIEW_IDX = 2026 * 12 + 12 // ngày xét hồ sơ: 01/12/2026 (chỉ số tháng = năm × 12 + tháng)
const monthText = (idx: number) => `${String(((idx - 1) % 12) + 1).padStart(2, '0')}/${Math.floor((idx - 1) / 12)}`

function hr(r: Rng): BinaryCase {
  const valid = !chance(r, FLAW_RATE)
  const pos = pick(r, POSITIONS)
  const flaw = valid ? null : pick(r, ['edu', 'years', 'cert', 'skill', 'shift'] as const)
  let reason = 'Hồ sơ đáp ứng đủ mọi tiêu chí.'
  let eduIdx = Math.min(3, pos.edu + pick(r, [0, 0, 1]))
  let years = pos.years + pick(r, [0, 0.5, 1, 1.5, 3])
  let expIdx = 2027 * 12 + int(r, 1, 18)
  let skills: string[] = [...pos.skills]
  let avail = pick(r, [pos.shift, 'Linh hoạt cả hai'])
  if (flaw === 'edu') {
    eduIdx = pos.edu - 1
    reason = `Trình độ ${EDU[eduIdx]}, thấp hơn yêu cầu tối thiểu ${EDU[pos.edu]}.`
  } else if (flaw === 'years') {
    years = pos.years - (pos.years === 1 ? 0.5 : pick(r, [0.5, 1]))
    reason = `Kinh nghiệm ${dec(years, 1)} năm, chưa đạt tối thiểu ${pos.years} năm.`
  } else if (flaw === 'cert') {
    expIdx = 2026 * 12 + int(r, 8, 11)
    reason = `${pos.cert} đã hết hạn từ ${monthText(expIdx)}, trước ngày xét 01/12/2026.`
  } else if (flaw === 'skill') {
    const miss = int(r, 0, 1)
    reason = `Thiếu kỹ năng bắt buộc: ${pos.skills[miss]}.`
    skills[miss] = pick(r, EXTRA)
  } else if (flaw === 'shift') {
    avail = pos.shift === 'Ca xoay' ? 'Chỉ giờ hành chính' : 'Chỉ ca xoay'
    reason = `Ứng viên ${avail.toLowerCase()}, vị trí yêu cầu ${pos.shift.toLowerCase()}.`
  }
  skills = [...skills, ...[...EXTRA].sort(() => r() - 0.5).slice(0, int(r, 1, 2))].filter((s, i, a) => a.indexOf(s) === i)
  return {
    kind: 'binary', valid, reason,
    reference: [
      sec(`Tiêu chí tuyển: ${pos.title}`, [
        ['Trình độ tối thiểu', EDU[pos.edu]], ['Kinh nghiệm tối thiểu', `${pos.years} năm`],
        ['Chứng chỉ bắt buộc', `${pos.cert}, còn hạn tại ngày xét`], ['Kỹ năng bắt buộc', pos.skills.join('; ')],
        ['Ca làm việc', pos.shift],
      ]),
      sec('Lưu ý', [['Ngày xét hồ sơ', '01/12/2026'], ['Nguyên tắc', 'Chỉ xét tiêu chí liên quan công việc; không xét giới tính, tuổi, nơi sinh.']]),
    ],
    document: [
      sec('Hồ sơ ứng viên', [
        ['Họ tên', pick(r, NAMES)], ['Vị trí ứng tuyển', pos.title], ['Trình độ', EDU[eduIdx]],
        ['Kinh nghiệm', `${dec(years, 1)} năm`], ['Chứng chỉ', `${pos.cert}, hết hạn ${monthText(expIdx)}`],
        ['Kỹ năng', skills.join('; ')], ['Khả năng làm ca', avail],
      ]),
    ],
    facts: { eduIdx, minEdu: pos.edu, years, minYears: pos.years, expIdx, reviewIdx: REVIEW_IDX, skills, reqSkills: [...pos.skills], avail, reqShift: pos.shift },
  }
}

// ---------- 4. EHS: thanh tra an toàn ----------
const RULES = [
  'Máy dập/ép: bắt buộc kính bảo hộ và găng tay chống cắt.',
  'Khu vực hàn: có mặt nạ hàn; vật liệu dễ cháy cách vị trí hàn tối thiểu 5 m.',
  'Xe nâng: tải tối đa 2,0 tấn; tốc độ tối đa 10 km/h trong xưởng.',
  'Lối thoát hiểm: rộng tối thiểu 1,2 m và không có vật cản.',
  'Tủ điện: luôn đóng khóa; khi bảo trì phải có biển cảnh báo và khóa nguồn.',
  'Hóa chất: có nhãn, đặt trong khay chống tràn, tối đa 50 lít mỗi khu vực.',
]
type Finding = { text: string; why: string }
const EHS: { zone: (r: Rng) => string; ok: (r: Rng) => string; bad: (r: Rng) => Finding }[] = [
  {
    zone: (r) => `Xưởng dập, khu B, máy số ${int(r, 1, 6)}`,
    ok: () => 'Công nhân vận hành đang đeo kính bảo hộ và găng tay chống cắt.',
    bad: (r) => (chance(r, 0.5)
      ? { text: 'Công nhân vận hành chỉ đeo găng tay chống cắt.', why: 'Thiếu kính bảo hộ (quy tắc máy dập/ép).' }
      : { text: 'Công nhân vận hành đeo kính bảo hộ, tay không găng khi đưa phôi vào.', why: 'Thiếu găng tay chống cắt (quy tắc máy dập/ép).' }),
  },
  {
    zone: (r) => `Xưởng ${int(r, 1, 4)}, khu hàn`,
    ok: (r) => `Thợ hàn dùng mặt nạ hàn; vật liệu dễ cháy gần nhất cách vị trí hàn ${int(r, 5, 9)} m.`,
    bad: (r) => (chance(r, 0.5)
      ? (() => { const m = int(r, 2, 4); return { text: `Thợ hàn dùng mặt nạ hàn; vật liệu dễ cháy gần nhất cách vị trí hàn ${m} m.`, why: `Vật liệu dễ cháy cách ${m} m, dưới mức tối thiểu 5 m.` } })()
      : { text: 'Thợ hàn làm việc không dùng mặt nạ hàn; vật liệu dễ cháy cách vị trí hàn 7 m.', why: 'Không dùng mặt nạ hàn.' }),
  },
  {
    zone: (r) => `Kho thành phẩm, xe nâng số ${int(r, 1, 5)}`,
    ok: (r) => `Xe nâng chở ${dec(pick(r, [1.4, 1.6, 1.8, 2.0]), 1)} tấn, chạy ${int(r, 5, 10)} km/h trong xưởng.`,
    bad: (r) => (chance(r, 0.5)
      ? (() => { const w = pick(r, [2.1, 2.2, 2.4, 2.6]); return { text: `Xe nâng chở ${dec(w, 1)} tấn, chạy ${int(r, 5, 10)} km/h trong xưởng.`, why: `Tải ${dec(w, 1)} tấn vượt mức tối đa 2,0 tấn.` } })()
      : (() => { const v = pick(r, [12, 14, 15]); return { text: `Xe nâng chở ${dec(pick(r, [1.4, 1.6, 1.8]), 1)} tấn, chạy ${v} km/h trong xưởng.`, why: `Tốc độ ${v} km/h vượt mức tối đa 10 km/h.` } })()),
  },
  {
    zone: () => 'Xưởng lắp ráp, lối thoát hiểm khu C',
    ok: (r) => `Lối thoát hiểm thông thoáng, rộng ${dec(pick(r, [1.2, 1.3, 1.4, 1.5]), 1)} m, biển báo sáng.`,
    bad: (r) => { const w = pick(r, [0.8, 0.9, 1.0, 1.1]); return { text: `Lối thoát hiểm có pallet xếp bên cạnh, lối đi còn rộng ${dec(w, 1)} m, biển báo sáng.`, why: `Lối thoát hiểm chỉ rộng ${dec(w, 1)} m, dưới mức tối thiểu 1,2 m.` } },
  },
  {
    zone: (r) => `Phòng điện, tủ TĐ-${int(r, 1, 9)}`,
    ok: (r) => (chance(r, 0.5) ? 'Tủ điện đóng khóa, không có người thao tác.' : 'Tủ điện đang bảo trì: có biển cảnh báo và đã khóa nguồn.'),
    bad: (r) => (chance(r, 0.5)
      ? { text: 'Tủ điện đang mở nắp để bảo trì, chưa có biển cảnh báo.', why: 'Bảo trì nhưng không có biển cảnh báo.' }
      : { text: 'Tủ điện đang bảo trì, có biển cảnh báo nhưng chưa khóa nguồn.', why: 'Bảo trì nhưng chưa khóa nguồn.' }),
  },
  {
    zone: (r) => `Kho hóa chất, khu ${pick(r, ['A', 'B', 'C'])}`,
    ok: (r) => `${int(r, 20, 50)} lít dung môi đặt trong khay chống tràn, thùng có dán nhãn.`,
    bad: (r) => {
      const k = int(r, 0, 2)
      if (k === 0) { const l = int(r, 55, 80); return { text: `${l} lít dung môi đặt trong khay chống tràn, thùng có dán nhãn.`, why: `${l} lít vượt mức tối đa 50 lít mỗi khu vực.` } }
      if (k === 1) return { text: `${int(r, 20, 50)} lít dung môi đặt trong khay chống tràn, một thùng không có nhãn.`, why: 'Có thùng hóa chất không dán nhãn.' }
      return { text: `${int(r, 20, 50)} lít dung môi, thùng có nhãn nhưng đặt trực tiếp trên sàn.`, why: 'Hóa chất không đặt trong khay chống tràn.' }
    },
  },
]

function ehs(r: Rng): BinaryCase {
  const valid = !chance(r, FLAW_RATE)
  const t = pick(r, EHS)
  const f: Finding = valid ? { text: t.ok(r), why: 'Không phát hiện vi phạm quy tắc an toàn.' } : t.bad(r)
  return {
    kind: 'binary', valid, reason: f.why,
    reference: [sec('Quy tắc an toàn lao động', RULES.map((x, i) => [`Quy tắc ${i + 1}`, x] as [string, string]))],
    document: [sec(`Báo cáo hiện trường #${int(r, 100, 999)}`, [['Khu vực', t.zone(r)], ['Ca làm việc', pick(r, ['Ca sáng', 'Ca chiều', 'Ca đêm'])], ['Ghi nhận của thanh tra', f.text]])],
    facts: { violation: !valid },
  }
}

// ---------- 5. Sản xuất: điều phối dây chuyền ----------
const MACHINE_NAMES = ['Máy dập 1', 'Máy dập 2', 'Máy CNC']

export function evalProduction(c: ProductionCase, hours: number[]) {
  const output = c.machines.reduce((s, m, i) => s + m.perHour * hours[i], 0)
  const material = c.machines.reduce((s, m, i) => s + m.kgPerHour * hours[i], 0)
  return { output, material, ok: output >= c.target && material <= c.stock }
}

function production(r: Rng): ProductionCase {
  for (let attempt = 0; attempt < 500; attempt++) {
    const machines = MACHINE_NAMES.map((name) => ({ name, perHour: int(r, 20, 60), kgPerHour: int(r, 10, 40) }))
    const solution = machines.map(() => int(r, 0, 8))
    if (solution.filter((h) => h > 0).length < 2) continue
    const output = machines.reduce((s, m, i) => s + m.perHour * solution[i], 0)
    const material = machines.reduce((s, m, i) => s + m.kgPerHour * solution[i], 0)
    const allMaterial = machines.reduce((s, m) => s + m.kgPerHour * 8, 0)
    if (output < 200 || material >= allMaterial * 0.85) continue // chạy hết công suất phải vượt kho NVL
    return buildProduction(machines, solution, output, material)
  }
  const machines = [{ name: MACHINE_NAMES[0], perHour: 40, kgPerHour: 20 }, { name: MACHINE_NAMES[1], perHour: 30, kgPerHour: 25 }, { name: MACHINE_NAMES[2], perHour: 50, kgPerHour: 30 }]
  return buildProduction(machines, [8, 4, 3], 590, 350)
}

function buildProduction(machines: ProductionCase['machines'], solution: number[], target: number, stock: number): ProductionCase {
  return {
    kind: 'production', machines, maxHours: 8, target, stock, solution,
    reference: [
      sec('Chỉ tiêu và nguồn lực ca này', [['KPI sản lượng', `tối thiểu ${target} sản phẩm`], ['Nguyên vật liệu trong kho', `${stock} kg`], ['Giờ chạy tối đa mỗi máy', '8 giờ']]),
      sec('Thông số máy', machines.map((m) => [m.name, `${m.perHour} sp/giờ, dùng ${m.kgPerHour} kg/giờ (${dec(m.perHour / m.kgPerHour, 2)} sp/kg)`] as [string, string])),
    ],
  }
}

// ---------- 6. R&D: thử nghiệm công thức ----------
const INGREDIENTS = ['Nhựa nền PP', 'Sợi thủy tinh', 'Phụ gia gia cường']

export function evalRnd(c: RndCase, pct: number[]) {
  const strength = pct.reduce((s, x, i) => s + (x * c.ingredients[i].strength) / 100, 0)
  const cost = pct.reduce((s, x, i) => s + (x * c.ingredients[i].cost) / 100, 0)
  return { strength, cost, ok: Math.abs(strength - c.target) <= c.tolerance + 1e-9 && cost <= c.budget + 1e-9 }
}

function rnd(r: Rng): RndCase {
  for (let attempt = 0; attempt < 500; attempt++) {
    const ingredients = INGREDIENTS.map((name) => ({ name, strength: int(r, 20, 160), cost: int(r, 15, 130) * 1000 }))
    const a = int(r, 0, 20) * 5
    const b = int(r, 0, (100 - a) / 5) * 5
    const solution = [a, b, 100 - a - b]
    if (solution.filter((x) => x > 0).length < 2) continue
    const strength = solution.reduce((s, x, i) => s + (x * ingredients[i].strength) / 100, 0)
    const cost = solution.reduce((s, x, i) => s + (x * ingredients[i].cost) / 100, 0)
    const target = Math.round(strength * 10) / 10
    const budget = Math.ceil((cost * 1.02) / 100) * 100
    return {
      kind: 'rnd', ingredients, target, tolerance: 3, budget, solution,
      reference: [
        sec('Mục tiêu công thức', [['Độ bền mục tiêu', `${dec(target, 1)} MPa (sai số ±3)`], ['Chi phí tối đa', `${vnd(budget)}/kg`], ['Quy tắc', 'Tổng tỷ lệ phối trộn = 100%']]),
        sec('Nguyên liệu (đóng góp khi dùng 100%)', ingredients.map((x) => [x.name, `${x.strength} MPa, ${vnd(x.cost)}/kg`] as [string, string])),
      ],
    }
  }
  const ingredients = [{ name: INGREDIENTS[0], strength: 40, cost: 30000 }, { name: INGREDIENTS[1], strength: 120, cost: 90000 }, { name: INGREDIENTS[2], strength: 80, cost: 60000 }]
  return { kind: 'rnd', ingredients, target: 84, tolerance: 3, budget: 64300, solution: [30, 40, 30], reference: [sec('Mục tiêu công thức', [['Độ bền mục tiêu', '84,0 MPa (sai số ±3)'], ['Chi phí tối đa', `${vnd(64300)}/kg`]])] }
}

export function generate(game: GameKey, r: Rng): Case {
  switch (game) {
    case 'accounting': return accounting(r)
    case 'qc': return qc(r)
    case 'hr': return hr(r)
    case 'ehs': return ehs(r)
    case 'production': return production(r)
    case 'rnd': return rnd(r)
  }
}
