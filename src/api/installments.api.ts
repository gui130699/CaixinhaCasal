import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Installment } from '@/types'

export const installmentsApi = {
  async listByFamily(
    familyId: string,
    filters?: { goal_id?: string; user_id?: string; status?: string }
  ): Promise<Installment[]> {
    let q = query(
      collection(db, 'families', familyId, 'installments'),
      orderBy('due_date', 'desc')
    )
    const snap = await getDocs(q)
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Installment[]
    if (filters?.goal_id) results = results.filter(i => i.goal_id === filters.goal_id)
    if (filters?.user_id) results = results.filter(i => i.user_id === filters.user_id)
    if (filters?.status) results = results.filter(i => i.status === filters.status)
    return results
  },

  async listByGoal(goalId: string, familyId: string): Promise<Installment[]> {
    const snap = await getDocs(
      query(
        collection(db, 'families', familyId, 'installments'),
        where('goal_id', '==', goalId),
        orderBy('reference_month')
      )
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Installment[]
  },

  async getCurrentMonth(familyId: string): Promise<Installment[]> {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const snap = await getDocs(
      query(
        collection(db, 'families', familyId, 'installments'),
        where('reference_month', '==', currentMonth)
      )
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Installment[]
  },

  async getOverdue(familyId: string): Promise<Installment[]> {
    const today = new Date().toISOString().substring(0, 10)
    const snap = await getDocs(
      query(
        collection(db, 'families', familyId, 'installments'),
        where('status', 'in', ['pending', 'partial', 'overdue'])
      )
    )
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as Installment)
      .filter(i => i.due_date < today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
  },

  async pay(
    installmentId: string,
    familyId: string,
    form: { paid_amount: number; payment_date: string; payment_method?: string }
  ): Promise<void> {
    const ref = doc(db, 'families', familyId, 'installments', installmentId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Parcela nÃ£o encontrada')
    const current = snap.data() as Installment
    const newPaid = (current.paid_amount ?? 0) + form.paid_amount
    const expected = current.expected_amount ?? 0
    const status: Installment['status'] = newPaid >= expected ? 'paid' : newPaid > 0 ? 'partial' : 'pending'
    await updateDoc(ref, {
      paid_amount: newPaid,
      payment_date: form.payment_date,
      payment_method: form.payment_method ?? null,
      status,
      updated_at: new Date().toISOString(),
    })
  },
}

