import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/api/auth.api'
import { profilesApi } from '@/api/profiles.api'
import { familiesApi } from '@/api/families.api'
import { useAuthStore } from '@/stores/auth.store'

const AuthContext = createContext<null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    setUser, setSession, setProfile, setFamily,
    setFamilyRole, setMasterAdmin, setLoading, setInitialized, reset,
  } = useAuthStore()

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Inicializar sessão
    authApi.getSession().then(async session => {
      if (session?.user) {
        setUser(session.user)
        setSession(session)
        await loadUserData(session.user.id)
      } else {
        reset()
      }
    }).catch(() => reset())

    // Escutar mudanças de auth
    const { data: { subscription } } = authApi.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setSession(session)
        await loadUserData(session.user.id)
        // Redirecionar se estava em public route
        const isPublic = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname)
        if (isPublic) navigate('/')
      } else if (event === 'SIGNED_OUT') {
        reset()
        navigate('/login')
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  async function loadUserData(userId: string) {
    setLoading(true)
    try {
      const [profile, isAdmin, familyData] = await Promise.all([
        profilesApi.getById(userId),
        profilesApi.isMasterAdmin(userId),
        familiesApi.getUserFamily(userId),
      ])
      setProfile(profile)
      setMasterAdmin(isAdmin)
      if (familyData) {
        setFamily(familyData.family)
        setFamilyRole(familyData.role as 'admin' | 'member')
      }
      await profilesApi.updateLastLogin(userId)
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
