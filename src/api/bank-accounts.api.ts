import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BankAccount } from '@/types'

export const bankAccountsApi = {
  async listByFamily(familyId: string): Promise<BankAccount[]> {
    const snap = await getDocs(
      query(collection(db, 'families', familyId, 'bankAccounts'), orderBy('nickname'))
    )
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as BankAccount)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
  },

  async getById(id: string, familyId: string): Promise<BankAccount | null> {
    const snap = await getDoc(doc(db, 'families', familyId, 'bankAccounts', id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as BankAccount
  },

  // Overloaded for compatibility: accepts (data) where data.family_id is set
  async create(data: Partial<BankAccount> & { family_id: string }): Promise<BankAccount> {
    const { family_id, ...rest } = data
    const ref = await addDoc(collection(db, 'families', family_id, 'bankAccounts'), {
      ...rest,
      family_id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as BankAccount
  },

  async update(id: string, familyId: string, data: Partial<BankAccount>): Promise<void> {
    await updateDoc(doc(db, 'families', familyId, 'bankAccounts', id), {
      ...data,
      updated_at: new Date().toISOString(),
    })
  },

  async setPrimary(id: string, familyId: string): Promise<void> {
    const accounts = await bankAccountsApi.listByFamily(familyId)
    const batch = writeBatch(db)
    accounts.forEach(a => {
      batch.update(doc(db, 'families', familyId, 'bankAccounts', a.id), { is_primary: a.id === id })
    })
    await batch.commit()
  },

  async toggleStatus(id: string, isActive: boolean, familyId: string): Promise<void> {
    await updateDoc(doc(db, 'families', familyId, 'bankAccounts', id), { status: isActive ? 'active' : 'inactive' })
  },

  async delete(id: string, familyId: string): Promise<void> {
    // Bloqueia exclusão se houver metas ativas vinculadas a esta conta
    const goalsSnap = await getDocs(
      query(
        collection(db, 'families', familyId, 'goals'),
        where('bank_account_id', '==', id),
        where('status', 'in', ['active'])
      )
    )
    if (!goalsSnap.empty) {
      const names = goalsSnap.docs.map(d => d.data().name).join(', ')
      throw new Error(`Conta vinculada à(s) meta(s): ${names}. Troque a conta da meta ou exclua a meta antes de remover esta conta.`)
    }
    await deleteDoc(doc(db, 'families', familyId, 'bankAccounts', id))
  },

  async getTotalBalance(familyId: string): Promise<number> {
    const accounts = await bankAccountsApi.listByFamily(familyId)
    return accounts.filter(a => a.status === 'active').reduce((s, a) => s + (a.current_balance ?? 0), 0)
  },
}
