import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

type Dept = { id: string; name: string }
type Code = { code: string; full_name: string; status: 'unused' | 'used' | 'revoked'; departments: { name: string } | null }
type User = { id: string; employee_code: string; full_name: string; role: 'admin' | 'user'; department_id: string | null; is_active: boolean; credits: number }

const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra. Thử lại sau.'
const STATUS: Record<Code['status'], string> = { unused: 'Chưa dùng', used: 'Đã dùng', revoked: 'Đã thu hồi' }
const field = 'min-h-11 rounded-md border border-slate-300 bg-white px-2 text-sm'

function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => ((await supabase.from('departments').select('id, name').order('name')).data ?? []) as Dept[],
  })
}

export function AdminCodes() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { data: depts = [] } = useDepartments()
  const [bulk, setBulk] = useState('')
  const [error, setError] = useState('')
  const { data: codes = [] } = useQuery({
    queryKey: ['admin-codes'],
    queryFn: async () =>
      ((await supabase.from('invite_codes').select('code, full_name, status, departments(name)').order('created_at', { ascending: false })).data ?? []) as unknown as Code[],
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-codes'] })

  const create = useMutation({
    mutationFn: async () => {
      // Mỗi dòng: MÃ, Họ tên, Tên phòng ban (phòng ban có thể bỏ trống)
      const rows = bulk.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [code, full_name, dept] = l.split(',').map((s) => s.trim())
        if (!code || !full_name) throw new Error(`Dòng chưa đủ "Mã, Họ tên": ${l}`)
        const d = depts.find((x) => x.name.toLowerCase() === (dept ?? '').toLowerCase())
        if (dept && !d) throw new Error(`Không có phòng ban "${dept}" ở dòng: ${l}`)
        return { code: code.toUpperCase(), full_name, department_id: d?.id ?? null, created_by: profile!.id }
      })
      if (!rows.length) throw new Error('Chưa nhập dòng nào')
      const { error } = await supabase.from('invite_codes').insert(rows)
      if (error) throw error
    },
    onSuccess: () => {
      setBulk('')
      setError('')
      refresh()
    },
    onError: (e) => setError(errMsg(e).includes('duplicate') ? 'Có mã đã tồn tại. Kiểm tra lại danh sách.' : errMsg(e)),
  })
  const revoke = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from('invite_codes').update({ status: 'revoked' }).eq('code', code).eq('status', 'unused')
      if (error) throw error
    },
    onSuccess: refresh,
  })

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Mã đăng ký</h1>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate() }} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">
          Thêm mã (mỗi dòng một người: Mã, Họ tên, Phòng ban)
          <textarea rows={5} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'NV001, Nguyễn Văn A, Sản xuất\nNV002, Trần Thị B, QC'} className={`${field} mt-1 block w-full py-2 font-normal`} />
        </label>
        <p className="mt-1 text-xs text-slate-600">Phòng ban: {depts.map((d) => d.name).join(', ')}</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <button disabled={create.isPending} className="mt-3 min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60">Tạo mã</button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr><th className="p-3">Mã</th><th className="p-3">Họ tên</th><th className="p-3">Phòng ban</th><th className="p-3">Trạng thái</th><th className="p-3"><span className="sr-only">Thao tác</span></th></tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code} className="border-t border-slate-100">
                <td className="p-3 font-semibold">{c.code}</td>
                <td className="p-3">{c.full_name}</td>
                <td className="p-3">{c.departments?.name ?? '-'}</td>
                <td className="p-3">{STATUS[c.status]}</td>
                <td className="p-3">
                  {c.status === 'unused' && <button onClick={() => revoke.mutate(c.code)} className="min-h-11 px-2 font-semibold text-red-700">Thu hồi</button>}
                </td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={5} className="p-3 text-slate-600">Chưa có mã nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminUsers() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { data: depts = [] } = useDepartments()
  const [error, setError] = useState('')
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () =>
      ((await supabase.from('profiles').select('id, employee_code, full_name, role, department_id, is_active, credits').order('full_name')).data ?? []) as User[],
  })
  const update = useMutation({
    mutationFn: async (v: { id: string; patch: Partial<User> }) => {
      const { error } = await supabase.from('profiles').update(v.patch).eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => {
      setError('')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['members'] })
    },
    onError: (e) => setError(errMsg(e)),
  })

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Người dùng</h1>
      <p className="mt-1 text-sm text-slate-600">Bỏ chọn "Hoạt động" để khóa tài khoản: người đó không còn xem hay gửi được dữ liệu nào.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr><th className="p-3">Mã</th><th className="p-3">Họ tên</th><th className="p-3">Phòng ban</th><th className="p-3">Vai trò</th><th className="p-3">Credits</th><th className="p-3">Hoạt động</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === profile?.id
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="p-3 font-semibold">{u.employee_code}</td>
                  <td className="p-3">{u.full_name}</td>
                  <td className="p-3">
                    <select aria-label={`Phòng ban của ${u.full_name}`} value={u.department_id ?? ''} onChange={(e) => update.mutate({ id: u.id, patch: { department_id: e.target.value || null } })} className={field}>
                      <option value="">Chưa có</option>
                      {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <select aria-label={`Vai trò của ${u.full_name}`} disabled={self} value={u.role} onChange={(e) => update.mutate({ id: u.id, patch: { role: e.target.value as User['role'] } })} className={field}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-3">{u.credits}</td>
                  <td className="p-3">
                    <label className="flex min-h-11 items-center gap-2">
                      <input type="checkbox" disabled={self} checked={u.is_active} onChange={(e) => update.mutate({ id: u.id, patch: { is_active: e.target.checked } })} />
                      <span className="sr-only">Hoạt động</span>
                    </label>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
