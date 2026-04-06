import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, TrendingUp, Percent, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { interestRatesApi } from '@/api/transactions.api'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { useAuthStore } from '@/stores/auth.store'
import { interestRateSchema, InterestRateFormData } from '@/lib/validators'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'

function AddInterestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { family } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const { data: accounts = [] } = useQuery({
    queryKey: ['bank-accounts', family?.id],
    queryFn: () => bankAccountsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<InterestRateFormData>({
    resolver: zodResolver(interestRateSchema),
    defaultValues: { rate_percent: 0, reference_month: new Date().toISOString().slice(0, 7) },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data: InterestRateFormData) => {
    if (!family) return
    setLoading(true)
    try {
      await interestRatesApi.create({ ...data, family_id: family.id })
      queryClient.invalidateQueries({ queryKey: ['interest-rates'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast('Rendimento registrado!', 'success')
      handleClose()
    } catch (err: any) {
      toast(err.message || 'Erro ao registrar rendimento', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Registrar Rendimento" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Conta" error={errors.bank_account_id?.message} {...register('bank_account_id')}>
          <option value="">Selecione a conta...</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Taxa (%)" type="number" step="0.01" placeholder="0.00" error={errors.rate_percent?.message} {...register('rate_percent', { valueAsNumber: true })} />
          <Input label="Período" type="month" error={errors.reference_month?.message} {...register('reference_month')} />
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

export default function InterestPage() {
  const { family } = useAuthStore()
  const [showAdd, setShowAdd] = useState(false)

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['interest-rates', family?.id],
    queryFn: () => interestRatesApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const totalInterest = rates.reduce((s, r) => s + (r.interest_amount ?? 0), 0)
  const avgRate = rates.length ? rates.reduce((s, r) => s + (r.rate_percent ?? 0), 0) / rates.length : 0

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rendimentos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registre os rendimentos mensais das contas</p>
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setShowAdd(true)}>Registrar Rendimento</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="size-4 text-green-500" /><p className="text-xs text-gray-500">Total Recebido</p></div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInterest)}</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 mb-1"><Percent className="size-4 text-blue-500" /><p className="text-xs text-gray-500">Taxa Média</p></div>
          <p className="text-2xl font-bold text-blue-600">{avgRate.toFixed(2)}%</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 mb-1"><Building2 className="size-4 text-purple-500" /><p className="text-xs text-gray-500">Registros</p></div>
          <p className="text-2xl font-bold text-purple-600">{rates.length}</p>
        </Card>
      </div>

      <Card padding="none">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Histórico de Rendimentos</h3>
        </div>
        {rates.length === 0 ? (
          <EmptyState icon={<TrendingUp className="size-8" />} title="Nenhum rendimento registrado" description="Registre os rendimentos mensais de cada conta" action={<Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setShowAdd(true)}>Registrar</Button>} />
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="table-base">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Conta</th>
                  <th className="table-th">Período</th>
                  <th className="table-th">Taxa</th>
                  <th className="table-th">Valor</th>
                  <th className="table-th">Data</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="table-td font-medium">{r.bank_account?.nickname ?? '—'}</td>
                    <td className="table-td">{r.reference_month}</td>
                    <td className="table-td"><span className="text-green-600 font-medium">{r.rate_percent}%</span></td>
                    <td className="table-td font-bold text-green-600">+{formatCurrency(r.interest_amount ?? 0)}</td>
                    <td className="table-td text-gray-400">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddInterestModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}
