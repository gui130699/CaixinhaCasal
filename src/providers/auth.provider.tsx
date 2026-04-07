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
      } else {
        reset()
        const isPublic = ['/login', '/register', '/family-setup', '/forgot-password', '/reset-password'].includes(location.pathname)
        if (!isPublic) navigate('/login')
      }
    })
    return () => unsubscribe()
  }, []) // eslint-disable-line

  async function loadUserData(userId: string) {
    setLoading(true)
    try {
      // Tenta até 3x com 1s de delay — aguarda o perfil ser criado (race condition no cadastro)
      let profile = null
      for (let i = 0; i < 3; i++) {
        profile = await profilesApi.getById(userId)
        if (profile) break
        await new Promise(r => setTimeout(r, 1000))
      }
      const [isAdmin, familyData] = await Promise.all([
        profilesApi.isMasterAdmin(userId),
        familiesApi.getUserFamily(userId),
      ])
      setProfile(profile)
      setMasterAdmin(isAdmin)
      if (familyData) {
        setFamily(familyData.family)
        setFamilyRole(familyData.role as 'admin' | 'member')
        // Se estava numa página pública, redireciona para o app
        const isPublic = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)
        if (isPublic) navigate('/')
      } else {
        // Sem família — redireciona para configuração (exceto se já está lá)
        if (location.pathname !== '/family-setup') navigate('/family-setup')
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
