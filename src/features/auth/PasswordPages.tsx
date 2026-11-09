import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Field, Shell, Submit } from './AuthPages'
import { useAuth } from './AuthProvider'

// Trang xin liên kết đặt lại mật khẩu (gửi qua email)
export function ForgotPage() {
  const [email, setEmail] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError('Chưa gửi được thư. Hãy thử lại sau ít phút hoặc nhờ admin hỗ trợ.')
    else setInfo('Nếu email này có tài khoản, thư hướng dẫn sẽ được gửi trong ít phút. Kiểm tra cả mục thư rác.')
    setBusy(false)
  }

  return (
    <Shell title="Quên mật khẩu" footer={<Link to="/login" className="font-semibold text-accent underline">Quay lại đăng nhập</Link>}>
      <form onSubmit={onSubmit}>
        <Field label="Email đã đăng ký" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        {info && <p role="status" className="mb-4 text-sm text-green-800">{info}</p>}
        <Submit busy={busy}>Gửi liên kết</Submit>
      </form>
    </Shell>
  )
}

// Trang đặt mật khẩu mới: người dùng đến từ liên kết trong email (phiên khôi phục tự được tạo)
export function ResetPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">Đang tải…</div>
  if (!session) {
    return (
      <Shell title="Liên kết không hợp lệ" footer={<Link to="/forgot" className="font-semibold text-accent underline">Yêu cầu liên kết mới</Link>}>
        <p className="text-sm text-slate-700">Liên kết đã hết hạn hoặc đã được dùng.</p>
      </Shell>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pw !== pw2) return setError('Mật khẩu nhập lại không khớp')
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setError(error.message)
    else navigate('/', { replace: true })
    setBusy(false)
  }

  return (
    <Shell title="Đặt mật khẩu mới" footer={null}>
      <form onSubmit={onSubmit}>
        <Field label="Mật khẩu mới (tối thiểu 6 ký tự)" type="password" required minLength={6} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Field label="Nhập lại mật khẩu" type="password" required minLength={6} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <Submit busy={busy}>Lưu mật khẩu</Submit>
      </form>
    </Shell>
  )
}

