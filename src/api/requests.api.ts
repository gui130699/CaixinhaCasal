import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
  increment,
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
    const now = new Date().toISOString()

    // Busca a parcela para obter bank_account_id e o valor pago real
    let bankAccountId: string | null = null
    let paidAmount = req.amount ?? 0
    const installSnap = await getDoc(doc(db, 'families', familyId, 'installments', req.installment_id))
    if (installSnap.exists()) {
      const inst = installSnap.data()
      bankAccountId = inst.bank_account_id ?? null
      paidAmount = inst.paid_amount ?? paidAmount
    }

    // Fallback: busca bank_account_id da goal
    if (!bankAccountId && req.goal_id) {
      const goalSnap = await getDoc(doc(db, 'families', familyId, 'goals', req.goal_id))
      if (goalSnap.exists()) bankAccountId = goalSnap.data().bank_account_id ?? null
    }

    const batch = writeBatch(db)

    // Reverter parcela para pendente
    batch.update(doc(db, 'families', familyId, 'installments', req.installment_id), {
      status: 'pending',
      paid_amount: 0,
      payment_date: null,
      payment_method: null,
      updated_at: now,
    })

    // Marcar solicitação como aprovada
    batch.update(doc(db, 'families', familyId, 'requests', requestId), {
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: now,
    })

    // Estornar saldo do banco se houver conta vinculada
    if (bankAccountId && paidAmount > 0) {
      const txRef = doc(collection(db, 'families', familyId, 'transactions'))
      batch.set(txRef, {
        family_id: familyId,
        bank_account_id: bankAccountId,
        type: 'withdrawal',
        amount: paidAmount,
        description: req.goal_name
          ? `Estorno parcela ${req.reference_month} — ${req.goal_name}`
          : `Estorno parcela ${req.reference_month ?? ''}`,
        transaction_date: now.substring(0, 10),
        user_id: req.user_id,
        created_by: adminId,
        installment_id: req.installment_id,
        goal_id: req.goal_id,
        created_at: now,
      })
      batch.update(doc(db, 'families', familyId, 'bankAccounts', bankAccountId), {
        current_balance: increment(-paidAmount),
        updated_at: now,
      })
    }

    await batch.commit()
  },

  async reject(requestId: string, familyId: string, adminId: string): Promise<void> {
    await updateDoc(doc(db, 'families', familyId, 'requests', requestId), {
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
  },
}
