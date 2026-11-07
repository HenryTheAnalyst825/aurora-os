import { createBrowserRouter } from 'react-router-dom'
import { LoginPage, RegisterPage } from '../features/auth/AuthPages'
import { AdminCodes, AdminUsers } from '../features/admin/AdminPages'
import { ChatPage } from '../features/chat/ChatPage'
import { BoardPage } from '../features/tasks/BoardPage'
import { ProjectsPage } from '../features/tasks/ProjectsPage'
import { Layout } from './Layout'
import { Home, Placeholder } from './pages'
import { RequireAuth } from './RequireAuth'

const PAGES: [string, string][] = [
  ['tasks', 'Công việc của tôi'], ['calendar', 'Lịch'], ['documents', 'Tài liệu'], ['games', 'Game'], ['quiz', 'Quiz'], ['quests', 'Nhiệm vụ'],
  ['shop', 'Cửa hàng'], ['leaderboard', 'Xếp hạng'], ['incidents', 'Sự cố'], ['proposals', 'Đề xuất'],
  ['reports', 'Báo cáo'], ['wall', 'Tường cải tiến'], ['members', 'Thành viên'],
  ['notifications', 'Thông báo'], ['profile', 'Hồ sơ'],
]

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'chat/:channelId', element: <ChatPage /> },
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:id', element: <BoardPage /> },
          ...PAGES.map(([path, title]) => ({ path, element: <Placeholder title={title} /> })),
          {
            element: <RequireAuth role="admin" />,
            children: [
              { path: 'admin/users', element: <AdminUsers /> },
              { path: 'admin/codes', element: <AdminCodes /> },
            ],
          },
        ],
      },
    ],
  },
])
