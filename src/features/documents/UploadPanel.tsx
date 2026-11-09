import { useState, type DragEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { uploadDocument } from './api'
import { ACCEPT, MAX_MB, checkFile, fmtSize } from './files'
import type { Dept, Folder } from './types'

type Item = { file: File; status: 'wait' | 'up' | 'ok' | 'err'; error?: string }
const STATUS: Record<Item['status'], string> = { wait: 'Chờ tải lên', up: 'Đang tải…', ok: 'Đã tiếp nhận', err: 'Lỗi' }
const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra'
const field = 'mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal'

// Tiếp nhận tài liệu từ nhà cung cấp: chọn hoặc kéo thả nhiều file, gán thư mục, phòng ban, nguồn
export function UploadPanel({ folders, depts, userId }: { folders: Folder[]; depts: Dept[]; userId: string }) {
  const qc = useQueryClient()
  const [items, setItems] = useState<Item[]>([])
  const [folder, setFolder] = useState('')
  const [dept, setDept] = useState('')
  const [source, setSource] = useState('')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  const folderDept = folders.find((f) => f.id === folder)?.department_id ?? null
  const effectiveDept = folderDept ?? (dept || null)

  function add(files: FileList | File[]) {
    const next = Array.from(files).map((file): Item => {
      const e = checkFile(file)
      return e ? { file, status: 'err', error: e } : { file, status: 'wait' }
    })
    setItems((prev) => [...prev, ...next])
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (!busy) add(e.dataTransfer.files)
  }

  async function run() {
    setBusy(true)
    for (let i = 0; i < items.length; i++) {
      if (items[i].status !== 'wait') continue
      setItems((p) => p.map((it, k) => (k === i ? { ...it, status: 'up' } : it)))
      try {
        await uploadDocument(items[i].file, { folder_id: folder || null, department_id: effectiveDept, source: source.trim() || null }, userId)
        setItems((p) => p.map((it, k) => (k === i ? { ...it, status: 'ok' } : it)))
      } catch (e) {
        setItems((p) => p.map((it, k) => (k === i ? { ...it, status: 'err', error: errMsg(e) } : it)))
      }
    }
    qc.invalidateQueries({ queryKey: ['documents'] })
    setBusy(false)
  }

  const waiting = items.filter((i) => i.status === 'wait').length
  const failed = items.filter((i) => i.status === 'err')

  return (
    <section aria-label="Tiếp nhận tài liệu" className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Tiếp nhận tài liệu</h2>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-4 text-center text-sm focus-within:outline-2 focus-within:outline-accent ${drag ? 'border-accent bg-orange-50' : 'border-slate-300'}`}
      >
        <Upload size={20} aria-hidden="true" />
        <span className="font-semibold">Kéo thả file vào đây hoặc bấm để chọn (chọn được nhiều file)</span>
        <span className="text-xs text-slate-600">PDF, Word, Excel, PowerPoint, CSV, TXT, PNG, JPG. Tối đa {MAX_MB} MB mỗi file.</span>
        <input type="file" multiple accept={ACCEPT} disabled={busy} className="sr-only" onChange={(e) => { add(e.target.files ?? []); e.target.value = '' }} />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">Thư mục
          <select value={folder} onChange={(e) => setFolder(e.target.value)} className={field}>
            <option value="">Chưa phân loại</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Ai xem được
          <select value={folderDept ?? dept} disabled={!!folderDept} onChange={(e) => setDept(e.target.value)} className={field}>
            <option value="">Mọi người</option>
            {depts.map((d) => <option key={d.id} value={d.id}>Chỉ phòng {d.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Nguồn / nhà cung cấp
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Tùy chọn" className={field} />
        </label>
      </div>
      {folderDept && <p className="mt-1 text-xs text-slate-600">Thư mục này giới hạn theo phòng ban nên tài liệu thừa hưởng quyền xem đó.</p>}

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
          {items.map((it, i) => (
            <li key={`${it.file.name}-${i}`} className="flex flex-wrap items-center justify-between gap-2 p-2.5">
              <span className="min-w-0 break-all">{it.file.name} <span className="text-slate-600">({fmtSize(it.file.size)})</span></span>
              <span className={it.status === 'err' ? 'font-semibold text-red-700' : it.status === 'ok' ? 'font-semibold text-green-800' : 'text-slate-600'}>
                {STATUS[it.status]}{it.error ? `: ${it.error}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={run} disabled={busy || waiting === 0} className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? 'Đang tải lên…' : `Tải lên ${waiting} file`}
        </button>
        {items.length > 0 && !busy && (
          <button onClick={() => setItems([])} className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold">Xóa danh sách</button>
        )}
      </div>
      {failed.length > 0 && !busy && <p role="status" className="mt-2 text-xs text-slate-600">File lỗi sẽ không được tải lên. Sửa lỗi rồi chọn lại file đó.</p>}
    </section>
  )
}
