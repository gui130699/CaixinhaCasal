import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { Profile } from '@/types'

export const profilesApi = {
  async getById(id: string): Promise<Profile | null> {
    const snap = await getDoc(doc(db, 'profiles', id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Profile
  },

  async create(id: string, data: Partial<Profile>): Promise<void> {
    await setDoc(doc(db, 'profiles', id), {
      ...data,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  },

  async update(id: string, data: Partial<Profile>): Promise<Profile> {
    await updateDoc(doc(db, 'profiles', id), {
      ...data,
      updated_at: new Date().toISOString(),
    })
    const snap = await getDoc(doc(db, 'profiles', id))
    return { id: snap.id, ...snap.data() } as Profile
  },

  async updateLastLogin(id: string) {
    await updateDoc(doc(db, 'profiles', id), {
      last_login_at: new Date().toISOString(),
    })
  },

  async isMasterAdmin(userId: string): Promise<boolean> {
    const snap = await getDoc(doc(db, 'adminRoles', userId))
    return snap.exists() && snap.data().role === 'master_admin'
  },

  async listAllWithEmail(): Promise<Profile[]> {
    const snap = await getDocs(query(collection(db, 'profiles'), orderBy('full_name')))
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Profile[]
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const storageRef = ref(storage, `avatars/${userId}.${ext}`)
    await uploadBytes(storageRef, file, { contentType: file.type })
    const url = await getDownloadURL(storageRef)
    await updateDoc(doc(db, 'profiles', userId), {
      avatar_url: url,
      updated_at: new Date().toISOString(),
    })
    return url
  },
}
