import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  AlertTriangle, BarChart3, Columns3, FileText, Gamepad2, HelpCircle, KeyRound,
  LayoutDashboard, MessageSquare, ShoppingBag, Trophy, Users, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { useNewDocsCount } from '../features/documents/hooks'
import { useRealtimeSync } from '../features/tasks/realtime'
import { Topbar } from './Topbar'

type Group = { title: string; items: { to: string; label: string; icon: LucideIcon }[] }

const GROUPS: Group[] = [
  { title: 'Làm việc', items: [
    { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/projects', label: 'Schedule', icon: Columns3 },
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    { to: '/documents', label: 'Tài liệu', icon: FileText },
  ] },
  { title: 'Game & Thưởng', items: [
    { to: '/games', label: 'Game', icon: Gamepad2 },
    { to: '/quiz', label: 'Quiz', icon: HelpCircle },
    { to: '/leaderboard', label: 'Xếp hạng', icon: Trophy },
    { to: '/shop', label: 'Cửa hàng', icon: ShoppingBag },
  ] },
  { title: 'Vận hành', items: [
    { to: '/support', label: 'Hỗ trợ', icon: AlertTriangle },
    { to: '/reports', label: 'Báo cáo', icon: BarChart3 },
  ] },
]

const ADMIN_GROUP: Group = { title: 'Quản trị', items: [
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/codes', label: 'Mã đăng ký', icon: KeyRound },
] }

function Sidebar({ groups, onNavigate }: { groups: Group[]; onNavigate?: () => void }) {
  const { data: newDocs = 0 } = useNewDocsCount()
  return (
    <nav aria-label="Điều hướng chính" className="flex h-full w-56 flex-col overflow-y-auto bg-ink px-3 py-5 text-slate-300">
      <div className="px-2.5 pb-2 text-base font-bold text-white">Aurora OS</div>
      {groups.map((g) => (
        <div key={g.title}>
          <h2 className="mx-2.5 mb-1 mt-4 text-xs font-semibold text-slate-400">{g.title}</h2>
          {g.items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm ${isActive ? 'bg-ink-2 text-white' : 'hover:bg-ink-2/60'}`
              }
            >
              <Icon size={16} aria-hidden="true" />
              {label}
              {to === '/documents' && newDocs > 0 && (
                <span aria-label={`${newDocs} tài liệu mới`} className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">{newDocs}</span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

export function Layout() {
  const { profile } = useAuth()
  useRealtimeSync()
  const [open, setOpen] = useState(false)
  const groups = profile?.role === 'admin' ? [...GROUPS, ADMIN_GROUP] : GROUPS

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="sticky top-0 hidden h-screen shrink-0 md:block">
        <Sidebar groups={groups} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Đóng menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">
            <Sidebar groups={groups} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
