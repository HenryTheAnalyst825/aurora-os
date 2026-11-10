// Kiểm tra đồng bộ giữa các tính năng của Aurora OS (chạy từ thư mục gốc dự án):
//   node scripts/integration-check.mjs
// Không sửa gì, chỉ đọc file và báo cáo. Chạy sau mỗi lần thêm tính năng hoặc nhờ AI sửa code.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (p) => { try { return fs.readFileSync(path.join(root, p), 'utf8') } catch { return null } }
const exists = (p) => fs.existsSync(path.join(root, p))
const out = []
let fails = 0
let warns = 0
const ok = (m) => out.push(`  [OK]   ${m}`)
const bad = (m) => { fails++; out.push(`  [LỖI]  ${m}`) }
const warn = (m) => { warns++; out.push(`  [CHÚ Ý] ${m}`) }
const title = (t) => out.push(`\n${t}`)
const has = (file, re) => { const s = read(file); return s !== null && (re instanceof RegExp ? re.test(s) : s.includes(re)) }

if (!exists('package.json') || !exists('src')) {
  console.log('Hãy chạy lệnh này từ thư mục gốc của dự án (nơi có package.json và thư mục src).')
  process.exit(2)
}

// Các tính năng: tên, tệp bắt buộc, có hay không (tính năng nào chưa cài thì bỏ qua các kiểm tra liên quan)
const FEATURES = {
  auth: ['src/features/auth/AuthProvider.tsx', 'src/features/auth/AuthPages.tsx', 'src/features/auth/PasswordPages.tsx', 'src/features/auth/ProfilePage.tsx', 'src/app/RequireAuth.tsx'],
  tasks: ['src/features/tasks/BoardPage.tsx', 'src/features/tasks/ProjectsPage.tsx', 'src/features/tasks/TaskDialog.tsx', 'src/features/tasks/api.ts', 'src/features/tasks/realtime.ts'],
  chat: ['src/features/chat/ChatPage.tsx', 'src/features/chat/ChannelList.tsx', 'src/features/chat/Thread.tsx', 'src/features/chat/api.ts'],
  admin: ['src/features/admin/AdminPages.tsx'],
  games: ['src/features/games/GamesHub.tsx', 'src/features/games/GamePlay.tsx', 'src/features/games/LeaderboardPage.tsx', 'src/features/games/generators.ts', 'src/features/games/Desk.tsx', 'src/features/games/api.ts'],
  documents: ['src/features/documents/DocumentsPage.tsx', 'src/features/documents/UploadPanel.tsx', 'src/features/documents/DocDialog.tsx', 'src/features/documents/api.ts', 'src/features/documents/files.ts', 'src/features/documents/hooks.ts'],
  notifications: ['src/features/notifications/NotificationsPage.tsx', 'src/features/notifications/AdminAnnouncements.tsx', 'src/features/notifications/Toaster.tsx', 'src/features/notifications/hooks.ts'],
}
const CORE = ['auth', 'tasks', 'chat', 'admin', 'games', 'documents']
const installed = {}

title('1. Tệp của từng tính năng')
for (const [name, files] of Object.entries(FEATURES)) {
  const missing = files.filter((f) => !exists(f))
  installed[name] = missing.length < files.length
  if (missing.length === 0) ok(`${name}: đủ ${files.length} tệp`)
  else if (!installed[name] && !CORE.includes(name)) warn(`${name}: chưa cài (tùy chọn)`)
  else bad(`${name}: thiếu ${missing.join(', ')}`)
}
for (const f of ['src/app/router.tsx', 'src/app/Layout.tsx', 'src/app/Topbar.tsx', 'src/app/pages.tsx', 'src/main.tsx', 'src/lib/supabase.ts']) if (!exists(f)) bad(`thiếu tệp ${f}`)

