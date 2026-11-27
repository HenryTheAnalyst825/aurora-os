import fs from 'fs'

// Tự động đọc cấu hình từ file .env
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : ''
const getVal = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '')

const SUPABASE_URL = getVal('VITE_SUPABASE_URL')
const ANON_KEY = getVal('VITE_SUPABASE_ANON_KEY')
const WEB_URL = 'https://aurora-os-woad.vercel.app' // Thay bằng link Vercel hiện tại của bạn
const TOTAL_USERS = 100

async function fakeUserJourney(id) {
  const t0 = performance.now()
  try {
    // 1. Tải giao diện web từ Vercel
    const r1 = await fetch(WEB_URL)
    if (!r1.ok) throw new Error(`Vercel lỗi HTTP ${r1.status}`)

    // 2. Tải danh sách phòng ban & case study từ Supabase
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/departments?select=*`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    })
    if (!r2.ok) throw new Error(`Supabase API lỗi HTTP ${r2.status}`)

    // 3. Giả lập gọi RPC đọc bảng xếp hạng (Leaderboard)
    const r3 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_game_leaderboard`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_game: 'accounting', p_limit: 10 })
    })

    return { id, ok: r3.ok, ms: Math.round(performance.now() - t0) }
  } catch (e) {
    return { id, ok: false, err: e.message, ms: Math.round(performance.now() - t0) }
  }
}

console.log(`🚀 Đang phóng ${TOTAL_USERS} người dùng ảo truy cập CÙNG MỘT THỜI ĐIỂM...`)
const startAll = performance.now()
const results = await Promise.all(Array.from({ length: TOTAL_USERS }, (_, i) => fakeUserJourney(i + 1)))
const totalMs = Math.round(performance.now() - startAll)

const passed = results.filter(x => x.ok)
const failed = results.filter(x => !x.ok)
const times = results.map(x => x.ms).sort((a, b) => a - b)

console.log(`\n📊 KẾT QUẢ KIỂM THỬ 100 USERS ĐỒNG THỜI:`)
console.log(`- Thành công     : ${passed.length}/${TOTAL_USERS} users`)
console.log(`- Thất bại       : ${failed.length}/${TOTAL_USERS} users`)
console.log(`- Tổng thời gian : ${totalMs} ms`)
console.log(`- Nhanh nhất     : ${times[0]} ms`)
console.log(`- Trung bình     : ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms`)
console.log(`- Chậm nhất (Max): ${times[times.length - 1]} ms`)
if (failed.length > 0) console.log('⚠️ Chi tiết lỗi:', failed.slice(0, 5))```