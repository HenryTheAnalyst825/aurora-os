export type Folder = { id: string; name: string; parent_id: string | null; department_id: string | null }
export type Dept = { id: string; name: string }
export type DocRow = {
  id: string
  folder_id: string | null
  title: string
  description: string | null
  source: string | null
  storage_path: string
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  department_id: string | null
  pinned: boolean
  version: number
  created_at: string
  updated_at: string
  uploaded_by: string | null
  profiles: { full_name: string } | null
}
