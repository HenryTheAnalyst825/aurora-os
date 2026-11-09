import { createBrowserRouter } from 'react-router-dom'
import { LoginPage, RegisterPage } from '../features/auth/AuthPages'
import { AdminCodes, AdminUsers } from '../features/admin/AdminPages'
import { ForgotPage, ResetPage } from '../features/auth/PasswordPages'
import { ProfilePage } from '../features/auth/ProfilePage'
import { GamePlay } from '../features/games/GamePlay'
import { GamesHub } from '../features/games/GamesHub'
import { LeaderboardPage } from '../features/games/LeaderboardPage'
import { DocumentsPage } from '../features/documents/DocumentsPage'
import { ChatPage } from '../features/chat/ChatPage'
import { BoardPage } from '../features/tasks/BoardPage'
import { ProjectsPage } from '../features/tasks/ProjectsPage'
import { Layout } from './Layout'
import { Home, Placeholder } from './pages'
import { RequireAuth } from './RequireAuth'
// Đã sửa đúng đường dẫn thư mục thành 'support' (chữ thường)
import { SupportPage } from '../features/support/SupportPage'
import { ReportsPage } from '../features/support/ReportsPage'

const PAGES: [string, string][] = [
  ['tasks', 'Công việc của tôi'], ['calendar', 'Lịch'], ['quiz', 'Quiz'], ['quests', 'Nhiệm vụ'],
  ['shop', 'Cửa hàng'], ['proposals', 'Đề xuất'],
  ['wall', 'Tường cải tiến'], ['members', 'Thành viên'],
  ['notifications', 'Thông báo'],
]

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot', element: <ForgotPage /> },
  { path: '/reset-password', element: <ResetPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'documents', element: <DocumentsPage /> },
          { path: 'games', element: <GamesHub /> },
          { path: 'games/:gameKey', element: <GamePlay /> },
          { path: 'leaderboard', element: <LeaderboardPage /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'chat/:channelId', element: <ChatPage /> },
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:id', element: <BoardPage /> },
          // Khai báo tường minh đường dẫn Hỗ trợ và Báo cáo chính thức
          { path: 'support', element: <SupportPage /> },
          { path: 'reports', element: <ReportsPage /> },
          // Các trang khác chạy qua Placeholder
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
