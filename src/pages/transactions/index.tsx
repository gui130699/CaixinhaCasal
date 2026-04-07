import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react'
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
  { label: 'Transferências', value: 'transfer' },
]

function CreateTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { family, profile } = useAuthStore()
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
    defaultValues: { amount: 0, type: 'withdrawal', transaction_date: new Date().toISOString().slice(0, 10), bank_account_id: '' },
  })

  const txType = watch('type')
  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data: CreateTransactionFormData) => {
    if (!family || !profile) return
    setLoading(true)
    try {
      if (data.type === 'transfer') {
        await transactionsApi.createTransfer({
          family_id: family.id,
          from_bank_account_id: data.bank_account_id,
          to_bank_account_id: data.to_bank_account_id!,
          amount: data.amount,
          transfer_date: data.transaction_date,
          description: data.description,
          notes: data.notes,
          user_id: profile.id,
          created_by: profile.id,
        })
      } else {
        await transactionsApi.create({
          type: data.type,
          amount: data.amount,
          transaction_date: data.transaction_date,
          description: data.description,
          notes: data.notes,
          bank_account_id: data.bank_account_id,
          family_id: family.id,
          user_id: profile.id,
          created_by: profile.id,
        })
      }
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

  const activeAccounts = accounts.filter(a => a.status === 'active')

  return (
    <Modal open={open} onClose={handleClose} title="Nova Transação" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Tipo — 3 botões visuais */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { val: 'deposit', label: 'Entrada', color: 'green' },
              { val: 'withdrawal', label: 'Saída', color: 'red' },
              { val: 'transfer', label: 'Transferência', color: 'blue' },
            ] as const).map(({ val, label, color }) => (
              <button
                key={val}
                type="button"
                onClick={() => setValue('type', val, { shouldValidate: true })}
                className={`py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  txType === val
                    ? color === 'green' ? 'bg-green-600 border-green-600 text-white'
                      : color === 'red' ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Select
          label={txType === 'transfer' ? 'Conta de Origem' : 'Conta'}
          error={errors.bank_account_id?.message}
          {...register('bank_account_id')}
        >
          <option value="">Selecione...</option>
          {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
        </Select>

        {/* Conta destino — só para transferências */}
        {txType === 'transfer' && (
          <Select
            label="Conta de Destino"
            error={errors.to_bank_account_id?.message}
            {...register('to_bank_account_id')}
          >
            <option value="">Selecione...</option>
            {activeAccounts
              .filter(a => a.id !== watch('bank_account_id'))
              .map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
          </Select>
        )}

        <Input label="Descrição" placeholder="Ex: Mercado, Salário..." error={errors.description?.message} {...register('description')} />
        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput label="Valor" value={watch('amount') ?? 0} onChange={v => setValue('amount', v)} error={errors.amount?.message} />
          <Input label="Data" type="date" error={errors.transaction_date?.message} {...register('transaction_date')} />
        </div>
        <Textarea label="Observações" rows={2} {...register('notes')} />

        {/* Exibe quem está registrando */}
        {profile && (
          <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <Avatar name={profile.full_name} size="xs" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Registrado por <span className="font-medium text-gray-700 dark:text-gray-300">{profile.full_name}</span></p>
          </div>
        )}

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
    queryKey: ['transactions', family?.id],
    queryFn: () => transactionsApi.listByFamily(family!.id, {}),
    enabled: !!family,
  })

  const allTransactions = data?.data ?? []
  const incomingTypes = ['deposit', 'transfer_in']

  const transactions = typeFilter === ''
    ? allTransactions
    : typeFilter === 'transfer'
      ? allTransactions.filter(t => t.type === 'transfer_in' || t.type === 'transfer_out')
      : allTransactions.filter(t => t.type === typeFilter)

  const income = allTransactions.filter(t => incomingTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0)
  const expense = allTransactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0)

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
          <EmptyState icon={<ArrowRightLeft className="size-8" />} title="Nenhuma transação" description="Registre a primeira movimentação" />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {transactions.map(tx => {
              const isIn = incomingTypes.includes(tx.type)
              const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out'
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-4">
                  <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                    isTransfer ? 'bg-blue-100 dark:bg-blue-900/30' : isIn ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {isTransfer
                      ? <ArrowRightLeft className="size-4 text-blue-600" />
                      : isIn
                        ? <ArrowUpCircle className="size-4 text-green-600" />
                        : <ArrowDownCircle className="size-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(tx.transaction_date)} • {transactionTypeLabel[tx.type]}
                      {tx.bank_account?.nickname ? ` • ${tx.bank_account.nickname}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className={`text-sm font-bold ${isTransfer ? 'text-blue-600' : isIn ? 'text-green-600' : 'text-red-500'}`}>
                      {isIn ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    {tx.profile && (
                      <div className="flex items-center gap-1">
                        <Avatar name={tx.profile.full_name} size="xs" />
                        <span className="text-[10px] text-gray-400">{tx.profile.full_name.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <CreateTransactionModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}