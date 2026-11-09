import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export type Profile = {
  id: string
  employee_code: string
  full_name: string
  role: 'admin' | 'user'
  is_active: boolean
  credits: number
  xp: number
  departments: { name: string } | null
}

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const PROFILE_SELECT = 'id, employee_code, full_name, role, is_active, credits, xp, departments(name)'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  const [profileFor, setProfileFor] = useState<string | null>(null)
  const uid = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!uid) {
      setProfile(null)
      setProfileFor(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setProfile(data as unknown as Profile | null)
        setProfileFor(uid)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  // Đang tải = chưa biết phiên đăng nhập, hoặc đã đăng nhập nhưng chưa tải xong hồ sơ
  // Tải lại hồ sơ (ví dụ sau khi nhận Credits từ game)
  async function refreshProfile() {
    if (!uid) return
    const { data } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', uid).maybeSingle()
    if (data) setProfile(data as unknown as Profile)
  }

  const loading = !ready || (!!uid && profileFor !== uid)

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, refreshProfile, signOut: async () => void (await supabase.auth.signOut()) }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider')
  return ctx
}
