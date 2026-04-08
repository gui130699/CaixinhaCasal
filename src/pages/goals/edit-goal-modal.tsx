import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createGoalSchema, type CreateGoalFormData } from '@/lib/validators'
import { goalsApi } from '@/api/goals.api'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { familiesApi } from '@/api/families.api'
import { useAuthStore } from '@/stores/auth.store'
import { Modal } from '@/components/ui/modal'
import { Input, CurrencyInput, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, calculateInstallment, calculateMonths } from '@/lib/utils'
import type { Goal } from '@/types'

interface Props {
  open: boolean
  goal: Goal
  onClose: () => void
  onSuccess: () => void
}

function getNextDueDate(firstInstallmentDate?: string | null): string {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  let dueDay = 1
  if (firstInstallmentDate) {
    dueDay = new Date(firstInstallmentDate + 'T00:00:00').getDate()
  }
  const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
  nextMonth.setDate(Math.min(dueDay, maxDay))
  return nextMonth.toISOString().substring(0, 10)
}

export function EditGoalModal({ open, goal, onClose, onSuccess }: Props) {
  const { family } = useAuthStore()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()

  const [loading, setLoading] = useState(false)
  const [totalCalcMode, setTotalCalcMode] = useState<'by_months' | 'by_installment'>('by_months')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [percentages, setPercentages] = useState<Record<string, number>>({})

  const { data: accounts = [] } = useQuery({
    queryKey: ['bank-accounts', family?.id],
    queryFn: () => bankAccountsApi.listByFamily(family!.id),
    enabled: !!family?.id && open,
  })

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['family-members-with-profiles', family?.id],
    queryFn: () => familiesApi.getMembersWithProfiles(family!.id),
    enabled: !!family?.id && open,
  })

  const { data: goalMembers = [] } = useQuery({
    queryKey: ['goal-members', goal.id, family?.id],
    queryFn: () => goalsApi.getMembers(goal.id, family!.id),
    enabled: !!family?.id && open,
  })

  const activeMembers = familyMembers.filter(m => m.status === 'active')

  // Detect mode from stored calculation_mode (which is 'monthly_value' | 'total_value')
  const initialMode = (goal as any).calculation_mode === 'total_value' ? 'total_value' : 'monthly_value'
  const isOpenEnded = (goal as any).is_open_ended ?? false

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<CreateGoalFormData>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      name: goal.name,
      description: goal.description ?? '',
      bank_account_id: goal.bank_account_id ?? '',
      first_installment_date: getNextDueDate((goal as any).first_installment_date ?? goal.start_date),
      mode: initialMode,
      monthly_amount: goal.installment_amount ?? 0,
      months_count: isOpenEnded ? 0 : (goal.months_count ?? 12),
      target_amount: goal.target_amount ?? 0,
      total_months: goal.months_count ?? 12,
      installment_amount: goal.installment_amount ?? 0,
      participant_ids: [],
      percentages: {},
    },
  })

  // Pre-fill members/percentages after goalMembers load
  useEffect(() => {
    if (goalMembers.length > 0 && selectedMembers.length === 0) {
      const ids = goalMembers.map(m => m.user_id)
      setSelectedMembers(ids)
      const pcts: Record<string, number> = {}
      goalMembers.forEach(m => { pcts[m.user_id] = m.participation_percent })
      setPercentages(pcts)
    }
  }, [goalMembers.length])

  const mode = watch('mode')
  const monthlyAmount = watch('monthly_amount') ?? 0
  const monthsCount = watch('months_count') ?? 0
  const targetAmount = watch('target_amount') ?? 0
  const totalMonths = watch('total_months') ?? 0
  const installmentAmount = watch('installment_amount') ?? 0

  // Sync selection/percentages into form
  useEffect(() => {
    setValue('participant_ids', selectedMembers)
    setValue('percentages', percentages)
  }, [selectedMembers, percentages, setValue])

  const previewTotal = mode === 'monthly_value' && monthlyAmount > 0 && monthsCount > 0
    ? monthlyAmount * monthsCount : null
  const previewInstallment = mode === 'total_value' && totalCalcMode === 'by_months' && targetAmount > 0 && totalMonths > 0
    ? calculateInstallment(targetAmount, totalMonths) : null
  const previewMonths = mode === 'total_value' && totalCalcMode === 'by_installment' && targetAmount > 0 && installmentAmount > 0
    ? calculateMonths(targetAmount, installmentAmount) : null

  const percentageSum = selectedMembers.reduce((s, id) => s + (percentages[id] ?? 0), 0)

  const handleSlider2 = (v: number) => {
    setPercentages({ [selectedMembers[0]]: v, [selectedMembers[1]]: 100 - v })
  }

  const handlePercentageInput = (memberId: string, v: number) => {
    if (selectedMembers.length === 2) {
      const otherId = selectedMembers.find(id => id !== memberId)!
      setPercentages({ [memberId]: v, [otherId]: 100 - v })
    } else {
      setPercentages(prev => ({ ...prev, [memberId]: v }))
    }
  }

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId) && selectedMembers.length === 1) return
    const next = selectedMembers.includes(userId)
      ? selectedMembers.filter(id => id !== userId)
      : [...selectedMembers, userId]
    setSelectedMembers(next)
    const equal = Math.floor(100 / next.length)
    const pcts: Record<string, number> = {}
    next.forEach((id, i) => { pcts[id] = i === next.length - 1 ? 100 - equal * (next.length - 1) : equal })
    setPercentages(pcts)
  }

  const handleClose = () => {
    reset()
    setSelectedMembers([])
    setPercentages({})
    onClose()
  }

  const onSubmit = async (data: CreateGoalFormData) => {
    if (percentageSum !== 100) return
    setLoading(true)
    try {
      await goalsApi.edit(goal.id, family!.id, {
        ...data,
        total_calc_mode: totalCalcMode,
        participant_ids: selectedMembers,
        percentages,
      })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      success('Meta atualizada com sucesso!')
      handleClose()
      onSuccess()
    } catch (err: unknown) {
      toastError((err as { message?: string })?.message ?? 'Erro ao editar meta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Editar Meta — ${goal.name}`} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Nome + Data da próxima parcela */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nome da meta"
            placeholder="Ex: Viagem, Reforma..."
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <div>
            <Input
              label="Data da próxima parcela"
              type="date"
              error={errors.first_installment_date?.message}
              required
              {...register('first_installment_date')}
            />
            <p className="mt-1 text-[11px] text-gray-400">Parcelas pendentes serão recriadas a partir dessa data</p>
          </div>
        </div>

        <div>
          <Select
            label="Conta vinculada"
            error={errors.bank_account_id?.message}
            required
            {...register('bank_account_id')}
          >
            <option value="">Selecione a conta...</option>
            {accounts.filter(a => a.status === 'active').map(a => (
              <option key={a.id} value={a.id}>{a.nickname}{a.bank_name ? ` — ${a.bank_name}` : ''}</option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-gray-400">Parcelas em aberto passarão para esta conta. Pagamentos já realizados permanecem na conta anterior.</p>
        </div>

        <Input
          label="Descrição (opcional)"
          placeholder="Descreva o objetivo da meta..."
          {...register('description')}
        />

        {/* Modo de cálculo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modo de cálculo</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { val: 'monthly_value', label: 'Valor Mensal', desc: 'Defina quanto guardar por mês' },
              { val: 'total_value', label: 'Valor Total', desc: 'Defina o total e calcule as parcelas' },
            ] as const).map(({ val, label, desc }) => (
              <button
                key={val}
                type="button"
                onClick={() => setValue('mode', val, { shouldValidate: true })}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  mode === val
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <p className={`text-sm font-semibold ${mode === val ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Campos do modo */}
        {mode === 'monthly_value' ? (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="monthly_amount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput label="Valor mensal" value={field.value ?? 0} onChange={field.onChange} error={errors.monthly_amount?.message} required />
                )}
              />
              <div>
                <Input
                  label="Quantidade de meses"
                  type="number"
                  min="0"
                  placeholder="0 = sem prazo"
                  error={errors.months_count?.message}
                  {...register('months_count', { valueAsNumber: true })}
                />
                <p className="mt-1 text-[11px] text-gray-400">0 = meta em aberto (sem prazo)</p>
              </div>
            </div>
            {previewTotal && (
              <div className="py-1.5 px-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-xs text-green-700 dark:text-green-400">Total estimado: <strong>{formatCurrency(previewTotal)}</strong></span>
              </div>
            )}
            {monthsCount === 0 && monthlyAmount > 0 && (
              <div className="py-1.5 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-xs text-blue-700 dark:text-blue-400">Meta em aberto — guardando <strong>{formatCurrency(monthlyAmount)}/mês</strong> sem prazo</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <Controller
              name="target_amount"
              control={control}
              render={({ field }) => (
                <CurrencyInput label="Valor total desejado" value={field.value ?? 0} onChange={field.onChange} error={errors.target_amount?.message} required />
              )}
            />
            <div className="grid grid-cols-2 gap-2">
              {([
                { val: 'by_months', label: 'Definir por meses' },
                { val: 'by_installment', label: 'Definir por parcela' },
              ] as const).map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTotalCalcMode(val)}
                  className={`py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    totalCalcMode === val
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {totalCalcMode === 'by_months' ? (
              <div>
                <Input
                  label="Quantidade de meses"
                  type="number"
                  min="1"
                  placeholder="12"
                  error={errors.total_months?.message}
                  required
                  {...register('total_months', { valueAsNumber: true })}
                />
                {previewInstallment && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">→ Parcela mensal: {formatCurrency(previewInstallment)}</p>
                )}
              </div>
            ) : (
              <div>
                <Controller
                  name="installment_amount"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput label="Valor da parcela mensal" value={field.value ?? 0} onChange={field.onChange} error={errors.installment_amount?.message} required />
                  )}
                />
                {previewMonths && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">→ Estimativa: {previewMonths} meses</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Participantes */}
        {activeMembers.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Participantes
              {errors.participant_ids && <span className="ml-2 text-xs text-red-500 font-normal">{errors.participant_ids.message}</span>}
            </label>

            <div className="space-y-2">
              {activeMembers.map(m => {
                const isSelected = selectedMembers.includes(m.user_id)
                const memberName = (m as any).profile?.full_name ?? 'Membro'
                return (
                  <div
                    key={m.user_id}
                    onClick={() => toggleMember(m.user_id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors select-none ${
                      isSelected
                        ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 opacity-50 hover:opacity-70'
                    }`}
                  >
                    <div className={`size-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isSelected && <svg className="size-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5L4 7.5 8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <Avatar name={memberName} size="sm" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">{memberName}</p>
                    {isSelected && (
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400 w-12 text-right">
                        {percentages[m.user_id] ?? 0}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Slider para 2 participantes */}
            {selectedMembers.length === 2 && (
              <div className="px-1 pt-1 space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={percentages[selectedMembers[0]] ?? 50}
                  onChange={e => handleSlider2(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-primary-600 dark:text-primary-400">
                    {(activeMembers.find(m => m.user_id === selectedMembers[0]) as any)?.profile?.full_name?.split(' ')[0] ?? 'M1'}:&nbsp;{percentages[selectedMembers[0]] ?? 50}%
                  </span>
                  <span className="text-primary-600 dark:text-primary-400">
                    {(activeMembers.find(m => m.user_id === selectedMembers[1]) as any)?.profile?.full_name?.split(' ')[0] ?? 'M2'}:&nbsp;{percentages[selectedMembers[1]] ?? 50}%
                  </span>
                </div>
              </div>
            )}

            {/* Inputs individuais para 3+ participantes */}
            {selectedMembers.length > 2 && (
              <div className="space-y-2 pt-1">
                {selectedMembers.map(uid => {
                  const memberName = (activeMembers.find(m => m.user_id === uid) as any)?.profile?.full_name ?? uid
                  return (
                    <div key={uid} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{memberName}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={percentages[uid] ?? 0}
                        onChange={e => handlePercentageInput(uid, Number(e.target.value))}
                        className="w-16 text-center text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-900"
                      />
                      <span className="text-xs text-gray-500 w-4">%</span>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedMembers.length > 0 && percentageSum !== 100 && (
              <p className="text-xs text-red-500 font-medium">Total: {percentageSum}% — deve ser 100%</p>
            )}
          </div>
        )}

        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ⚠️ As parcelas pendentes serão excluídas e recriadas com os novos valores. Parcelas já pagas são mantidas.
          </p>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" loading={loading} disabled={percentageSum !== 100}>Salvar Alterações</Button>
        </div>
      </form>
    </Modal>
  )
}
