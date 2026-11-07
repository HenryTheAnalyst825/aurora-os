import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

function Shell({ title, footer, children }: { title: string; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-bold text-ink">Aurora OS</div>
        <h1 className="mb-6 mt-1 text-xl font-semibold text-slate-900">{title}</h1>
        {children}
        <p className="mt-6 text-sm text-slate-600">{footer}</p>
      </div>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-4 block text-sm font-medium text-slate-700">
      {label}
      <input
        {...props}
        className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 text-base font-normal text-slate-900 focus:outline-2 focus:outline-accent"
      />
    </label>
  )
}

function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="min-h-11 w-full rounded-md bg-accent px-4 font-semibold text-white disabled:opacity-60"
    >
      {busy ? 'Đang xử lý…' : children}
    </button>
  )
}

export function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email hoặc mật khẩu không đúng')
    setBusy(false)
  }

  return (
    <Shell title="Đăng nhập" footer={<>Chưa có tài khoản? <Link to="/register" className="font-semibold text-accent underline">Đăng ký bằng mã</Link></>}>
      <form onSubmit={onSubmit}>
        <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Mật khẩu" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <Submit busy={busy}>Đăng nhập</Submit>
      </form>
    </Shell>
  )
}

export function RegisterPage() {
  const { session } = useAuth()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    // Mã nhân viên được kiểm tra ở server (trigger handle_new_user trong schema.sql)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { invite_code: code.trim().toUpperCase() } },
    })
    if (error) {
      setError(
        error.message.includes('Database error')
          ? 'Mã đăng ký không hợp lệ hoặc đã được sử dụng'
          : error.message,
      )
    } else if (!data.session) {
      setInfo('Đăng ký thành công. Hãy kiểm tra email để xác nhận, rồi đăng nhập.')
    }
    setBusy(false)
  }

  return (
    <Shell title="Đăng ký bằng mã nhân viên" footer={<>Đã có tài khoản? <Link to="/login" className="font-semibold text-accent underline">Đăng nhập</Link></>}>
      <form onSubmit={onSubmit}>
        <Field label="Mã nhân viên" required autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
        <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Mật khẩu (tối thiểu 6 ký tự)" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        {info && <p role="status" className="mb-4 text-sm text-green-800">{info}</p>}
        <Submit busy={busy}>Tạo tài khoản</Submit>
      </form>
    </Shell>
  )
}
