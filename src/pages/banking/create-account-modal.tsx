import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { brasilBanksApi } from '@/api/brasil-api'
import { useAuthStore } from '@/stores/auth.store'
import { bankAccountSchema, BankAccountFormData } from '@/lib/validators'
import { Modal } from '@/components/ui/modal'
import { Input, CurrencyInput, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { BankSelector } from '@/components/ui/bank-selector'

interface Props { open: boolean; onClose: () => void }

export default function CreateAccountModal({ open, onClose }: Props) {
  const { family } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [bankCode, setBankCode] = useState('')
  const [fetchingBank, setFetchingBank] = useState(false)
  const codeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: { initial_balance: 0, is_primary: false },
  })

  // Auto-preenche o nome do banco ao digitar o código
  useEffect(() => {
    const code = bankCode.trim()
    if (!code || !/^\d+$/.test(code)) return
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current)
    codeTimerRef.current = setTimeout(async () => {
      setFetchingBank(true)
      try {
        const bank = await brasilBanksApi.getByCode(code)
        if (bank) {
          setValue('bank_name', bank.name, { shouldValidate: true })
          setValue('bank_code', String(bank.code ?? code))
        }
      } catch { /* ignora */ } finally {
        setFetchingBank(false)
      }
    }, 600)
    return () => { if (codeTimerRef.current) clearTimeout(codeTimerRef.current) }
  }, [bankCode, setValue])

  const handleClose = () => { reset(); setBankCode(''); onClose() }

  const onSubmit = async (data: BankAccountFormData) => {
    if (!family) return
    setLoading(true)
    try {
      await bankAccountsApi.create({ ...data, family_id: family.id })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast('Conta criada com sucesso!', 'success')
      handleClose()
    } catch (err: any) {
      toast(err.message || 'Erro ao criar conta', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nova Conta Bancária" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Apelido da Conta" placeholder="Ex: Conta Principal, Poupança..." error={errors.nickname?.message} {...register('nickname')} />

        {/* Código + BankSelector lado a lado */}
        <div className="grid grid-cols-[110px_1fr] gap-3 items-start">
          <Input
            label="Código"
            placeholder="Ex: 341"
            value={bankCode}
            onChange={e => setBankCode(e.target.value)}
            rightIcon={fetchingBank ? <Loader2 className="size-3 animate-spin text-gray-400" /> : undefined}
            hint="Nº do banco"
          />
          <BankSelector
            label="Banco"
            error={errors.bank_name?.message}
            value={watch('bank_name') ?? ''}
            onSelect={({ code, name }) => {
              setValue('bank_name', name, { shouldValidate: true })
              setValue('bank_code', code)
              setBankCode(code)
            }}
          />
        </div>

        <Select label="Tipo de Conta" error={errors.account_type?.message} {...register('account_type')}>
          <option value="">Selecione...</option>
          <option value="checking">Conta Corrente</option>
          <option value="savings">Poupança</option>
          <option value="investment">Investimento</option>
          <option value="wallet">Carteira Digital</option>
          <option value="safe">Cofre</option>
          <option value="other">Outro</option>
        </Select>

        <Input label="Titular da Conta" placeholder="Nome completo do titular" error={errors.holder_name?.message} {...register('holder_name')} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Agência" placeholder="0001" {...register('agency')} />
          <Input label="Número da Conta" placeholder="00000-0" {...register('account_number')} />
        </div>
        <CurrencyInput label="Saldo Inicial" value={watch('initial_balance') ?? 0} onChange={v => setValue('initial_balance', v)} error={errors.initial_balance?.message} />
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
