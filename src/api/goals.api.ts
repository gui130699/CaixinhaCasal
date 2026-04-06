import { supabase } from '@/lib/supabase'
import type { Goal, GoalMember } from '@/types'
import type { CreateGoalFormData } from '@/lib/validators'
import { calculateInstallment, calculateMonths } from '@/lib/utils'

export const goalsApi = {
  async listByFamily(familyId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*, bank_account:bank_accounts(*), goal_members(*, profile:profiles(*))')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getById(id: string): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .select('*, bank_account:bank_accounts(*), goal_members(*, profile:profiles(*))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(userId: string, form: CreateGoalFormData): Promise<Goal> {
    const months =
      form.calculation_mode === 'by_months'
        ? (form.months_count ?? 1)
        : calculateMonths(form.target_amount, form.installment_amount ?? 1)

    const installment =
      form.calculation_mode === 'by_months'
        ? calculateInstallment(form.target_amount, form.months_count ?? 1)
        : (form.installment_amount ?? 0)

    const startDate = new Date(form.start_date)
    const targetDate = new Date(startDate)
    targetDate.setMonth(targetDate.getMonth() + months)

    const { data, error } = await supabase
      .from('goals')
      .insert({
        family_id: form.family_id,
        bank_account_id: form.bank_account_id ?? null,
        name: form.name,
        description: form.description ?? null,
        target_amount: form.target_amount,
        initial_amount: form.initial_amount ?? 0,
        current_balance: form.initial_amount ?? 0,
        remaining_amount: form.target_amount - (form.initial_amount ?? 0),
        start_date: form.start_date,
        target_date: targetDate.toISOString().substring(0, 10),
        months_count: months,
        installment_amount: installment,
        calculation_mode: form.calculation_mode,
      })
      .select()
      .single()
    if (error) throw error

    // Adicionar membros se fornecidos
    if (form.members && form.members.length > 0) {
      await supabase.from('goal_members').insert(
        form.members.map(m => ({
          goal_id: data.id,
          user_id: m.user_id,
          expected_monthly_amount: m.expected_monthly_amount,
          participation_percent: m.participation_percent,
        }))
      )
    } else {
      // Adicionar o criador como membro padrão
      await supabase.from('goal_members').insert({
        goal_id: data.id,
        user_id: userId,
        expected_monthly_amount: installment,
        participation_percent: 100,
      })
    }

    // Gerar cronograma de parcelas
    await supabase.rpc('generate_installments', { p_goal_id: data.id })

    return data
  },

  async update(id: string, form: Partial<CreateGoalFormData & { status: string }>): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .update(form)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateStatus(id: string, status: Goal['status']): Promise<void> {
    const updates: Partial<Goal> = { status }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    const { error } = await supabase.from('goals').update(updates).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
  },

  async getMembers(goalId: string): Promise<GoalMember[]> {
    const { data, error } = await supabase
      .from('goal_members')
      .select('*, profile:profiles(*)')
      .eq('goal_id', goalId)
    if (error) throw error
    return data
  },

  async regenerateSchedule(goalId: string): Promise<void> {
    await supabase.rpc('generate_installments', { p_goal_id: goalId })
  },

  async recalculateBalance(goalId: string): Promise<void> {
    await supabase.rpc('recalculate_goal_balance', { p_goal_id: goalId })
  },
}
