import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, Flame, Gem, Shield, Sparkles, Swords, Trophy } from 'lucide-react'
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

// Định nghĩa hệ thống Khung LOL 7 bậc cho phần Chat
const LOL_RANKS: Record<string, { name: string; avatarRing: string; avatarBg: string; gemBg: string; ribbonBg: string }> = {
  bronze: {
    name: 'ĐỒNG',
    avatarRing: 'ring-2 ring-amber-700 border border-amber-500',
    avatarBg: 'bg-gradient-to-br from-amber-900 to-stone-800 text-amber-100',
    gemBg: 'bg-amber-700 text-amber-100',
    ribbonBg: 'bg-gradient-to-r from-amber-800 to-amber-600 text-white border-amber-400',
  },
  silver: {
    name: 'BẠC',
    avatarRing: 'ring-2 ring-slate-300 border border-white',
    avatarBg: 'bg-gradient-to-br from-slate-700 to-slate-800 text-white',
    gemBg: 'bg-slate-500 text-white',
    ribbonBg: 'bg-gradient-to-r from-slate-600 to-slate-400 text-slate-950 border-white',
  },
  gold: {
    name: 'VÀNG',
    avatarRing: 'ring-2 ring-yellow-400 border border-amber-200',
    avatarBg: 'bg-gradient-to-br from-yellow-600 to-yellow-800 text-white',
    gemBg: 'bg-yellow-500 text-slate-950',
    ribbonBg: 'bg-gradient-to-r from-yellow-600 via-amber-300 to-yellow-600 text-slate-950 border-yellow-200',
  },
  emerald: {
    name: 'LỤC BẢO',
    avatarRing: 'ring-2 ring-emerald-400 border border-teal-200',
    avatarBg: 'bg-gradient-to-br from-emerald-800 to-teal-900 text-white',
    gemBg: 'bg-emerald-500 text-slate-950',
    ribbonBg: 'bg-gradient-to-r from-emerald-700 to-teal-700 text-slate-950 border-emerald-200',
  },
  diamond: {
    name: 'KIM CƯƠNG',
    avatarRing: 'ring-2 ring-cyan-300 border border-white',
    avatarBg: 'bg-gradient-to-br from-blue-900 via-cyan-500 to-indigo-950 text-white',
    gemBg: 'bg-cyan-400 text-slate-950',
    ribbonBg: 'bg-gradient-to-r from-blue-600 via-cyan-300 to-indigo-600 text-slate-950 border-white',
  },
  master: {
    name: 'CAO THỦ',
    avatarRing: 'ring-2 ring-fuchsia-400 border border-purple-200',
    avatarBg: 'bg-gradient-to-br from-purple-950 via-fuchsia-600 to-rose-900 text-white',
    gemBg: 'bg-fuchsia-500 text-white',
    ribbonBg: 'bg-gradient-to-r from-purple-700 via-fuchsia-400 to-pink-600 text-slate-950 border-pink-200',
  },
  challenger: {
    name: 'THÁCH ĐẤU',
    avatarRing: 'ring-2 ring-amber-300 border border-cyan-200 shadow-[0_0_12px_rgba(251,191,36,0.8)]',
    avatarBg: 'bg-gradient-to-br from-amber-500 via-red-600 to-cyan-500 text-white',
    gemBg: 'bg-gradient-to-r from-amber-400 to-cyan-300 text-slate-950',
    ribbonBg: 'bg-gradient-to-r from-amber-400 via-yellow-200 to-cyan-300 text-slate-950 border-white',
  },
}

function RankChatIcon({ tier, size = 10 }: { tier: string; size?: number }) {
  if (tier === 'challenger') return <Trophy size={size} aria-hidden="true" />
  if (tier === 'master') return <Flame size={size} aria-hidden="true" />
  if (tier === 'diamond' || tier === 'emerald') return <Gem size={size} aria-hidden="true" />
  if (tier === 'gold') return <Sparkles size={size} aria-hidden="true" />
  return <Swords size={size} aria-hidden="true" />
}

function MessageItem({
  m,
  member,
  mine,
  admin,
  onChanged,
}: {
  m: Message
  member?: { full_name: string; rank_tier?: string | null; is_manager_tag?: boolean | null }
  mine: boolean
  admin: boolean
  onChanged: () => void
}) {
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

  const name = member?.full_name ?? 'Người dùng'
  const rankKey = member?.rank_tier
  const rank = rankKey ? LOL_RANKS[rankKey] : undefined
  const isManager = Boolean(member?.is_manager_tag)
  const displayName = isManager ? `Manager - ${name}` : name
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'AU'

  return (
    <li className="flex gap-3">
      {/* Khung Avatar LOL thu nhỏ trong chat */}
      <div className="relative flex shrink-0 items-center justify-center">
        <div
          className={`grid size-10 place-items-center rounded-full text-xs font-bold ${
            rank ? `${rank.avatarBg} ${rank.avatarRing}` : 'bg-slate-200 text-slate-700'
          }`}
        >
          {initials}
        </div>
        {rank && rankKey && (
          <span
            className={`-bottom-1 absolute inline-flex items-center justify-center rounded-full border px-1 text-[8px] font-black ${rank.gemBg}`}
          >
            <RankChatIcon tier={rankKey} size={9} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
          {isManager && (
            <span className="inline-flex items-center gap-0.5 rounded bg-orange-600 px-1 py-0.2 text-[9px] font-bold text-white">
              <Crown size={9} aria-hidden="true" />
              MGR
            </span>
          )}
          <b className="text-slate-900">{displayName}</b>
          
          {/* Ruy-băng Rank thu nhỏ ngay cạnh tên người chat */}
          {rank && rankKey && (
            <span
              className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${rank.ribbonBg}`}
            >
              <Shield size={9} aria-hidden="true" />
              {rank.name}
            </span>
          )}

          <span className="text-slate-400">·</span>
          <span>{fmt(m.created_at)}</span>
          {m.edited_at && ' (đã sửa)'}
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
  
  // Tạo Map ánh xạ user_id sang toàn bộ thông tin profile (họ tên, rank_tier, is_manager_tag)
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const q = useInfiniteQuery({
    queryKey: key,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => fetchMessages(channelId, pageParam),
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].id : undefined),
  })

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
              member={memberMap.get(m.user_id)}
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