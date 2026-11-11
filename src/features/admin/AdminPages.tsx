import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

type Dept = { id: string; name: string }
type Code = {
  code: string
  full_name: string | null
  status: 'unused' | 'used' | 'revoked'
  departments: { name: string } | null
}
type User = {
  id: string
  employee_code: string
  full_name: string
  role: 'admin' | 'user'
  department_id: string | null
  is_active: boolean
  credits: number
}

const errMsg = (e: unknown) => (e as { message?: string })?.message ?? 'Có lỗi xảy ra. Thử lại sau.'
const STATUS: Record<Code['status'], string> = { unused: 'Chưa dùng', used: 'Đã dùng', revoked: 'Đã thu hồi' }
const field = 'min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900'

function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => ((await supabase.from('departments').select('id, name').order('name')).data ?? []) as Dept[],
  })
}

export function AdminCodes() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [mode, setMode] = useState<'range' | 'manual'>('range')
  const [startCode, setStartCode] = useState('260048200')
  const [count, setCount] = useState(5)
  const [bulk, setBulk] = useState('')
  const [issued, setIssued] = useState('')
  const [error, setError] = useState('')

  const { data: codes = [] } = useQuery({
    queryKey: ['admin-codes'],
    queryFn: async () =>
      ((await supabase
        .from('invite_codes')
        .select('code, full_name, status, departments(name)')
        .order('created_at', { ascending: false })).data ?? []) as unknown as Code[],
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-codes'] })

  // Gợi ý mã tiếp theo dựa trên mã số lớn nhất đã có trong danh sách
  function suggestNextBase() {
    const numericCodes = codes
      .map((c) => c.code.trim())
      .filter((c) => /^\d+$/.test(c))
      .map((c) => BigInt(c))
    if (numericCodes.length === 0) return '260048200'
    const maxVal = numericCodes.reduce((a, b) => (a > b ? a : b), BigInt('260048200'))
    return (maxVal + 1n).toString()
  }

  const create = useMutation({
    mutationFn: async () => {
      let codeList: string[] = []

      if (mode === 'range') {
        const cleanStart = startCode.trim()
        if (!/^\d+$/.test(cleanStart)) {
          throw new Error('Mã bắt đầu phải là dãy số (ví dụ: 260048200)')
        }
        if (cleanStart.length < 6) {
          throw new Error('Mã nhân viên phải có tối thiểu 6 chữ số')
        }
        const qty = Math.min(Math.max(1, Number(count) || 1), 100)
        const base = BigInt(cleanStart)
        const padLen = cleanStart.length
        for (let i = 0; i < qty; i++) {
          codeList.push((base + BigInt(i)).toString().padStart(padLen, '0'))
        }
      } else {
        codeList = bulk
          .split('\n')
          .map((l) => l.trim().toUpperCase())
          .filter(Boolean)
        if (!codeList.length) throw new Error('Chưa nhập mã nhân viên nào')
        const invalid = codeList.find((c) => c.length < 6)
        if (invalid) throw new Error(`Mã nhân viên phải từ 6 ký tự trở lên: ${invalid}`)
      }

      const rows = codeList.map((code) => ({
        code,
        full_name: 'Chờ nhân viên đăng ký',
        department_id: null,
        created_by: profile!.id,
      }))

      const { error } = await supabase.from('invite_codes').insert(rows)
      if (error) throw error
      return codeList
    },
    onSuccess: (createdCodes) => {
      setIssued(createdCodes.join('\n'))
      setBulk('')
      setError('')
      // Tự động tăng mã bắt đầu cho lần bấm tiếp theo
      if (mode === 'range' && /^\d+$/.test(startCode.trim())) {
        const nextStart = BigInt(startCode.trim()) + BigInt(createdCodes.length)
        setStartCode(nextStart.toString().padStart(startCode.trim().length, '0'))
      }
      refresh()
    },
    onError: (e) =>
      setError(errMsg(e).includes('duplicate') ? 'Có mã nhân viên đã tồn tại. Hãy kiểm tra lại số bắt đầu.' : errMsg(e)),
  })

  const revoke = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase
        .from('invite_codes')
        .update({ status: 'revoked' })
        .eq('code', code)
        .eq('status', 'unused')
      if (error) throw error
    },
    onSuccess: refresh,
  })

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Cấp mã nhân viên (ID Đăng ký)</h1>
      <p className="mt-1 text-sm text-slate-600">
        Admin chỉ cần tạo mã ID nhân viên (ví dụ từ <code className="font-mono font-semibold">260048200</code> trở lên). Nhân viên sẽ tự điền Họ tên và Phòng ban khi đăng ký.
      </p>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          create.mutate()
        }}
        className="mt-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-wrap gap-4 border-b border-slate-100 pb-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="radio"
              name="code-mode"
              checked={mode === 'range'}
              onChange={() => setMode('range')}
            />
            Tạo dải mã số tuần tự (260048200, 01, 02…)
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="radio"
              name="code-mode"
              checked={mode === 'manual'}
              onChange={() => setMode('manual')}
            />
            Nhập tay từng mã
          </label>
        </div>

        {mode === 'range' ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Mã bắt đầu
              <div className="mt-1 flex gap-2">
                <input
                  value={startCode}
                  onChange={(e) => setStartCode(e.target.value)}
                  placeholder="260048200"
                  className={`${field} w-full font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setStartCode(suggestNextBase())}
                  className="min-h-11 shrink-0 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Lấy số tiếp theo
                </button>
              </div>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Số lượng mã cần tạo
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className={`${field} mt-1 block w-full`}
              />
            </label>
          </div>
        ) : (
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Mỗi dòng một mã nhân viên (không cần nhập họ tên hay phòng ban)
            <textarea
              rows={4}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={'260048200\n260048201\n260048202'}
              className={`${field} mt-1 block w-full py-2 font-mono font-normal`}
            />
          </label>
        )}

        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <button
          disabled={create.isPending}
          className="mt-3 min-h-11 rounded-md bg-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {create.isPending ? 'Đang tạo…' : 'Tạo mã nhân viên'}
        </button>
      </form>

      {issued && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">
            Danh sách mã nhân viên vừa tạo (gửi cho nhân viên để đăng ký)
            <textarea
              readOnly
              rows={Math.min(8, issued.split('\n').length)}
              value={issued}
              className={`${field} mt-1 block w-full py-2 font-mono font-normal`}
            />
          </label>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(issued)}
            className="mt-2 min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold"
          >
            Sao chép danh sách mã
          </button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="p-3">Mã nhân viên (ID)</th>
              <th className="p-3">Người sử dụng</th>
              <th className="p-3">Phòng ban</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code} className="border-t border-slate-100">
                <td className="p-3 font-mono font-semibold">{c.code}</td>
                <td className="p-3 text-slate-700">
                  {c.status === 'unused' ? <span className="text-slate-400">Chưa đăng ký</span> : c.full_name}
                </td>
                <td className="p-3">{c.departments?.name ?? '-'}</td>
                <td className="p-3">{STATUS[c.status]}</td>
                <td className="p-3">
                  {c.status === 'unused' && (
                    <button
                      onClick={() => revoke.mutate(c.code)}
                      className="min-h-11 px-2 font-semibold text-red-700"
                    >
                      Thu hồi
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-slate-600">Chưa có mã nào.</td>
              </tr>
            )}
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
  const [flash, setFlash] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () =>
      ((await supabase
        .from('profiles')
        .select('id, employee_code, full_name, role, department_id, is_active, credits')
        .order('full_name')).data ?? []) as User[],
  })

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] })
    qc.invalidateQueries({ queryKey: ['members'] })
  }

  const update = useMutation({
    mutationFn: async (v: { id: string; patch: Partial<User> }) => {
      const { error } = await supabase.from('profiles').update(v.patch).eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => {
      setError('')
      setFlash('')
      refreshAll()
    },
    onError: (e) => setError(errMsg(e)),
  })

  const deleteUser = useMutation({
    mutationFn: async (u: User) => {
      const { error } = await supabase.rpc('admin_delete_inactive_user', { p_user_id: u.id })
      if (error) throw error
      return u
    },
    onSuccess: (u) => {
      setError('')
      setFlash(`Đã xóa vĩnh viễn tài khoản "${u.full_name}" (${u.employee_code}). Toàn bộ nội dung đóng góp của họ vẫn được giữ lại.`)
      refreshAll()
    },
    onError: (e) => setError(errMsg(e)),
  })

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold">Người dùng</h1>
      <p className="mt-1 text-sm text-slate-600">
        Bỏ chọn <b>"Hoạt động"</b> để tạm ngưng (khóa) tài khoản. Sau khi tài khoản đã bị khóa, nút <b>"Xóa vĩnh viễn"</b> sẽ xuất hiện (mọi tin nhắn, công việc, tài liệu của họ vẫn được giữ nguyên).
      </p>
      {flash && <p role="status" className="mt-3 rounded-md bg-green-100 px-3 py-2 text-sm font-semibold text-green-900">{flash}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="p-3">Mã ID</th>
              <th className="p-3">Họ tên</th>
              <th className="p-3">Phòng ban</th>
              <th className="p-3">Vai trò</th>
              <th className="p-3">Credits</th>
              <th className="p-3">Hoạt động</th>
              <th className="p-3">Xóa tài khoản</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === profile?.id
              return (
                <tr key={u.id} className={`border-t border-slate-100 ${!u.is_active ? 'bg-slate-50/70' : ''}`}>
                  <td className="p-3 font-mono font-semibold">{u.employee_code}</td>
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{u.full_name}</div>
                    {!u.is_active && <span className="text-xs font-semibold text-amber-800">Đang tạm khóa</span>}
                  </td>
                  <td className="p-3">
                    <select
                      aria-label={`Phòng ban của ${u.full_name}`}
                      value={u.department_id ?? ''}
                      onChange={(e) => update.mutate({ id: u.id, patch: { department_id: e.target.value || null } })}
                      className={field}
                    >
                      <option value="">Chưa có</option>
                      {depts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      aria-label={`Vai trò của ${u.full_name}`}
                      disabled={self}
                      value={u.role}
                      onChange={(e) => update.mutate({ id: u.id, patch: { role: e.target.value as User['role'] } })}
                      className={field}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-3 font-semibold">{u.credits}</td>
                  <td className="p-3">
                    <label className="flex min-h-11 items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={self}
                        checked={u.is_active}
                        onChange={(e) => update.mutate({ id: u.id, patch: { is_active: e.target.checked } })}
                      />
                      <span className="text-xs text-slate-600">{u.is_active ? 'Đang mở' : 'Đã khóa'}</span>
                    </label>
                  </td>
                  <td className="p-3">
                    {!self && !u.is_active ? (
                      <button
                        type="button"
                        disabled={deleteUser.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Xác nhận XÓA VĨNH VIỄN tài khoản "${u.full_name}" (Mã: ${u.employee_code})?\n\nLưu ý: Tài khoản đăng nhập sẽ bị xóa hẳn, nhưng toàn bộ tin nhắn, tài liệu và công việc người này từng tạo vẫn được giữ lại.`
                            )
                          ) {
                            deleteUser.mutate(u)
                          }
                        }}
                        className="min-h-11 rounded-md border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Xóa vĩnh viễn
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {self ? 'Tài khoản của bạn' : 'Khóa trước khi xóa'}
                      </span>
                    )}
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