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
  writeBatch,
  increment,
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
    const now = new Date().toISOString()
    const batch = writeBatch(db)

    const txRef = doc(collection(db, 'families', family_id, 'transactions'))
    batch.set(txRef, { ...rest, family_id, created_at: now })

    // Atualiza saldo da conta origem
    if (data.bank_account_id && data.amount) {
      const accountRef = doc(db, 'families', family_id, 'bankAccounts', data.bank_account_id)
      const delta = data.type === 'deposit' ? data.amount : -data.amount
      batch.update(accountRef, { current_balance: increment(delta), updated_at: now })
    }

    await batch.commit()
    const snap = await getDoc(txRef)
    return { id: snap.id, ...snap.data() } as Transaction
  },

  async createTransfer(data: {
    family_id: string
    from_bank_account_id: string
    to_bank_account_id: string
    amount: number
    transfer_date: string
    description: string
    notes?: string
    user_id: string
    created_by: string
  }): Promise<void> {
    const now = new Date().toISOString()
    const batch = writeBatch(db)
    const base = {
      family_id: data.family_id,
      amount: data.amount,
      transaction_date: data.transfer_date,
      description: data.description,
      notes: data.notes ?? null,
      user_id: data.user_id,
      created_by: data.created_by,
      created_at: now,
    }

    batch.set(doc(collection(db, 'families', data.family_id, 'transactions')), {
      ...base, type: 'transfer_out', bank_account_id: data.from_bank_account_id,
    })
    batch.set(doc(collection(db, 'families', data.family_id, 'transactions')), {
      ...base, type: 'transfer_in', bank_account_id: data.to_bank_account_id,
    })
    batch.update(doc(db, 'families', data.family_id, 'bankAccounts', data.from_bank_account_id), {
      current_balance: increment(-data.amount), updated_at: now,
    })
    batch.update(doc(db, 'families', data.family_id, 'bankAccounts', data.to_bank_account_id), {
      current_balance: increment(data.amount), updated_at: now,
    })
    await batch.commit()
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
