import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from 'firebase/auth'
import type { Profile, Family, FamilyMemberRole } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  family: Family | null
  familyRole: FamilyMemberRole | null
  isMasterAdmin: boolean
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setFamily: (family: Family | null) => void
  setFamilyRole: (role: FamilyMemberRole | null) => void
  setMasterAdmin: (value: boolean) => void
  setLoading: (loading: boolean) => void
  setInitialized: (value: boolean) => void
  reset: () => void
}

const initialState = {
  user: null,
  profile: null,
  family: null,
  familyRole: null,
  isMasterAdmin: false,
  isLoading: true,
  isInitialized: false,
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      ...initialState,
      setUser: user => set({ user }),
      setProfile: profile => set({ profile }),
      setFamily: family => set({ family }),
      setFamilyRole: familyRole => set({ familyRole }),
      setMasterAdmin: isMasterAdmin => set({ isMasterAdmin }),
      setLoading: isLoading => set({ isLoading }),
      setInitialized: isInitialized => set({ isInitialized }),
      reset: () => set({ ...initialState, isLoading: false, isInitialized: true }),
    }),
    {
      name: 'caixinha-auth',
      partialize: state => ({
        profile: state.profile,
        family: state.family,
        familyRole: state.familyRole,
        isMasterAdmin: state.isMasterAdmin,
      }),
    }
  )
)
