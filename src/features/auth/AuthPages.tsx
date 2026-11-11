import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

type Dept = { id: string; name: string }

export function Shell({ title, footer, children }: { title: string; footer: ReactNode; children: ReactNode }) {
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

export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
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

export function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
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
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      const raw = identifier.trim()
      let loginEmail = raw

      // Nếu người dùng nhập Mã nhân viên (không có dấu @), tra cứu email qua RPC
      if (!raw.includes('@')) {
        const { data, error: rpcErr } = await supabase.rpc('resolve_login_identifier', {
          p_identifier: raw,
        })
        if (rpcErr || !data) {
          setError('Không tìm thấy tài khoản với Mã nhân viên này')
          setBusy(false)
          return
        }
        loginEmail = data as string
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })
      if (signInErr) {
        setError('Email / Mã nhân viên hoặc mật khẩu không đúng')
      }
    } catch {
      setError('Có lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell
      title="Đăng nhập"
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-accent underline">
            Đăng ký bằng mã
          </Link>
          <br />
          <Link to="/forgot" className="font-semibold text-accent underline">
            Quên mật khẩu?
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <Field
          label="Email hoặc Mã nhân viên (ID)"
          type="text"
          required
          placeholder="vd: 260048200 hoặc ten@gmail.com"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <Field
          label="Mật khẩu"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <Submit busy={busy}>Đăng nhập</Submit>
      </form>
    </Shell>
  )
}

export function RegisterPage() {
  const { session, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Bước 1: Tạo tài khoản bằng Mã nhân viên + Email + Mật khẩu
  // Bước 2: Điền thông tin cá nhân (Họ tên, Phòng ban) ngay sau khi tạo tài khoản
  const [step, setStep] = useState<'account' | 'profile'>('account')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [fullName, setFullName] = useState('')
  const [deptId, setDeptId] = useState('')
  const [depts, setDepts] = useState<Dept[]>([])

  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('departments')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setDepts(data as Dept[])
      })
  }, [])

  // Chỉ tự động chuyển về "/" nếu đã đăng nhập sẵn từ trước (không phải đang ở Bước 2 điền hồ sơ)
  if (session && step === 'account') return <Navigate to="/" replace />

  async function onAccountSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')

    const cleanCode = code.trim().toUpperCase()
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { invite_code: cleanCode } },
    })

    if (signUpErr) {
      setError(
        signUpErr.message.includes('Database error')
          ? 'Mã nhân viên không hợp lệ hoặc đã được sử dụng'
          : signUpErr.message,
      )
      setBusy(false)
      return
    }

    // Nếu Supabase trả về session ngay -> Chuyển sang Bước 2 để điền Họ tên & Phòng ban
    if (data.session) {
      setStep('profile')
    } else {
      // Trường hợp project bật Confirm Email mới cấp session
      setInfo('Tài khoản đã được tạo! Hãy kiểm tra email để xác nhận, sau đó đăng nhập để cập nhật thông tin cá nhân.')
    }
    setBusy(false)
  }

  async function onProfileSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn')
      return
    }
    if (!deptId) {
      setError('Vui lòng chọn phòng ban của bạn')
      return
    }

    setBusy(true)
    setError('')
    try {
      const { error: rpcErr } = await supabase.rpc('complete_onboarding_profile', {
        p_full_name: fullName.trim(),
        p_department_id: deptId,
        p_job_title: null,
      })
      if (rpcErr) throw rpcErr
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Không lưu được thông tin cá nhân.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'profile') {
    return (
      <Shell
        title="Thông tin cá nhân"
        footer={<span className="text-xs text-slate-500">Mã nhân viên của bạn: <b className="font-mono text-slate-800">{code.trim().toUpperCase()}</b> (Có thể dùng mã này hoặc Email để đăng nhập lần sau).</span>}
      >
        <form onSubmit={onProfileSubmit}>
          <Field
            label="Họ và tên"
            required
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <label className="mb-4 block text-sm font-medium text-slate-700">
            Phòng ban
            <select
              required
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 focus:outline-2 focus:outline-accent"
            >
              <option value="">-- Chọn phòng ban --</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
          <Submit busy={busy}>Hoàn tất & Vào hệ thống</Submit>
        </form>
      </Shell>
    )
  }

  return (
    <Shell
      title="Đăng ký bằng mã nhân viên"
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-accent underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={onAccountSubmit}>
        <Field
          label="Mã nhân viên (ID được cấp)"
          required
          placeholder="vd: 260048200"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Mật khẩu (tối thiểu 6 ký tự)"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        {info && <p role="status" className="mb-4 text-sm text-green-800">{info}</p>}
        <Submit busy={busy}>Tiếp tục điền thông tin →</Submit>
      </form>
    </Shell>
  )
}