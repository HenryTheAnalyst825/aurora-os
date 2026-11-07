import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { fetchMembers } from '../tasks/api'
import { createChannel, openDm } from './api'
import type { Channel, Dm } from './types'

const GROUPS: { type: Channel['type']; title: string }[] = [
  { type: 'general', title: 'Kênh chung' },
  { type: 'department', title: 'Phòng ban' },
  { type: 'project', title: 'Dự án' },
]

export function ChannelList({ channels, dms, activeId }: { channels: Channel[]; dms: Dm[]; activeId?: string }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const link = (id: string) =>
    `flex min-h-11 items-center rounded-md px-3 text-sm ${id === activeId ? 'bg-slate-200 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`

  const startDm = useMutation({
    mutationFn: openDm,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['dms'] })
      navigate(`/chat/${id}`)
    },
  })
  const add = useMutation({
    mutationFn: () => createChannel(name.trim().toLowerCase().replace(/\s+/g, '-'), profile!.id),
    onSuccess: () => {
      setName('')
      qc.invalidateQueries({ queryKey: ['channels'] })
    },
  })
  const h = 'mx-3 mb-1 mt-4 text-xs font-semibold text-slate-600'

  return (
    <nav aria-label="Danh sách kênh" className="flex flex-col overflow-y-auto p-2">
      {GROUPS.map((g) => {
        const list = channels.filter((c) => c.type === g.type)
        if (!list.length) return null
        return (
          <div key={g.type}>
            <h2 className={h}>{g.title}</h2>
            {list.map((c) => (
              <Link key={c.id} to={`/chat/${c.id}`} className={link(c.id)}># {c.name}</Link>
            ))}
          </div>
        )
      })}
      <h2 className={h}>Tin nhắn riêng</h2>
      {dms.map((d) => (
        <Link key={d.dm_channel_id} to={`/chat/${d.dm_channel_id}`} className={link(d.dm_channel_id)}>{d.other_name}</Link>
      ))}
      <label className="mx-3 mt-2 block text-xs font-medium text-slate-600">
        Nhắn riêng với…
        <select
          value=""
          onChange={(e) => e.target.value && startDm.mutate(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
        >
          <option value="">Chọn người</option>
          {members.filter((m) => m.id !== profile?.id).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      </label>
      {profile?.role === 'admin' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (name.trim()) add.mutate()
          }}
          className="mx-3 mt-4"
        >
          <label className="block text-xs font-medium text-slate-600">
            Tạo kênh chung mới (admin)
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="don-hang-gap" className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-900" />
          </label>
          {add.isError && <p role="alert" className="mt-1 text-xs text-red-700">Không tạo được kênh.</p>}
          <button className="mt-2 min-h-11 w-full rounded-md border border-slate-300 text-sm font-semibold">Tạo kênh</button>
        </form>
      )}
    </nav>
  )
}
