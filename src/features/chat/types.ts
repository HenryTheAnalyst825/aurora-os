export type Channel = {
  id: string
  name: string | null
  type: 'general' | 'department' | 'project' | 'dm'
  department_id: string | null
  project_id: string | null
}
export type Dm = { dm_channel_id: string; other_id: string; other_name: string }
export type SharedTask = { id: string; title: string; status: 'todo' | 'in_progress' | 'done'; project_id: string }
export type Message = {
  id: number
  user_id: string
  content: string
  created_at: string
  edited_at: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  tasks: SharedTask | null
}
