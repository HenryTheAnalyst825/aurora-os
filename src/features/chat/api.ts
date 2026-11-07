import { supabase } from '../../lib/supabase'
import type { Channel, Dm, Message, SharedTask } from './types'

export const PAGE = 50
export const MAX_FILE_MB = 10

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error
  return res.data as T
}

export const fetchChannels = async () =>
  unwrap(await supabase.from('channels').select('id, name, type, department_id, project_id').neq('type', 'dm').order('created_at')) as Channel[]

export const fetchDms = async () => unwrap(await supabase.rpc('my_dm_channels')) as Dm[]

export const openDm = async (otherId: string) => unwrap(await supabase.rpc('get_or_create_dm', { p_other: otherId })) as string

// Admin tạo kênh chung (liên phòng ban): mọi người đều thấy
export const createChannel = async (name: string, userId: string) =>
  unwrap(await supabase.from('channels').insert({ name, type: 'general', created_by: userId }))

export async function fetchMessages(channelId: string, before?: number) {
  let q = supabase
    .from('messages')
    .select('id, user_id, content, created_at, edited_at, file_path, file_name, file_size, tasks(id, title, status, project_id)')
    .eq('channel_id', channelId)
    .order('id', { ascending: false })
    .limit(PAGE)
  if (before) q = q.lt('id', before)
  return unwrap(await q) as unknown as Message[]
}

export type NewMessage = {
  channel_id: string
  user_id: string
  content: string
  task_id?: string | null
  file_path?: string | null
  file_name?: string | null
  file_size?: number | null
}
export const sendMessage = async (m: NewMessage) => unwrap(await supabase.from('messages').insert(m))

export const editMessage = async (id: number, content: string) =>
  unwrap(await supabase.from('messages').update({ content, edited_at: new Date().toISOString() }).eq('id', id))

export async function deleteMessage(m: Message) {
  unwrap(await supabase.from('messages').delete().eq('id', m.id))
  if (m.file_path) await supabase.storage.from('files').remove([m.file_path]) // xóa file kèm theo (nếu có quyền)
}

export async function uploadFile(channelId: string, file: File) {
  const safe = file.name.replace(/[^\w.-]+/g, '_')
  const path = `chat/${channelId}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('files').upload(path, file)
  if (error) throw error
  return path
}

export async function fileUrl(path: string) {
  const { data, error } = await supabase.storage.from('files').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export const fetchShareableTasks = async () =>
  unwrap(await supabase.from('tasks').select('id, title, status, project_id').order('updated_at', { ascending: false }).limit(30)) as SharedTask[]
