import {
  createContext, useContext, useEffect,
  useState, useRef, ReactNode,
} from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  preferred_currency: string
  preferred_language: string
  role: string
  kyc_status: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Prevent onAuthStateChange from racing with getSession on first mount
  const initialised = useRef(false)

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) setProfile(data)
    } catch (e) {
      console.warn('fetchProfile error:', e)
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    // 1. Listen FIRST so we never miss an event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth]', _event, session?.user?.email ?? 'no user')

        // Skip the very first INITIAL_SESSION fired by onAuthStateChange —
        // getSession() below is handling that to avoid a double-init race
        if (!initialised.current) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const uid = session.user.id
          setTimeout(() => { fetchProfile(uid) }, 0)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    // 2. Then resolve the initial session once
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialised.current = true
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user.id)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
