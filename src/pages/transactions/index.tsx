import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Filter } from 'lucide-react'
import { transactionsApi } from '@/api/transactions.api'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { useAuthStore } from '@/stores/auth.store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTransactionSchema, CreateTransactionFormData } from '@/lib/validators'
import { Card, StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { Input, CurrencyInput, Select, Textarea } from '@/components/ui/input'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, transactionTypeLabel } from '@/lib/utils'

const TYPE_TABS = [
  { label: 'Todos', value: '' },
  { label: 'Entradas', value: 'deposit' },
  { label: 'Saídas', value: 'withdrawal' },
  { label: 'Parcelas', value: 'advance_installment' },
]

function CreateTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { family } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const { data: accounts = [] } = useQuery({
    queryKey: ['bank-accounts', family?.id],
    queryFn: () => bankAccountsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateTransactionFormData>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: { amount: 0, type: 'withdrawal', transaction_date: new Date().toISOString().slice(0, 10) },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data: CreateTransactionFormData) => {
    if (!family) return
    setLoading(true)
    try {
      await transactionsApi.create({ ...data, family_id: family.id })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast('Transação registrada!', 'success')
      handleClose()
    } catch (err: any) {
      toast(err.message || 'Erro ao registrar transação', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nova Transação" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Tipo" error={errors.type?.message} {...register('type')}>
          <option value="deposit">Entrada</option>
          <option value="withdrawal">Saída</option>
          <option value="extra_deposit">Depósito Extra</option>
          <option value="advance_installment">Pagamento de Parcela</option>
        </Select>
        <Select label="Conta" error={errors.bank_account_id?.message} {...register('bank_account_id')}>
          <option value="">Selecione...</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
        </Select>
        <Input label="Descrição" placeholder="Ex: Mercado, Salário..." error={errors.description?.message} {...register('description')} />
        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput label="Valor" value={watch('amount') ?? 0} onChange={v => setValue('amount', v)} error={errors.amount?.message} />
          <Input label="Data" type="date" error={errors.transaction_date?.message} {...register('transaction_date')} />
        </div>
        <Textarea label="Observações" rows={2} {...register('notes')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Registrar</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function TransactionsPage() {
  const { family } = useAuthStore()
  const [typeFilter, setTypeFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', family?.id, typeFilter],
    queryFn: () => transactionsApi.listByFamily(family!.id, typeFilter ? { type: typeFilter as any } : {}),
    enabled: !!family,
  })

  const transactions = data?.data ?? []
  const incomingTypes = ['deposit', 'extra_deposit', 'interest', 'transfer_in']
  const income = transactions.filter(t => incomingTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => !incomingTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0)

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Histórico de movimentações financeiras</p>
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setShowCreate(true)}>Nova Transação</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Entradas" value={formatCurrency(income)} icon={<ArrowUpCircle className="size-5" />} color="success" />
        <StatCard title="Saídas" value={formatCurrency(expense)} icon={<ArrowDownCircle className="size-5" />} color="danger" />
        <StatCard title="Saldo" value={formatCurrency(income - expense)} icon={<ArrowRightLeft className="size-5" />} color="primary" />
      </div>

      <Card padding="none">
        <div className="flex items-center gap-1 p-4 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {TYPE_TABS.map(tab => (
            <button key={tab.value} onClick={() => setTypeFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${typeFilter === tab.value ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {transactions.length === 0 ? (
          <EmptyState icon={<ArrowRightLeft className="size-8" />} title="Nenhuma transação" description="Registre a primeira movimentação" action={<Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setShowCreate(true)}>Nova Transação</Button>} />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-4">
                <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${incomingTypes.includes(tx.type) ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {incomingTypes.includes(tx.type)
                    ? <ArrowUpCircle className="size-4 text-green-600" />
                    : <ArrowDownCircle className="size-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(tx.transaction_date)} • {transactionTypeLabel[tx.type]} • {tx.bank_account?.nickname}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${incomingTypes.includes(tx.type) ? 'text-green-600' : 'text-red-500'}`}>
                    {incomingTypes.includes(tx.type) ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  {tx.profile && <Avatar name={tx.profile.full_name} size="xs" className="ml-auto mt-0.5" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CreateTransactionModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
