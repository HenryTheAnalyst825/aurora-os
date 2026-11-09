import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDocument, replaceFile, updateDocument } from './api'
import { ACCEPT, checkFile } from './files'
import type { Dept, DocRow, Folder } from './types'

const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra. Thử lại sau.'
const field = 'mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal'
const label = 'block text-sm font-medium text-slate-700'

// Admin: sửa thông tin, thay file mới (phiên bản mới) hoặc xóa tài liệu
export function DocDialog({ doc, folders, depts, onClose }: { doc: DocRow; folders: Folder[]; depts: Dept[]; onClose: () => void }) {
  const qc = useQueryClient()
  const ref = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(doc.title)
  const [description, setDescription] = useState(doc.description ?? '')
  const [source, setSource] = useState(doc.source ?? '')
  const [folder, setFolder] = useState(doc.folder_id ?? '')
  const [dept, setDept] = useState(doc.department_id ?? '')
  const [pinned, setPinned] = useState(doc.pinned)
  const [error, setError] = useState('')
  const folderDept = folders.find((f) => f.id === folder)?.department_id ?? null

  useEffect(() => { ref.current?.showModal() }, [])
  const close = () => ref.current?.close()
  const done = () => { qc.invalidateQueries({ queryKey: ['documents'] }); close() }
  const fail = (e: unknown) => setError(errMsg(e))

  const save = useMutation({
    mutationFn: async () => {
      const patch: Record<string, unknown> = {}
      if (title.trim() !== doc.title) patch.title = title.trim()
      if ((description.trim() || null) !== doc.description) patch.description = description.trim() || null
      if ((source.trim() || null) !== doc.source) patch.source = source.trim() || null
      if ((folder || null) !== doc.folder_id) patch.folder_id = folder || null
      if ((folderDept ?? (dept || null)) !== doc.department_id) patch.department_id = folderDept ?? (dept || null)
      if (pinned !== doc.pinned) patch.pinned = pinned
      if (Object.keys(patch).length) await updateDocument(doc.id, patch)
    },
    onSuccess: done, onError: fail,
  })
  const replace = useMutation({ mutationFn: (f: File) => replaceFile(doc, f), onSuccess: done, onError: fail })
  const remove = useMutation({ mutationFn: () => deleteDocument(doc), onSuccess: done, onError: fail })

  function pick(f: File | undefined) {
    if (!f) return
    const e = checkFile(f)
    if (e) return setError(e)
    if (window.confirm(`Thay file hiện tại bằng "${f.name}"? Mọi người sẽ thấy phiên bản ${doc.version + 1}.`)) replace.mutate(f)
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-label="Sửa tài liệu" className="m-auto max-h-[90vh] w-[min(36rem,calc(100vw-2rem))] rounded-xl p-6 backdrop:bg-black/40">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sửa tài liệu</h2>
        <button onClick={close} aria-label="Đóng" className="grid size-11 place-items-center rounded-md hover:bg-slate-100">✕</button>
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(''); save.mutate() }} className="grid gap-4">
        <label className={label}>Tiêu đề<input required value={title} onChange={(e) => setTitle(e.target.value)} className={field} /></label>
        <label className={label}>Mô tả<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} py-2`} /></label>
        <label className={label}>Nguồn / nhà cung cấp<input value={source} onChange={(e) => setSource(e.target.value)} className={field} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Thư mục
            <select value={folder} onChange={(e) => setFolder(e.target.value)} className={field}>
              <option value="">Chưa phân loại</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label className={label}>Ai xem được
            <select value={folderDept ?? dept} disabled={!!folderDept} onChange={(e) => setDept(e.target.value)} className={field}>
              <option value="">Mọi người</option>
              {depts.map((d) => <option key={d.id} value={d.id}>Chỉ phòng {d.name}</option>)}
            </select>
          </label>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />Ghim lên đầu danh sách</label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={save.isPending} className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60">Lưu thay đổi</button>
          <label className="grid min-h-11 cursor-pointer place-items-center rounded-md border border-slate-300 px-4 text-sm font-semibold focus-within:outline-2 focus-within:outline-accent">
            {replace.isPending ? 'Đang thay file…' : `Thay file mới (v${doc.version + 1})`}
            <input type="file" accept={ACCEPT} className="sr-only" disabled={replace.isPending} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <button type="button" onClick={() => window.confirm('Xóa tài liệu này? Không thể hoàn tác.') && remove.mutate()} className="ml-auto min-h-11 rounded-md px-4 text-sm font-semibold text-red-700 hover:bg-red-50">Xóa tài liệu</button>
        </div>
      </form>
    </dialog>
  )
}
