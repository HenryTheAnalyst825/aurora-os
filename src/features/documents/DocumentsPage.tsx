import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Pin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { createFolder, deleteFolder, fetchDocuments, fetchFolders, renameFolder, signedUrl } from './api'
import { DocDialog } from './DocDialog'
import { canPreview, fmtSize, fold } from './files'
import { markDocsSeen } from './hooks'
import type { Dept, DocRow } from './types'
import { UploadPanel } from './UploadPanel'

const NEW_MS = 3 * 24 * 3600 * 1000
const chip = (on: boolean) => `min-h-11 rounded-full px-4 text-sm font-semibold ${on ? 'bg-ink text-white' : 'border border-slate-300 bg-white'}`
const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra. Thử lại sau.'

export function DocumentsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const qc = useQueryClient()
  const folders = useQuery({ queryKey: ['folders'], queryFn: fetchFolders })
  const docs = useQuery({ queryKey: ['documents'], queryFn: fetchDocuments })
  const { data: depts = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => ((await supabase.from('departments').select('id, name').order('name')).data ?? []) as Dept[],
  })
  const [q, setQ] = useState('')
  const [folder, setFolder] = useState('all') // 'all' | 'none' | id thư mục
  const [editing, setEditing] = useState<DocRow | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showFolders, setShowFolders] = useState(false)
  const [flash, setFlash] = useState('')
  const [error, setError] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [newFolderDept, setNewFolderDept] = useState('')
  const seen = useRef<Set<string> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>()
  const dname = (id: string | null) => (id ? depts.find((d) => d.id === id)?.name : undefined)
  const folderName = (id: string | null) => folders.data?.find((f) => f.id === id)?.name

  // Mở trang: đánh dấu đã xem. Có tài liệu mới xuất hiện khi đang xem: báo ngay (realtime)
  useEffect(() => {
    if (!profile || !docs.data) return
    const ids = new Set(docs.data.map((d) => d.id))
    if (seen.current) {
      const added = docs.data.filter((d) => !seen.current!.has(d.id) && d.uploaded_by !== profile.id)
      if (added.length) {
        setFlash(`Vừa có ${added.length} tài liệu mới: ${added.slice(0, 3).map((d) => d.title).join(', ')}${added.length > 3 ? '…' : ''}`)
        clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlash(''), 8000)
      }
    }
    seen.current = ids
    markDocsSeen(profile.id, qc)
  }, [docs.data, profile, qc])
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const list = useMemo(() => {
    const needle = fold(q.trim())
    return (docs.data ?? [])
      .filter((d) => (folder === 'all' ? true : folder === 'none' ? !d.folder_id : d.folder_id === folder))
      .filter((d) => !needle || fold([d.title, d.description, d.file_name, d.source].filter(Boolean).join(' ')).includes(needle))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at))
  }, [docs.data, q, folder])

  async function open(d: DocRow, inline: boolean) {
    setError('')
    try {
      window.open(await signedUrl(d.storage_path, inline ? undefined : d.file_name ?? undefined), '_blank', 'noopener')
    } catch (e) {
      setError(errMsg(e))
    }
  }

  const addFolder = useMutation({
    mutationFn: () => createFolder(newFolder.trim(), newFolderDept || null),
    onSuccess: () => { setNewFolder(''); qc.invalidateQueries({ queryKey: ['folders'] }) },
    onError: (e) => setError(errMsg(e)),
  })
  const refreshFolders = () => { qc.invalidateQueries({ queryKey: ['folders'] }); qc.invalidateQueries({ queryKey: ['documents'] }) }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Tài liệu và kho dữ liệu</h1>
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <button onClick={() => setShowFolders((v) => !v)} aria-expanded={showFolders} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Thư mục</button>
            <button onClick={() => setShowUpload((v) => !v)} aria-expanded={showUpload} className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white">Tiếp nhận tài liệu</button>
          </div>
        )}
      </div>

      {flash && <p role="status" className="mt-3 rounded-md bg-green-100 px-3 py-2 text-sm font-semibold text-green-900">{flash}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

      {isAdmin && showUpload && profile && <div className="mt-4"><UploadPanel folders={folders.data ?? []} depts={depts} userId={profile.id} /></div>}

      {isAdmin && showFolders && (
        <section aria-label="Quản lý thư mục" className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Thư mục</h2>
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (newFolder.trim()) addFolder.mutate() }} className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-sm font-medium text-slate-700">Tên thư mục mới
              <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} className="mt-1 block min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-sm font-medium text-slate-700">Ai xem được
              <select value={newFolderDept} onChange={(e) => setNewFolderDept(e.target.value)} className="mt-1 block min-h-11 rounded-md border border-slate-300 bg-white px-2 text-sm font-normal">
                <option value="">Mọi người</option>
                {depts.map((d) => <option key={d.id} value={d.id}>Chỉ phòng {d.name}</option>)}
              </select>
            </label>
            <button className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white">Tạo thư mục</button>
          </form>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(folders.data ?? []).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="font-semibold">{f.name}</span>
                <span className="text-slate-600">{dname(f.department_id) ? `Chỉ phòng ${dname(f.department_id)}` : 'Mọi người'}</span>
                <button onClick={async () => { const n = window.prompt('Tên mới của thư mục', f.name); if (n?.trim()) { await renameFolder(f.id, n.trim()); refreshFolders() } }} className="ml-auto min-h-11 px-2 font-semibold">Đổi tên</button>
                <button onClick={async () => { if (window.confirm(`Xóa thư mục "${f.name}"? Tài liệu bên trong chuyển sang Chưa phân loại.`)) { await deleteFolder(f.id); setFolder('all'); refreshFolders() } }} className="min-h-11 px-2 font-semibold text-red-700">Xóa</button>
              </li>
            ))}
            {folders.data?.length === 0 && <li className="py-2 text-slate-600">Chưa có thư mục nào.</li>}
          </ul>
        </section>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="grow sm:max-w-xs">
          <span className="sr-only">Tìm tài liệu</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, mô tả, nguồn…" className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo thư mục">
          <button aria-pressed={folder === 'all'} onClick={() => setFolder('all')} className={chip(folder === 'all')}>Tất cả</button>
          {(folders.data ?? []).map((f) => <button key={f.id} aria-pressed={folder === f.id} onClick={() => setFolder(f.id)} className={chip(folder === f.id)}>{f.name}</button>)}
          <button aria-pressed={folder === 'none'} onClick={() => setFolder('none')} className={chip(folder === 'none')}>Chưa phân loại</button>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {docs.isLoading && <li className="p-4 text-sm text-slate-600">Đang tải…</li>}
        {docs.isError && <li className="p-4 text-sm text-red-700">Không tải được tài liệu. Kiểm tra đã chạy file 006_documents.sql chưa.</li>}
        {docs.isSuccess && list.length === 0 && (
          <li className="p-4 text-sm text-slate-600">
            {docs.data.length === 0
              ? isAdmin ? 'Chưa có tài liệu. Bấm Tiếp nhận tài liệu để tải file từ nhà cung cấp lên.' : 'Chưa có tài liệu. Tài liệu mới sẽ xuất hiện tại đây ngay khi được đăng.'
              : 'Không có tài liệu phù hợp.'}
          </li>
        )}
        {list.map((d) => {
          const isNew = Date.now() - new Date(d.created_at).getTime() < NEW_MS
          const meta = [folderName(d.folder_id) ?? 'Chưa phân loại', dname(d.department_id) ? `Chỉ phòng ${dname(d.department_id)}` : 'Mọi người', fmtSize(d.size_bytes), new Date(d.created_at).toLocaleDateString('vi-VN'), d.source ? `Nguồn: ${d.source}` : '', d.version > 1 ? `Phiên bản ${d.version}` : '', d.profiles?.full_name ? `Đăng bởi ${d.profiles.full_name}` : ''].filter(Boolean)
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
              <FileText size={22} aria-hidden="true" className="shrink-0 text-slate-600" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 font-semibold">
                  {d.pinned && <Pin size={14} aria-label="Đã ghim" className="text-accent" />}
                  <span className="break-words">{d.title}</span>
                  {isNew && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-900">Mới</span>}
                </div>
                {d.description && <p className="mt-0.5 text-sm text-slate-700">{d.description}</p>}
                <p className="mt-0.5 text-xs text-slate-600">{meta.join(' · ')}</p>
              </div>
              <div className="flex gap-1">
                {canPreview(d.file_name) && <button onClick={() => void open(d, true)} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold">Mở</button>}
                <button onClick={() => void open(d, false)} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold">Tải xuống</button>
                {isAdmin && <button onClick={() => setEditing(d)} className="min-h-11 rounded-md px-3 text-sm font-semibold text-accent">Sửa</button>}
              </div>
            </li>
          )
        })}
      </ul>

      {editing && <DocDialog key={editing.id} doc={docs.data?.find((x) => x.id === editing.id) ?? editing} folders={folders.data ?? []} depts={depts} onClose={() => setEditing(null)} />}
    </div>
  )
}
