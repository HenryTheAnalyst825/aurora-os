import { supabase } from '../../lib/supabase'
import { MIME, ext, safeName, stripExt } from './files'
import type { DocRow, Folder } from './types'

const BUCKET = 'files'
const DOC_SELECT = 'id, folder_id, title, description, source, storage_path, file_name, mime_type, size_bytes, department_id, pinned, version, created_at, updated_at, uploaded_by, profiles(full_name)'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error
  return res.data as T
}

export const fetchFolders = async () =>
  unwrap(await supabase.from('document_folders').select('id, name, parent_id, department_id').order('name')) as Folder[]

export const fetchDocuments = async () =>
  unwrap(await supabase.from('documents').select(DOC_SELECT).order('created_at', { ascending: false })) as unknown as DocRow[]

export const createFolder = async (name: string, department_id: string | null) =>
  unwrap(await supabase.from('document_folders').insert({ name, department_id }))
export const renameFolder = async (id: string, name: string) => unwrap(await supabase.from('document_folders').update({ name }).eq('id', id))
export const deleteFolder = async (id: string) => unwrap(await supabase.from('document_folders').delete().eq('id', id))

export type UploadMeta = { folder_id: string | null; department_id: string | null; source: string | null }

// Tiếp nhận 1 file: tải lên Storage trước, rồi ghi dòng tài liệu (lỗi thì dọn file đã tải)
export async function uploadDocument(file: File, meta: UploadMeta, userId: string) {
  const id = crypto.randomUUID()
  const path = `docs/${id}/${safeName(file.name)}`
  const mime = MIME[ext(file.name)]
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: mime, upsert: false })
  if (up.error) throw up.error
  const ins = await supabase.from('documents').insert({
    id, title: stripExt(file.name), storage_path: path, file_name: file.name, mime_type: mime,
    size_bytes: file.size, uploaded_by: userId, ...meta,
  })
  if (ins.error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw ins.error
  }
}

// Thay file mới (phiên bản mới): người dùng thấy bản mới ngay nhờ realtime
export async function replaceFile(doc: DocRow, file: File) {
  const path = `docs/${doc.id}/${Date.now()}-${safeName(file.name)}`
  const mime = MIME[ext(file.name)]
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: mime, upsert: false })
  if (up.error) throw up.error
  const upd = await supabase.from('documents')
    .update({ storage_path: path, file_name: file.name, mime_type: mime, size_bytes: file.size, version: doc.version + 1 })
    .eq('id', doc.id)
  if (upd.error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw upd.error
  }
  await supabase.storage.from(BUCKET).remove([doc.storage_path]) // dọn file cũ (nếu có quyền)
}

export const updateDocument = async (id: string, patch: Record<string, unknown>) =>
  unwrap(await supabase.from('documents').update(patch).eq('id', id))

export async function deleteDocument(doc: DocRow) {
  unwrap(await supabase.from('documents').delete().eq('id', doc.id))
  await supabase.storage.from(BUCKET).remove([doc.storage_path])
}

// Đường dẫn tải có thời hạn 1 giờ (kho file ở chế độ riêng tư)
export async function signedUrl(path: string, downloadName?: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600, downloadName ? { download: downloadName } : undefined)
  if (error) throw error
  return data.signedUrl
}
