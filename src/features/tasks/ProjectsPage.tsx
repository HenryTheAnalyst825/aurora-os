import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { createProject, fetchProjects } from './api'

export function ProjectsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const create = useMutation({
    mutationFn: () => createProject(name.trim(), desc.trim() || null, profile!.id),
    onSuccess: () => {
      setName('')
      setDesc('')
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
  const input = 'mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-normal focus:outline-2 focus:outline-accent'

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Dự án</h1>
      {isLoading && <p className="mt-3 text-sm text-slate-600">Đang tải…</p>}
      {!isLoading && projects.length === 0 && <p className="mt-3 text-sm text-slate-600">Chưa có dự án nào.</p>}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <li key={p.id}>
            <Link to={`/projects/${p.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent">
              <div className="font-semibold">{p.name}</div>
              {p.description && <div className="mt-1 text-sm text-slate-600">{p.description}</div>}
            </Link>
          </li>
        ))}
      </ul>
      {profile?.role === 'admin' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            create.mutate()
          }}
          className="mt-8 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 className="font-semibold">Tạo dự án mới</h2>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Tên dự án
            <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Mô tả
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className={input} />
          </label>
          {create.isError && <p role="alert" className="mt-3 text-sm text-red-700">Không tạo được dự án. Thử lại sau.</p>}
          <button disabled={create.isPending} className="mt-4 min-h-11 rounded-md bg-accent px-4 font-semibold text-white disabled:opacity-60">
            Tạo dự án
          </button>
        </form>
      )}
    </div>
  )
}
