import { supabase } from '@/lib/supabase'
import type { BankAccount } from '@/types'
import type { BankAccountFormData } from '@/lib/validators'

export const bankAccountsApi = {
  async listByFamily(familyId: string): Promise<BankAccount[]> {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('family_id', familyId)
      .order('is_primary', { ascending: false })
      .order('nickname')
    if (error) throw error
    return data
  },

  async getById(id: string): Promise<BankAccount> {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(familyId: string, form: BankAccountFormData): Promise<BankAccount> {
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({ ...form, family_id: familyId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, form: Partial<BankAccountFormData>): Promise<BankAccount> {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(form)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async setPrimary(id: string, familyId: string): Promise<void> {
    await supabase
      .from('bank_accounts')
      .update({ is_primary: false })
      .eq('family_id', familyId)
    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_primary: true })
      .eq('id', id)
    if (error) throw error
  },

  async toggleStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ status })
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
    if (error) throw error
  },

  async getTotalBalance(familyId: string): Promise<number> {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('family_id', familyId)
      .eq('status', 'active')
    if (error) throw error
    return data.reduce((sum, a) => sum + (a.current_balance || 0), 0)
  },
}
