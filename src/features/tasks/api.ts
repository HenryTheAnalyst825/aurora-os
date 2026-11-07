import { supabase } from '../../lib/supabase'
import type { Comment, HistoryItem, Member, Priority, Project, Status, Task } from './types'

const TASK_SELECT = '*, assignee:profiles!assignee_id(full_name)'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error
  return res.data as T
}

export const fetchProjects = async () =>
  unwrap(await supabase.from('projects').select('id, name, description').order('created_at')) as Project[]

export const fetchProject = async (id: string) =>
  unwrap(await supabase.from('projects').select('id, name, description').eq('id', id).single()) as Project

export const createProject = async (name: string, description: string | null, ownerId: string) =>
  unwrap(await supabase.from('projects').insert({ name, description, owner_id: ownerId }))

export const fetchTasks = async (projectId: string) =>
  unwrap(await supabase.from('tasks').select(TASK_SELECT).eq('project_id', projectId).order('position')) as unknown as Task[]

export type NewTask = {
  project_id: string
  title: string
  description: string | null
  priority: Priority
  position: number
  status?: Status
  assignee_id?: string | null
  deadline?: string | null
  reward_credits?: number
}
export const createTask = async (t: NewTask) => unwrap(await supabase.from('tasks').insert(t))

export const updateTask = async (id: string, patch: Record<string, unknown>) =>
  unwrap(await supabase.from('tasks').update(patch).eq('id', id))

export const deleteTask = async (id: string) => unwrap(await supabase.from('tasks').delete().eq('id', id))

// Trả thưởng Credits cho người phụ trách (chỉ admin, chạy ở server, chỉ trả 1 lần)
export const awardReward = async (id: string) => unwrap(await supabase.rpc('award_task_reward', { p_task_id: id }))

export const fetchMembers = async () =>
  unwrap(await supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')) as Member[]

export const fetchComments = async (taskId: string) =>
  unwrap(
    await supabase.from('task_comments').select('id, body, created_at, profiles(full_name)').eq('task_id', taskId).order('created_at'),
  ) as unknown as Comment[]

export const addComment = async (taskId: string, userId: string, body: string) =>
  unwrap(await supabase.from('task_comments').insert({ task_id: taskId, user_id: userId, body }))

export const fetchHistory = async (taskId: string) =>
  unwrap(
    await supabase
      .from('task_history')
      .select('id, action, detail, created_at, profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(20),
  ) as unknown as HistoryItem[]
