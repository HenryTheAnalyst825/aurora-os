import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import {
  addComment, awardReward, createTask, deleteTask, fetchComments, fetchHistory, fetchMembers, updateTask,
} from './api'
import { PRIORITY_LABEL, STATUS_LABEL, type HistoryItem, type Priority, type Status, type Task } from './types'

const toLocal = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null)
const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra. Thử lại sau.'
const fmt = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

function historyText(h: HistoryItem) {
  const d = h.detail ?? {}
  if (h.action === 'created') return 'đã tạo task'
  if (h.action === 'status_changed') return `chuyển từ "${STATUS_LABEL[d.from as Status] ?? d.from}" sang "${STATUS_LABEL[d.to as Status] ?? d.to}"`
  if (h.action === 'assignee_changed') return 'đã đổi người phụ trách'
  if (h.action === 'edited') return 'đã chỉnh sửa nội dung'
  return h.action
}

function Comments({ taskId }: { taskId: string }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const { data = [] } = useQuery({ queryKey: ['comments', taskId], queryFn: () => fetchComments(taskId) })
  const send = useMutation({
    mutationFn: () => addComment(taskId, profile!.id, body.trim()),
    onSuccess: () => {
      setBody('')
      qc.invalidateQueries({ queryKey: ['comments', taskId] })
    },
  })
  return (
    <section aria-label="Bình luận" className="mt-6">
      <h3 className="font-semibold">Bình luận</h3>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {data.length === 0 && <li className="text-slate-600">Chưa có bình luận.</li>}
        {data.map((c) => (
          <li key={c.id} className="rounded-md bg-slate-100 p-2">
            <div className="text-xs text-slate-600"><b className="text-slate-900">{c.profiles?.full_name ?? 'Người dùng'}</b> {fmt(c.created_at)}</div>
            <div className="mt-0.5 whitespace-pre-wrap">{c.body}</div>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (body.trim()) send.mutate()
        }}
        className="mt-3 flex gap-2"
      >
        <label className="sr-only" htmlFor="cmt">Viết bình luận</label>
        <input id="cmt" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Viết bình luận…" className="min-h-11 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:outline-2 focus:outline-accent" />
        <button disabled={send.isPending} className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60">Gửi</button>
      </form>
    </section>
  )
}

function History({ taskId }: { taskId: string }) {
  const { data = [] } = useQuery({ queryKey: ['history', taskId], queryFn: () => fetchHistory(taskId) })
  return (
    <section aria-label="Lịch sử" className="mt-6">
      <h3 className="font-semibold">Lịch sử</h3>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
        {data.map((h) => (
          <li key={h.id}>
            <b>{h.profiles?.full_name ?? 'Hệ thống'}</b> {historyText(h)} <span className="text-xs text-slate-600">({fmt(h.created_at)})</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function TaskDialog({ projectId, task, nextPosition, onClose }: { projectId: string; task: Task | null; nextPosition: number; onClose: () => void }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const qc = useQueryClient()
  const ref = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [status, setStatus] = useState<Status>(task?.status ?? 'todo')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? '')
  const [deadline, setDeadline] = useState(toLocal(task?.deadline ?? null))
  const [reward, setReward] = useState(task?.reward_credits ?? 0)
  const [error, setError] = useState('')
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: fetchMembers, enabled: isAdmin })

  useEffect(() => {
    ref.current?.showModal()
  }, [])
  const close = () => ref.current?.close()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    qc.invalidateQueries({ queryKey: ['factory-progress'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!task) {
        await createTask({
          project_id: projectId, title: title.trim(), description: description.trim() || null, priority, position: nextPosition,
          ...(isAdmin ? { assignee_id: assigneeId || null, deadline: fromLocal(deadline), reward_credits: reward } : {}),
        })
        return
      }
      // Chỉ gửi những trường đã thay đổi
      const patch: Record<string, unknown> = {}
      if (title.trim() !== task.title) patch.title = title.trim()
      if ((description.trim() || null) !== (task.description || null)) patch.description = description.trim() || null
      if (priority !== task.priority) patch.priority = priority
      if (status !== task.status) patch.status = status
      if (isAdmin) {
        if ((assigneeId || null) !== task.assignee_id) patch.assignee_id = assigneeId || null
        if (deadline !== toLocal(task.deadline)) patch.deadline = fromLocal(deadline)
        if (reward !== task.reward_credits) patch.reward_credits = reward
      }
      if (Object.keys(patch).length) await updateTask(task.id, patch)
    },
    onSuccess: () => {
      refresh()
      close()
    },
    onError: (e) => setError(errMsg(e)),
  })
  const remove = useMutation({
    mutationFn: () => deleteTask(task!.id),
    onSuccess: () => {
      refresh()
      close()
    },
    onError: (e) => setError(errMsg(e)),
  })
  const pay = useMutation({
    mutationFn: () => awardReward(task!.id),
    onSuccess: refresh,
    onError: (e) => setError(errMsg(e)),
  })

  const field = 'mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal focus:outline-2 focus:outline-accent'
  const label = 'block text-sm font-medium text-slate-700'

  return (
    <dialog ref={ref} onClose={onClose} aria-label={task ? 'Chi tiết task' : 'Thêm task'} className="m-auto max-h-[90vh] w-[min(40rem,calc(100vw-2rem))] rounded-xl p-6 backdrop:bg-black/40">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{task ? 'Chi tiết task' : 'Thêm task'}</h2>
        <button onClick={close} aria-label="Đóng" className="grid size-11 place-items-center rounded-md hover:bg-slate-100">✕</button>
      </div>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          setError('')
          save.mutate()
        }}
        className="grid gap-4"
      >
        <label className={label}>Tiêu đề
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>
        <label className={label}>Mô tả
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} py-2`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Độ ưu tiên
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={field}>
              {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </label>
          {task && (
            <label className={label}>Trạng thái
              <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={field}>
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
          )}
        </div>
        {isAdmin ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={label}>Người phụ trách
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={field}>
                <option value="">Chưa gán</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </label>
            <label className={label}>Hạn chót
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={field} />
            </label>
            <label className={label}>Thưởng (Credits)
              <input type="number" min={0} value={reward} onChange={(e) => setReward(Math.max(0, Number(e.target.value)))} className={field} />
            </label>
          </div>
        ) : task ? (
          <p className="text-sm text-slate-600">
            Người phụ trách: {task.assignee?.full_name ?? 'chưa gán'}. Hạn: {task.deadline ? fmt(task.deadline) : 'chưa có'}. Thưởng: {task.reward_credits} Credits. Chỉ admin được đổi các mục này.
          </p>
        ) : null}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={save.isPending} className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60">
            {task ? 'Lưu thay đổi' : 'Tạo task'}
          </button>
          {isAdmin && task && task.status === 'done' && task.assignee_id && task.reward_credits > 0 && (
            task.reward_paid_at ? (
              <span className="grid min-h-11 place-items-center px-2 text-sm text-slate-600">Đã trả thưởng</span>
            ) : (
              <button type="button" onClick={() => pay.mutate()} disabled={pay.isPending} className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold disabled:opacity-60">
                Trả thưởng {task.reward_credits} Credits
              </button>
            )
          )}
          {isAdmin && task && (
            <button type="button" onClick={() => window.confirm('Xóa task này?') && remove.mutate()} className="ml-auto min-h-11 rounded-md px-4 text-sm font-semibold text-red-700 hover:bg-red-50">
              Xóa task
            </button>
          )}
        </div>
      </form>
      {task && (
        <>
          <Comments taskId={task.id} />
          <History taskId={task.id} />
        </>
      )}
    </dialog>
  )
}
