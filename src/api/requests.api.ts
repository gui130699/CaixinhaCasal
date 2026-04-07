import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GoalRequest, Profile } from '@/types'

export const requestsApi = {
  async list(familyId: string): Promise<GoalRequest[]> {
    const snap = await getDocs(
      query(collection(db, 'families', familyId, 'requests'), orderBy('created_at', 'desc'))
    )
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() })) as GoalRequest[]

    // Enrich with profiles
    const userIds = [...new Set(results.map(r => r.user_id))]
    const profilesMap: Record<string, Profile> = {}
    await Promise.all(
      userIds.map(async uid => {
        const ps = await getDoc(doc(db, 'profiles', uid))
        if (ps.exists()) profilesMap[uid] = { id: ps.id, ...ps.data() } as Profile
      })
    )

    return results.map(r => ({ ...r, profile: profilesMap[r.user_id] }))
  },

  async approve(requestId: string, familyId: string, adminId: string): Promise<void> {
    const reqSnap = await getDoc(doc(db, 'families', familyId, 'requests', requestId))
    if (!reqSnap.exists()) throw new Error('Solicitação não encontrada')
    const req = reqSnap.data() as GoalRequest

    // Reverter parcela para pendente
    await updateDoc(doc(db, 'families', familyId, 'installments', req.installment_id), {
      status: 'pending',
      paid_amount: 0,
      payment_date: null,
      payment_method: null,
      updated_at: new Date().toISOString(),
    })

    // Marcar solicitação como aprovada
    await updateDoc(doc(db, 'families', familyId, 'requests', requestId), {
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
  },

  async reject(requestId: string, familyId: string, adminId: string): Promise<void> {
    await updateDoc(doc(db, 'families', familyId, 'requests', requestId), {
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
  },
}
