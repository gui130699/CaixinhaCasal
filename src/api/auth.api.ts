import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export const authApi = {
  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  },

  async signUp(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    return credential.user
  },

  async signOut() {
    await signOut(auth)
  },

  getCurrentUser(): User | null {
    return auth.currentUser
  },

  async sendPasswordReset(email: string) {
    const actionCodeSettings = { url: `${window.location.origin}/login` }
    await sendPasswordResetEmail(auth, email, actionCodeSettings)
  },

  async updatePassword(newPassword: string) {
    const user = auth.currentUser
    if (!user) throw new Error('Usuário não autenticado')
    await updatePassword(user, newPassword)
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback)
  },
}
