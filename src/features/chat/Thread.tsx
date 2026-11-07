import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { fetchMembers } from '../tasks/api'
import { STATUS_LABEL } from '../tasks/types'
import {
  MAX_FILE_MB, PAGE, deleteMessage, editMessage, fetchMessages, fetchShareableTasks, fileUrl, sendMessage, uploadFile,
} from './api'
import type { Message, SharedTask } from './types'

const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra. Thử lại sau.'
const fmt = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)

function MessageItem({ m, name, mine, admin, onChanged }: { m: Message; name: string; mine: boolean; admin: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(m.content)
  const [err, setErr] = useState('')
  const save = useMutation({
    mutationFn: () => editMessage(m.id, text.trim()),
    onSuccess: () => {
      setEditing(false)
      onChanged()
    },
    onError: (e) => setErr(errMsg(e)),
  })
  const del = useMutation({ mutationFn: () => deleteMessage(m), onSuccess: onChanged, onError: (e) => setErr(errMsg(e)) })
  const btn = 'min-h-11 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900'

  async function download() {
    try {
      window.open(await fileUrl(m.file_path!), '_blank', 'noopener')
    } catch (e) {
      setErr(errMsg(e))
    }
  }

  return (
    <li className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
        {name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-600">
          <b className="text-slate-900">{name}</b> {fmt(m.created_at)}{m.edited_at && ' (đã sửa)'}
        </div>
        {editing ? (
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (text.trim()) save.mutate() }} className="mt-1 flex gap-2">
            <label className="sr-only" htmlFor={`e${m.id}`}>Sửa tin nhắn</label>
            <input id={`e${m.id}`} value={text} onChange={(e) => setText(e.target.value)} className="min-h-11 flex-1 rounded-md border border-slate-300 px-3 text-sm" />
            <button className="min-h-11 rounded-md bg-accent px-3 text-sm font-semibold text-white">Lưu</button>
            <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-2 text-sm">Hủy</button>
          </form>
        ) : (
          m.content && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{m.content}</p>
        )}
        {m.tasks && (
          <Link to={`/projects/${m.tasks.project_id}`} className="mt-2 block max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm hover:border-accent">
            <div className="text-xs text-slate-600">Task · {STATUS_LABEL[m.tasks.status]}</div>
            <div className="font-semibold">{m.tasks.title}</div>
          </Link>
        )}
        {m.file_path && (
          <button onClick={download} className="mt-2 block min-h-11 max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm hover:border-accent">
            <span className="font-semibold">{m.file_name}</span>
            {m.file_size ? <span className="text-slate-600"> ({size(m.file_size)})</span> : null}
          </button>
        )}
        {err && <p role="alert" className="text-xs text-red-700">{err}</p>}
        {!editing && (mine || admin) && (
          <div className="-ml-2 flex">
            {mine && <button onClick={() => { setText(m.content); setEditing(true) }} className={btn}>Sửa</button>}
            <button onClick={() => window.confirm('Xóa tin nhắn này?') && del.mutate()} className={btn}>Xóa</button>
          </div>
        )}
      </div>
    </li>
  )
}

export function Thread({ channelId }: { channelId: string }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const key = ['messages', channelId]
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const names = useMemo(() => new Map(members.map((m) => [m.id, m.full_name])), [members])
  const q = useInfiniteQuery({
    queryKey: key,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => fetchMessages(channelId, pageParam),
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].id : undefined),
  })
  // Các trang xếp từ mới đến cũ; đảo lại để hiển thị cũ ở trên, mới ở dưới
  const messages = useMemo(() => (q.data?.pages.flat() ?? []).slice().reverse(), [q.data])
  const lastId = messages[messages.length - 1]?.id
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [lastId, channelId])

  const [text, setText] = useState('')
  const [task, setTask] = useState<SharedTask | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: tasks = [] } = useQuery({ queryKey: ['shareable-tasks'], queryFn: fetchShareableTasks, enabled: picking })

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() && !task && !file) return
    setBusy(true)
    setError('')
    try {
      let file_path: string | null = null
      if (file) file_path = await uploadFile(channelId, file)
      await sendMessage({
        channel_id: channelId, user_id: profile!.id, content: text.trim(), task_id: task?.id ?? null,
        file_path, file_name: file?.name ?? null, file_size: file?.size ?? null,
      })
      setText('')
      setTask(null)
      setFile(null)
      qc.invalidateQueries({ queryKey: key })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  function pickFile(f: File | undefined) {
    if (!f) return
    if (f.size > MAX_FILE_MB * 1e6) setError(`File quá lớn (tối đa ${MAX_FILE_MB} MB)`)
    else {
      setError('')
      setFile(f)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        {q.hasNextPage && (
          <button onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage} className="mx-auto mb-4 block min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold">
            {q.isFetchingNextPage ? 'Đang tải…' : 'Tải tin nhắn cũ hơn'}
          </button>
        )}
        {q.isLoading && <p className="text-sm text-slate-600">Đang tải…</p>}
        {!q.isLoading && messages.length === 0 && <p className="text-sm text-slate-600">Chưa có tin nhắn. Hãy gửi tin đầu tiên.</p>}
        <ul className="flex flex-col gap-4">
          {messages.map((m) => (
            <MessageItem
              key={m.id}
              m={m}
              name={names.get(m.user_id) ?? 'Người dùng'}
              mine={m.user_id === profile?.id}
              admin={profile?.role === 'admin'}
              onChanged={() => qc.invalidateQueries({ queryKey: key })}
            />
          ))}
        </ul>
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="border-t border-slate-200 p-3">
        {(task || file) && (
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
            {task && <button type="button" onClick={() => setTask(null)} className="min-h-11 rounded-full bg-slate-200 px-3">Task: {task.title} ✕</button>}
            {file && <button type="button" onClick={() => setFile(null)} className="min-h-11 rounded-full bg-slate-200 px-3">File: {file.name} ✕</button>}
          </div>
        )}
        {picking && (
          <ul aria-label="Chọn task để đính kèm" className="mb-2 max-h-40 overflow-y-auto rounded-md border border-slate-200 text-sm">
            {tasks.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => { setTask(t); setPicking(false) }} className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left hover:bg-slate-100">
                  <span>{t.title}</span>
                  <span className="text-xs text-slate-600">{STATUS_LABEL[t.status]}</span>
                </button>
              </li>
            ))}
            {tasks.length === 0 && <li className="p-3 text-slate-600">Chưa có task nào.</li>}
          </ul>
        )}
        {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPicking((p) => !p)} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold">Task</button>
          <label className="grid min-h-11 cursor-pointer place-items-center rounded-md border border-slate-300 px-3 text-sm font-semibold focus-within:outline-2 focus-within:outline-accent">
            File
            <input type="file" className="sr-only" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <label className="sr-only" htmlFor="msg">Tin nhắn</label>
          <input id="msg" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập tin nhắn…" autoComplete="off" className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:outline-2 focus:outline-accent" />
          <button disabled={busy} className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Đang gửi…' : 'Gửi'}</button>
        </div>
      </form>
    </>
  )
}
