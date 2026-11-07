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
  signOut: () => Promise<void>
}

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
      .select('id, employee_code, full_name, role, is_active, credits, xp, departments(name)')
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
  const loading = !ready || (!!uid && profileFor !== uid)

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signOut: async () => void (await supabase.auth.signOut()) }}
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
