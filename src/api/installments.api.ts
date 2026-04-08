import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  increment,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Goal, Installment, Profile } from '@/types'
import { goalsApi } from '@/api/goals.api'

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

    // Enrich with goals
    const goalIds = [...new Set(results.map(i => i.goal_id))]
    const goalsMap: Record<string, Goal> = {}
    await Promise.all(
      goalIds.map(async id => {
        const gs = await getDoc(doc(db, 'families', familyId, 'goals', id))
        if (gs.exists()) goalsMap[id] = { id: gs.id, ...gs.data() } as Goal
      })
    )

    // Enrich with profiles
    const userIds = [...new Set(results.map(i => i.user_id))]
    const profilesMap: Record<string, Profile> = {}
    await Promise.all(
      userIds.map(async uid => {
        const ps = await getDoc(doc(db, 'profiles', uid))
        if (ps.exists()) profilesMap[uid] = { id: ps.id, ...ps.data() } as Profile
      })
    )

    return results.map(i => ({
      ...i,
      goal: goalsMap[i.goal_id],
      profile: profilesMap[i.user_id],
    }))
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
    if (!snap.exists()) throw new Error('Parcela não encontrada')
    const current = snap.data() as Installment
    const newPaid = (current.paid_amount ?? 0) + form.paid_amount
    const expected = current.expected_amount ?? 0
    const status: Installment['status'] = newPaid >= expected ? 'paid' : newPaid > 0 ? 'partial' : 'pending'
    const now = new Date().toISOString()

    // Busca goal para obter bank_account_id e dados para a transação
    let goalName: string | null = null
    let bankAccountId: string | null = current.bank_account_id ?? null
    let isOpenEnded = false
    if (current.goal_id) {
      const goalSnap = await getDoc(doc(db, 'families', familyId, 'goals', current.goal_id))
      if (goalSnap.exists()) {
        const g = goalSnap.data()
        goalName = g.name ?? null
        isOpenEnded = !!g.is_open_ended
        if (!bankAccountId) bankAccountId = g.bank_account_id ?? null
      }
    }

    // Batch atômico: atualiza parcela + cria transação + atualiza saldo do banco
    const batch = writeBatch(db)
    batch.update(ref, {
      paid_amount: newPaid,
      payment_date: form.payment_date,
      payment_method: form.payment_method ?? null,
      status,
      updated_at: now,
    })

    if (bankAccountId) {
      const txRef = doc(collection(db, 'families', familyId, 'transactions'))
      batch.set(txRef, {
        family_id: familyId,
        bank_account_id: bankAccountId,
        type: 'deposit',
        amount: form.paid_amount,
        description: goalName
          ? `Parcela ${current.reference_month} — ${goalName}`
          : `Parcela ${current.reference_month}`,
        transaction_date: form.payment_date,
        user_id: current.user_id,
        created_by: current.user_id,
        installment_id: installmentId,
        goal_id: current.goal_id,
        created_at: now,
      })
      batch.update(doc(db, 'families', familyId, 'bankAccounts', bankAccountId), {
        current_balance: increment(form.paid_amount),
        updated_at: now,
      })
    }

    if (current.goal_id) {
      batch.update(doc(db, 'families', familyId, 'goals', current.goal_id), {
        current_balance: increment(form.paid_amount),
        updated_at: now,
      })
    }

    await batch.commit()

    // Verificar se deve estender meta em aberto após última parcela paga
    if (status === 'paid' && isOpenEnded && current.goal_id) {
      const pendingSnap = await getDocs(
        query(
          collection(db, 'families', familyId, 'installments'),
          where('goal_id', '==', current.goal_id),
          where('status', 'in', ['pending', 'partial', 'overdue'])
        )
      )
      if (pendingSnap.empty) {
        await goalsApi.extendOpenEnded(current.goal_id, familyId)
      }
    }
  },

  async requestUndo(
    installmentId: string,
    familyId: string,
    data: {
      goal_id: string
      goal_name: string
      user_id: string
      reference_month: string
      amount: number
    }
  ): Promise<void> {
    await addDoc(collection(db, 'families', familyId, 'requests'), {
      type: 'undo_payment',
      installment_id: installmentId,
      family_id: familyId,
      ...data,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
  },

  /** Admin desfaz pagamento diretamente, sem criar solicitação */
  async undoDirect(installmentId: string, familyId: string): Promise<void> {
    const ref = doc(db, 'families', familyId, 'installments', installmentId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Parcela não encontrada')
    const current = snap.data() as Installment
    const paidAmount = current.paid_amount ?? 0
    const now = new Date().toISOString()

    let bankAccountId: string | null = current.bank_account_id ?? null
    let goalName: string | null = null
    if (current.goal_id) {
      const goalSnap = await getDoc(doc(db, 'families', familyId, 'goals', current.goal_id))
      if (goalSnap.exists()) {
        goalName = goalSnap.data().name ?? null
        if (!bankAccountId) bankAccountId = goalSnap.data().bank_account_id ?? null
      }
    }

    const batch = writeBatch(db)
    batch.update(ref, {
      status: 'pending',
      paid_amount: 0,
      payment_date: null,
      payment_method: null,
      updated_at: now,
    })

    if (bankAccountId && paidAmount > 0) {
      const txRef = doc(collection(db, 'families', familyId, 'transactions'))
      batch.set(txRef, {
        family_id: familyId,
        bank_account_id: bankAccountId,
        type: 'withdrawal',
        amount: paidAmount,
        description: goalName
          ? `Estorno parcela ${current.reference_month} — ${goalName}`
          : `Estorno parcela ${current.reference_month}`,
        transaction_date: now.substring(0, 10),
        user_id: current.user_id,
        created_by: current.user_id,
        installment_id: installmentId,
        goal_id: current.goal_id,
        created_at: now,
      })
      batch.update(doc(db, 'families', familyId, 'bankAccounts', bankAccountId), {
        current_balance: increment(-paidAmount),
        updated_at: now,
      })
    }

    if (current.goal_id && paidAmount > 0) {
      batch.update(doc(db, 'families', familyId, 'goals', current.goal_id), {
        current_balance: increment(-paidAmount),
        updated_at: now,
      })
    }

    await batch.commit()
  },
}