title('2. Đường dẫn (router) và trang giữ chỗ che mất trang thật')
const router = read('src/app/router.tsx') ?? ''
const paths = [...router.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1].replace(/^\//, ''))
const placeholderBlock = router.match(/const PAGES[^=]*=\s*\[([\s\S]*?)\n\]/)
const placeholders = placeholderBlock ? [...placeholderBlock[1].matchAll(/\['([a-z0-9-]+)'\s*,/g)].map((m) => m[1]) : []
const all = [...paths, ...placeholders]
const dup = [...new Set(all.filter((p, i) => all.indexOf(p) !== i))]
dup.length ? bad(`đường dẫn bị khai báo trùng (trang giữ chỗ che trang thật): ${dup.join(', ')}`) : ok('không có đường dẫn trùng')
const ROUTES = [
  ['login', 'LoginPage', 'auth'], ['register', 'RegisterPage', 'auth'], ['forgot', 'ForgotPage', 'auth'], ['reset-password', 'ResetPage', 'auth'], ['profile', 'ProfilePage', 'auth'],
  ['projects', 'ProjectsPage', 'tasks'], ['projects/:id', 'BoardPage', 'tasks'], ['chat', 'ChatPage', 'chat'], ['chat/:channelId', 'ChatPage', 'chat'],
  ['documents', 'DocumentsPage', 'documents'], ['games', 'GamesHub', 'games'], ['games/:gameKey', 'GamePlay', 'games'], ['leaderboard', 'LeaderboardPage', 'games'],
  ['admin/users', 'AdminUsers', 'admin'], ['admin/codes', 'AdminCodes', 'admin'],
  ['notifications', 'NotificationsPage', 'notifications'], ['admin/announcements', 'AdminAnnouncements', 'notifications'],
]
for (const [route, comp, feat] of ROUTES) {
  if (!installed[feat]) continue
  const wired = new RegExp(`path:\\s*'/?${route.replace(/[/:]/g, (c) => `\\${c}`)}'[^}]*element:\\s*<${comp}\\b`).test(router)
  wired ? ok(`/${route} dùng ${comp}`) : bad(`/${route} chưa gắn ${comp} (có thể đang là trang giữ chỗ hoặc bị xóa)`)
}
router.includes("path: '*'") ? ok('có trang 404 (path "*")') : warn('chưa có trang 404')

title('3. Khung ứng dụng (Layout, Topbar, đồng bộ realtime)')
const layout = read('src/app/Layout.tsx') ?? ''
layout.includes('useRealtimeSync()') ? ok('Layout gọi useRealtimeSync()') : bad('Layout KHÔNG gọi useRealtimeSync(): Kanban, chat, tài liệu sẽ không tự cập nhật')
layout.includes('<Outlet') ? ok('Layout có <Outlet />') : bad('Layout thiếu <Outlet />: không trang nào hiển thị')
for (const [p, feat] of [['/projects', 'tasks'], ['/chat', 'chat'], ['/documents', 'documents'], ['/games', 'games'], ['/leaderboard', 'games']])
  if (installed[feat]) layout.includes(`'${p}'`) ? ok(`menu có ${p}`) : bad(`menu thiếu mục ${p}`)
if (installed.documents) layout.includes('useNewDocsCount') ? ok('menu Tài liệu có huy hiệu tài liệu mới') : warn('menu Tài liệu mất huy hiệu tài liệu mới (useNewDocsCount)')
if (installed.notifications) layout.includes('Toaster') ? ok('Layout có Toaster (cửa sổ thông báo nhỏ)') : warn('Layout chưa gắn <Toaster />')
const rt = read('src/features/tasks/realtime.ts') ?? ''
const tables = { tasks: 'tasks', task_comments: 'tasks', messages: 'chat', documents: 'documents', document_folders: 'documents', system_state: 'games', notifications: 'notifications', announcements: 'notifications' }
for (const [t, feat] of Object.entries(tables)) {
  if (!installed[feat]) continue
  new RegExp(`table:\\s*'${t}'`).test(rt) ? ok(`realtime lắng nghe bảng ${t}`) : bad(`realtime THIẾU bảng ${t}: ${feat} sẽ không tự cập nhật`)
}
rt.includes('removeChannel') ? ok('realtime có hủy đăng ký khi rời trang') : warn('realtime thiếu removeChannel (rò rỉ kết nối)')
const topbar = read('src/app/Topbar.tsx') ?? ''
if (installed.games) topbar.includes('factory_progress') ? ok('Topbar dùng factory_progress (tiến độ có điểm thưởng game)') : warn('Topbar không dùng factory_progress: điểm thưởng game không cộng vào tiến độ')
if (installed.notifications) topbar.includes('useUnreadCount') ? ok('Topbar có huy hiệu chuông') : warn('Topbar chưa có huy hiệu chuông')
const auth = read('src/features/auth/AuthProvider.tsx') ?? ''
if (installed.games) auth.includes('refreshProfile') ? ok('AuthProvider có refreshProfile (game cần để cập nhật Credits)') : bad('AuthProvider thiếu refreshProfile: GamePlay sẽ lỗi')
auth.includes('is_active') ? ok('AuthProvider đọc is_active (khóa tài khoản)') : bad('AuthProvider không đọc is_active: tính năng khóa tài khoản mất tác dụng')

title('4. Các điểm hay bị mất')
if (installed.documents) {
  const dp = read('src/features/documents/DocumentsPage.tsx') ?? ''
  const gated = /isAdmin\s*&&\s*showUpload[^\n]*<UploadPanel|<UploadPanel/.test(dp)
  dp.includes("import { UploadPanel }") && gated ? ok('Tài liệu: có nút và khung tiếp nhận (UploadPanel) cho admin') : bad('Tài liệu: MẤT khung tải lên (UploadPanel không được import hoặc không được dùng trong DocumentsPage)')
  dp.includes('Tiếp nhận tài liệu') ? ok('Tài liệu: có nút "Tiếp nhận tài liệu"') : bad('Tài liệu: mất nút "Tiếp nhận tài liệu"')
  ;/export (async )?(function|const) uploadDocument/.test(read('src/features/documents/api.ts') ?? '') ? ok('Tài liệu: api.uploadDocument tồn tại') : bad('Tài liệu: api.ts mất uploadDocument')
  dp.includes("role === 'admin'") ? ok('Tài liệu: phân biệt admin/user qua role') : warn('Tài liệu: không thấy kiểm tra role admin (nút tải lên có thể hiện sai người)')
}
if (installed.chat) {
  const cp = read('src/features/chat/ChatPage.tsx') ?? ''
  cp.includes('<Thread') && cp.includes('<ChannelList') ? ok('Chat: ChatPage dùng ChannelList và Thread') : bad('Chat: ChatPage không dùng ChannelList/Thread (có thể đã bị thay bằng bản khác)')
  const ca = read('src/features/chat/api.ts') ?? ''
  for (const f of ['fetchMessages', 'sendMessage', 'uploadFile', 'fetchDms', 'openDm']) /export (async )?(function|const) /.test(ca) && ca.includes(f) ? ok(`Chat: api.${f}`) : bad(`Chat: api.ts mất ${f}`)
}
if (installed.tasks) {
  const bp = read('src/features/tasks/BoardPage.tsx') ?? ''
  bp.includes('<TaskDialog') && bp.includes('DndContext') ? ok('Kanban: có TaskDialog và kéo thả') : bad('Kanban: BoardPage mất TaskDialog hoặc kéo thả')
}

title('5. Import hỏng (tệp không tồn tại hoặc không xuất ra tên được import)')
const files = []
const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) files.push(p) } }
walk('src')
const resolve = (from, spec) => {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec))
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((c) => exists(c) && fs.statSync(path.join(root, c)).isFile())
}
const exportsOf = (src) => {
  const set = new Set()
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/g)) set.add(m[1])
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) m[1].split(',').forEach((x) => set.add(x.trim().split(/\s+as\s+/).pop()))
  return set
}
let importProblems = 0
for (const f of files) {
  const src = read(f) ?? ''
  for (const m of src.matchAll(/import\s+(type\s+)?([^'";]*?)\s*from\s*'(\.[^']+)'/g)) {
    const spec = m[3]
    if (/\.(css|svg|png)$/.test(spec)) { if (!exists(path.posix.join(path.posix.dirname(f), spec))) { bad(`${f}: không có tệp ${spec}`); importProblems++ } continue }
    const target = resolve(f, spec)
    if (!target) { bad(`${f}: import '${spec}' trỏ tới tệp không tồn tại`); importProblems++; continue }
    const named = (m[2].match(/\{([^}]*)\}/) ?? [])[1]
    if (!named) continue
    const ex = exportsOf(read(target) ?? '')
    for (const raw of named.split(',')) {
      const n = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
      if (n && !ex.has(n)) { bad(`${f}: import { ${n} } từ '${spec}' nhưng ${target} không xuất ra tên này`); importProblems++ }
    }
  }
}
if (!importProblems) ok(`đã kiểm tra ${files.length} tệp, mọi import đều hợp lệ`)

title('6. Tệp SQL (các bước cài đặt cơ sở dữ liệu)')
for (const f of ['schema.sql', 'phase3.sql', 'step1-lock-accounts.sql', '004_security_patch.sql', '005_game_simulator.sql', '006_documents.sql', '007_notifications.sql'])
  exists(`docs/${f}`) ? ok(`docs/${f}`) : warn(`thiếu docs/${f} (nếu bạn đã chạy trong Supabase thì chỉ là thiếu bản lưu)`)

console.log(out.join('\n'))
console.log(`\nKết quả: ${fails} lỗi, ${warns} chú ý.`)
console.log(fails ? 'Hãy gửi toàn bộ nội dung trên cho người hỗ trợ để xử lý.' : 'Các tính năng đang đồng bộ với nhau.')
process.exit(fails ? 1 : 0)
