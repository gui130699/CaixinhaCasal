import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/api/auth.api'
import { profilesApi } from '@/api/profiles.api'
import { familiesApi } from '@/api/families.api'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from 'firebase/auth'

const AuthContext = createContext<null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    setUser, setProfile, setFamily,
    setFamilyRole, setMasterAdmin, setLoading, setInitialized, reset,
  } = useAuthStore()

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = authApi.onAuthStateChange(async (user: User | null) => {
      setUser(user)
      if (user) {
        await loadUserData(user.uid)
        const isPublic = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname)
        if (isPublic) navigate('/')
      } else {
        reset()
        const isPublic = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname)
        if (!isPublic) navigate('/login')
      }
    })
    return () => unsubscribe()
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
      if (profile) await profilesApi.updateLastLogin(userId)
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
