import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Family, FamilyMember } from '@/types'

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const familiesApi = {
  async list(): Promise<Family[]> {
    const snap = await getDocs(query(collection(db, 'families'), orderBy('name')))
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Family[]
  },

  async getById(id: string): Promise<Family | null> {
    const snap = await getDoc(doc(db, 'families', id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Family
  },

  async create(data: { name: string }): Promise<Family> {
    const ref = await addDoc(collection(db, 'families'), {
      ...data,
      invite_code: generateInviteCode(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Family
  },

  async update(id: string, data: Partial<Family>): Promise<void> {
    await updateDoc(doc(db, 'families', id), { ...data, updated_at: new Date().toISOString() })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'families', id))
  },

  async getMembers(familyId: string): Promise<FamilyMember[]> {
    const snap = await getDocs(collection(db, 'families', familyId, 'members'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as FamilyMember[]
  },

  async addMember(familyId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    await setDoc(doc(db, 'families', familyId, 'members', userId), {
      user_id: userId,
      family_id: familyId,
      role,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    // setDoc com merge para não falhar se o perfil ainda não existir
    await setDoc(doc(db, 'profiles', userId), { family_id: familyId }, { merge: true })
  },

  async updateMemberRole(familyId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    await updateDoc(doc(db, 'families', familyId, 'members', userId), { role })
  },

  async removeMember(familyId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'families', familyId, 'members', userId), { status: 'inactive' })
  },

  async getUserFamily(userId: string): Promise<{ family: Family; role: string } | null> {
    const profileSnap = await getDoc(doc(db, 'profiles', userId))
    if (!profileSnap.exists()) return null
    const familyId = profileSnap.data().family_id
    if (!familyId) return null
    const [familySnap, memberSnap] = await Promise.all([
      getDoc(doc(db, 'families', familyId)),
      getDoc(doc(db, 'families', familyId, 'members', userId)),
    ])
    if (!familySnap.exists()) return null
    const role = memberSnap.exists() ? memberSnap.data().role : 'member'
    return { family: { id: familySnap.id, ...familySnap.data() } as Family, role }
  },

  async getUserFamilyRole(familyId: string, userId: string): Promise<string | null> {
    const snap = await getDoc(doc(db, 'families', familyId, 'members', userId))
    return snap.exists() ? snap.data().role : null
  },

  async findByInviteCode(code: string): Promise<Family | null> {
    const q = query(collection(db, 'families'), where('invite_code', '==', code))
    const snap = await getDocs(q)
    if (snap.empty) return null
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Family
  },
}
