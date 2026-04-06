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
      query(collection(db, 'families', familyId, 'transactions'), orderBy('date', 'desc'))
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
      query(collection(db, 'families', familyId, 'interestRates'), orderBy('period', 'desc'))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as InterestRate[]
  },

  async listByAccount(bankAccountId: string, familyId: string): Promise<InterestRate[]> {
    const snap = await getDocs(
      query(
        collection(db, 'families', familyId, 'interestRates'),
        where('bank_account_id', '==', bankAccountId),
        orderBy('period', 'desc')
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
      query(collection(db, 'families', familyId, 'transfers'), orderBy('date', 'desc'))
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


export const transactionsApi = {
  async listByFamily(familyId: string, filters?: {
    goal_id?: string
    bank_account_id?: string
    type?: string
    start_date?: string
    end_date?: string
    limit?: number
  }): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select('*, profile:profiles(id,full_name), goal:goals(id,name), bank_account:bank_accounts(id,nickname,bank_name), creator:profiles!transactions_created_by_fkey(id,full_name)')
      .eq('family_id', familyId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.goal_id) query = query.eq('goal_id', filters.goal_id)
    if (filters?.bank_account_id) query = query.eq('bank_account_id', filters.bank_account_id)
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.start_date) query = query.gte('transaction_date', filters.start_date)
    if (filters?.end_date) query = query.lte('transaction_date', filters.end_date)
    if (filters?.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(userId: string, familyId: string, form: CreateTransactionFormData): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...form,
        family_id: familyId,
        user_id: userId,
        created_by: userId,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  },
}

export const interestRatesApi = {
  async listByFamily(familyId: string): Promise<InterestRate[]> {
    const { data, error } = await supabase
      .from('interest_rates')
      .select('*, bank_account:bank_accounts(id,nickname,bank_name), creator:profiles!interest_rates_created_by_fkey(id,full_name)')
      .eq('family_id', familyId)
      .order('reference_month', { ascending: false })
    if (error) throw error
    return data
  },

  async listByAccount(bankAccountId: string): Promise<InterestRate[]> {
    const { data, error } = await supabase
      .from('interest_rates')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .order('reference_month', { ascending: false })
    if (error) throw error
    return data
  },

  async create(userId: string, familyId: string, form: InterestRateFormData): Promise<InterestRate> {
    // Buscar saldo atual da conta
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', form.bank_account_id)
      .single()

    const balanceBefore = account?.current_balance ?? 0
    const interestAmount = balanceBefore * (form.rate_percent / 100)
    const balanceAfter = balanceBefore + interestAmount

    const { data, error } = await supabase
      .from('interest_rates')
      .insert({
        family_id: familyId,
        bank_account_id: form.bank_account_id,
        reference_month: form.reference_month,
        rate_percent: form.rate_percent,
        balance_before: balanceBefore,
        interest_amount: interestAmount,
        balance_after: balanceAfter,
        notes: form.notes ?? null,
        created_by: userId,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export const transfersApi = {
  async listByFamily(familyId: string): Promise<Transfer[]> {
    const { data, error } = await supabase
      .from('transfers')
      .select('*, from_account:bank_accounts!transfers_from_bank_account_id_fkey(id,nickname,bank_name), to_account:bank_accounts!transfers_to_bank_account_id_fkey(id,nickname,bank_name)')
      .eq('family_id', familyId)
      .order('transfer_date', { ascending: false })
    if (error) throw error
    return data
  },

  async create(userId: string, familyId: string, form: TransferFormData): Promise<Transfer> {
    const { data, error } = await supabase
      .from('transfers')
      .insert({
        ...form,
        family_id: familyId,
        created_by: userId,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
