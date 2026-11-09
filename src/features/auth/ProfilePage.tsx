import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

export function ProfilePage() {
  const { profile, signOut } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const input = 'mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-normal focus:outline-2 focus:outline-accent'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (pw !== pw2) return setError('Mật khẩu nhập lại không khớp')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setError(error.message)
    else {
      setInfo('Đã đổi mật khẩu.')
      setPw('')
      setPw2('')
    }
    setBusy(false)
  }

  const rows: [string, string][] = [
    ['Họ tên', profile?.full_name ?? ''],
    ['Mã nhân viên', profile?.employee_code ?? ''],
    ['Phòng ban', profile?.departments?.name ?? 'Chưa có'],
    ['Vai trò', profile?.role === 'admin' ? 'Admin' : 'User'],
    ['Credits', String(profile?.credits ?? 0)],
  ]

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold">Hồ sơ</h1>
      <dl className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-1.5">
            <dt className="text-slate-600">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <form onSubmit={onSubmit} className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Đổi mật khẩu</h2>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Mật khẩu mới
          <input type="password" required minLength={6} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Nhập lại mật khẩu mới
          <input type="password" required minLength={6} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {info && <p role="status" className="mt-3 text-sm text-green-800">{info}</p>}
        <button disabled={busy} className="mt-4 min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60">Đổi mật khẩu</button>
      </form>
      <button onClick={signOut} className="mt-4 min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold">Đăng xuất</button>
    </div>
  )
}
