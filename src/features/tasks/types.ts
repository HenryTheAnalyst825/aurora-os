export type Status = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  assignee_id: string | null
  deadline: string | null
  reward_credits: number
  reward_paid_at: string | null
  position: number
  assignee: { full_name: string } | null
}
export type Project = { id: string; name: string; description: string | null }
export type Member = { id: string; full_name: string }
export type Comment = { id: string; body: string; created_at: string; profiles: { full_name: string } | null }
export type HistoryItem = {
  id: string
  action: string
  detail: Record<string, string | null> | null
  created_at: string
  profiles: { full_name: string } | null
}

export const COLUMNS: { status: Status; label: string }[] = [
  { status: 'todo', label: 'Cần làm' },
  { status: 'in_progress', label: 'Đang xử lý' },
  { status: 'done', label: 'Đã hoàn thành' },
]
export const STATUS_LABEL: Record<Status, string> = { todo: 'Cần làm', in_progress: 'Đang xử lý', done: 'Đã hoàn thành' }
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' }
export const PRIORITY_STYLE: Record<Priority, string> = {
  low: 'bg-green-100 text-green-900',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-orange-100 text-orange-900',
}
