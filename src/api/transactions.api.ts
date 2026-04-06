import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as limitQuery,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Transaction, InterestRate, Transfer } from '@/types'

export const transactionsApi = {
  async listByFamily(
    familyId: string,
    filters?: { bank_account_id?: string; type?: string; limit?: number }
  ): Promise<{ data: Transaction[] }> {
    const snap = await getDocs(
      query(collection(db, 'families', familyId, 'transactions'), orderBy('transaction_date', 'desc'))
    )
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]
    if (filters?.bank_account_id) results = results.filter(t => t.bank_account_id === filters.bank_account_id)
    if (filters?.type) results = results.filter(t => t.type === filters.type)
    if (filters?.limit) results = results.slice(0, filters.limit)
    return { data: results }
  },

  async create(data: Partial<Transaction> & { family_id: string }): Promise<Transaction> {
    const { family_id, ...rest } = data
    const ref = await addDoc(collection(db, 'families', family_id, 'transactions'), {
      ...rest,
      family_id,
      created_at: new Date().toISOString(),
    })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Transaction
  },

  async delete(id: string, familyId: string): Promise<void> {
    await deleteDoc(doc(db, 'families', familyId, 'transactions', id))
  },
}

export const interestRatesApi = {
  async listByFamily(familyId: string): Promise<InterestRate[]> {
    const snap = await getDocs(
      query(collection(db, 'families', familyId, 'interestRates'), orderBy('reference_month', 'desc'))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as InterestRate[]
  },

  async listByAccount(bankAccountId: string, familyId: string): Promise<InterestRate[]> {
    const snap = await getDocs(
      query(
        collection(db, 'families', familyId, 'interestRates'),
        where('bank_account_id', '==', bankAccountId),
        orderBy('reference_month', 'desc')
      )
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as InterestRate[]
  },

  async create(data: Partial<InterestRate> & { family_id: string }): Promise<InterestRate> {
    const { family_id, ...rest } = data
    const ref = await addDoc(collection(db, 'families', family_id, 'interestRates'), {
      ...rest,
      family_id,
      created_at: new Date().toISOString(),
    })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as InterestRate
  },
}

export const transfersApi = {
  async listByFamily(familyId: string): Promise<Transfer[]> {
    const snap = await getDocs(
      query(collection(db, 'families', familyId, 'transfers'), orderBy('transfer_date', 'desc'))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transfer[]
  },

  async create(data: Partial<Transfer> & { family_id: string }): Promise<Transfer> {
    const { family_id, ...rest } = data
    const ref = await addDoc(collection(db, 'families', family_id, 'transfers'), {
      ...rest,
      family_id,
      created_at: new Date().toISOString(),
    })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Transfer
  },
}
