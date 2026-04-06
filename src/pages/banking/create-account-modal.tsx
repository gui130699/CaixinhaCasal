import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { useAuthStore } from '@/stores/auth.store'
import { bankAccountSchema, BankAccountFormData } from '@/lib/validators'
import { Modal } from '@/components/ui/modal'
import { Input, CurrencyInput } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface Props { open: boolean; onClose: () => void }

export default function CreateAccountModal({ open, onClose }: Props) {
  const { family } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: { balance: 0, is_primary: false },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data: BankAccountFormData) => {
    if (!family) return
    setLoading(true)
    try {
      await bankAccountsApi.create({ ...data, family_id: family.id })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast({ type: 'success', message: 'Conta criada com sucesso!' })
      handleClose()
    } catch (err: any) {
      toast({ type: 'error', message: err.message || 'Erro ao criar conta' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nova Conta Bancária" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Apelido da Conta" placeholder="Ex: Conta Principal, Poupança..." error={errors.nickname?.message} {...register('nickname')} />
        <Input label="Banco" placeholder="Ex: Nubank, Itaú, Bradesco..." error={errors.bank_name?.message} {...register('bank_name')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Agência" placeholder="0001" {...register('branch')} />
          <Input label="Número da Conta" placeholder="00000-0" {...register('account_number')} />
        </div>
        <CurrencyInput label="Saldo Inicial" value={watch('balance') ?? 0} onChange={v => setValue('balance', v)} error={errors.balance?.message} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('is_primary')} className="rounded text-primary-600" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Definir como conta principal</span>
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Criar Conta</Button>
        </div>
      </form>
    </Modal>
  )
}
