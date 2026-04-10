import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth.api'
import { profilesApi } from '@/api/profiles.api'
import { familiesApi } from '@/api/families.api'
import { useAuthStore } from '@/stores/auth.store'
import { requestNotificationPermission, checkAndNotifyOverdueInstallments } from '@/lib/notifications'
import type { User } from 'firebase/auth'

const AuthContext = createContext<null>(null)

const PUBLIC_PATHS = ['/login', '/register', '/family-setup', '/forgot-password', '/reset-password']

// Lê o pathname atual do hash (HashRouter) — sempre fresco, sem stale closure
function getCurrentPath(): string {
  return window.location.hash.slice(1).split('?')[0] || '/'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    setUser, setProfile, setFamily,
    setFamilyRole, setMasterAdmin, setLoading, setInitialized, reset,
  } = useAuthStore()

  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = authApi.onAuthStateChange(async (user: User | null) => {
      setUser(user)
      if (user) {
        await loadUserData(user.uid)
      } else {
        reset()
        const isPublic = PUBLIC_PATHS.includes(getCurrentPath())
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
        if (PUBLIC_PATHS.includes(getCurrentPath())) navigate('/')
        // Pede permissão e verifica parcelas vencidas
        const granted = await requestNotificationPermission()
        if (granted) {
          checkAndNotifyOverdueInstallments(familyData.family.id, userId).catch(() => {})
        }
      } else {
        // Sem família — redireciona para configuração (exceto se já está lá)
        if (getCurrentPath() !== '/family-setup') navigate('/family-setup')
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
