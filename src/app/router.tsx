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
import { Home, Placeholder, NotFoundPage } from './pages'
import { RequireAuth } from './RequireAuth'
import SupportPage from '../features/Support/SupportPage'
import ReportsPage from '../features/Support/ReportsPage'
import NotificationsPage from '../features/notifications/NotificationsPage'

const PAGES: [string, string][] = [
  ['tasks', 'Công việc của tôi'],
  ['calendar', 'Lịch'],
  ['quiz', 'Quiz'],
  ['quests', 'Nhiệm vụ'],
  ['shop', 'Cửa hàng'],
  ['proposals', 'Đề xuất'],
  ['wall', 'Tường cải tiến'],
  ['members', 'Thành viên'],
]

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot', element: <ForgotPage /> },
  { path: '/reset', element: <ResetPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'games', element: <GamesHub /> },
      { path: 'games/:dept', element: <GamePlay /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'board', element: <BoardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'incidents', element: <SupportPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'admin/users', element: <AdminUsers /> },
      { path: 'admin/codes', element: <AdminCodes /> },
      ...PAGES.map(([p, t]) => ({ path: p, element: <Placeholder title={t} /> })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])