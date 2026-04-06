import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { createGoalSchema, type CreateGoalFormData } from '@/lib/validators'
import { goalsApi } from '@/api/goals.api'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { familiesApi } from '@/api/families.api'
import { useAuthStore } from '@/stores/auth.store'
import { Modal } from '@/components/ui/modal'
import { Input, Select } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency, calculateInstallment, calculateMonths } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateGoalModal({ open, onClose, onSuccess }: Props) {
  const { family, user } = useAuthStore()
  const { success, error: toastError } = useToast()

  const { data: accounts = [] } = useQuery({
    queryKey: ['bank-accounts', family?.id],
    queryFn: () => bankAccountsApi.listByFamily(family!.id),
    enabled: !!family?.id,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['family-members', family?.id],
    queryFn: () => familiesApi.getMembers(family!.id),
    enabled: !!family?.id,
  })

  const {
    register, handleSubmit, watch, control,
    formState: { errors, isSubmitting }
  } = useForm<CreateGoalFormData>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      family_id: family?.id ?? '',
      calculation_mode: 'by_months',
      initial_amount: 0,
      start_date: new Date().toISOString().substring(0, 10),
    },
  })

  const watchMode = watch('calculation_mode')
  const watchTarget = watch('target_amount') ?? 0
  const watchMonths = watch('months_count') ?? 0
  const watchInstallment = watch('installment_amount') ?? 0

  const previewInstallment = watchMode === 'by_months' && watchMonths > 0
    ? calculateInstallment(watchTarget, watchMonths)
    : null

  const previewMonths = watchMode === 'by_installment' && watchInstallment > 0
    ? calculateMonths(watchTarget, watchInstallment)
    : null

  const onSubmit = async (data: CreateGoalFormData) => {
    try {
      await goalsApi.create(user!.id, { ...data, family_id: family!.id })
      success('Meta criada com sucesso!')
      onSuccess()
    } catch (err: unknown) {
      toastError((err as { message?: string })?.message ?? 'Erro ao criar meta.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Meta Financeira" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Nome da meta"
              placeholder="Ex: Viagem de férias, Reforma da cozinha..."
              error={errors.name?.message}
              required
              {...register('name')}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label="Descrição (opcional)"
              placeholder="Descreva o objetivo da meta..."
              {...register('description')}
            />
          </div>

          <Controller
            name="target_amount"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                label="Valor Objetivo"
                value={field.value ?? 0}
                onChange={field.onChange}
                error={errors.target_amount?.message}
                required
              />
            )}
          />

          <Controller
            name="initial_amount"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                label="Valor Inicial (já guardado)"
                value={field.value ?? 0}
                onChange={field.onChange}
              />
            )}
          />

          <Input
            label="Data de início"
            type="date"
            error={errors.start_date?.message}
            required
            {...register('start_date')}
          />

          <Select label="Tipo de cálculo" {...register('calculation_mode')}>
            <option value="by_months">Calcular parcela por meses</option>
            <option value="by_installment">Calcular meses por parcela</option>
          </Select>

          {watchMode === 'by_months' ? (
            <div>
              <Input
                label="Quantidade de meses"
                type="number"
                min="1"
                max="360"
                placeholder="12"
                error={errors.months_count?.message}
                required
                {...register('months_count', { valueAsNumber: true })}
              />
              {previewInstallment && (
                <p className="mt-1 text-xs text-green-600 font-medium">
                  → Parcela mensal: {formatCurrency(previewInstallment)}
                </p>
              )}
            </div>
          ) : (
            <div>
              <Controller
                name="installment_amount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    label="Valor da parcela mensal"
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    error={errors.installment_amount?.message}
                    required
                  />
                )}
              />
              {previewMonths && (
                <p className="mt-1 text-xs text-green-600 font-medium">
                  → Estimativa: {previewMonths} meses
                </p>
              )}
            </div>
          )}

          <Select label="Conta bancária (opcional)" {...register('bank_account_id')}>
            <option value="">Selecionar conta...</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.nickname} – {a.bank_name}</option>
            ))}
          </Select>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>Criar Meta</Button>
        </div>
      </form>
    </Modal>
  )
}
