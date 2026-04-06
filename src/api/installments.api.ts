import { supabase } from '@/lib/supabase'
import type { Installment } from '@/types'
import type { PayInstallmentFormData } from '@/lib/validators'

export const installmentsApi = {
  async listByFamily(familyId: string, filters?: {
    goal_id?: string
    user_id?: string
    status?: string
    start_month?: string
    end_month?: string
  }): Promise<Installment[]> {
    let query = supabase
      .from('installments')
      .select('*, profile:profiles(id,full_name,avatar_url), goal:goals(id,name), bank_account:bank_accounts(id,nickname,bank_name)')
      .eq('family_id', familyId)
      .order('due_date', { ascending: false })

    if (filters?.goal_id) query = query.eq('goal_id', filters.goal_id)
    if (filters?.user_id) query = query.eq('user_id', filters.user_id)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.start_month) query = query.gte('reference_month', filters.start_month)
    if (filters?.end_month) query = query.lte('reference_month', filters.end_month)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async listByGoal(goalId: string): Promise<Installment[]> {
    const { data, error } = await supabase
      .from('installments')
      .select('*, profile:profiles(id,full_name,avatar_url), bank_account:bank_accounts(id,nickname,bank_name)')
      .eq('goal_id', goalId)
      .order('reference_month')
    if (error) throw error
    return data
  },

  async getCurrentMonth(familyId: string): Promise<Installment[]> {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10)

    const { data, error } = await supabase
      .from('installments')
      .select('*, profile:profiles(id,full_name,avatar_url), goal:goals(id,name)')
      .eq('family_id', familyId)
      .gte('reference_month', firstDay)
      .lte('reference_month', lastDay)
    if (error) throw error
    return data
  },

  async getOverdue(familyId: string): Promise<Installment[]> {
    const { data, error } = await supabase
      .from('installments')
      .select('*, profile:profiles(id,full_name,avatar_url), goal:goals(id,name)')
      .eq('family_id', familyId)
      .in('status', ['pending', 'partial', 'overdue'])
      .lt('due_date', new Date().toISOString().substring(0, 10))
      .order('due_date')
    if (error) throw error
    return data
  },

  async pay(installmentId: string, form: PayInstallmentFormData): Promise<Installment> {
    const paidAmount = form.paid_amount
    const { data: current } = await supabase
      .from('installments')
      .select('expected_amount, paid_amount')
      .eq('id', installmentId)
      .single()

    const newPaid = (current?.paid_amount ?? 0) + paidAmount
    const expected = current?.expected_amount ?? 0

    let status: Installment['status'] = 'partial'
    if (newPaid >= expected) status = 'paid'
    if (newPaid <= 0) status = 'pending'

    const { data, error } = await supabase
      .from('installments')
      .update({
        paid_amount: newPaid,
        payment_date: form.payment_date,
        payment_method: form.payment_method ?? null,
        bank_account_id: form.bank_account_id ?? null,
        notes: form.notes ?? null,
        receipt_url: form.receipt_url ?? null,
        status,
      })
      .eq('id', installmentId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async markOverdue(): Promise<void> {
    await supabase.rpc('check_overdue_installments')
  },
}
