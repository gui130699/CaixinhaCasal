import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Filter, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { installmentsApi } from '@/api/installments.api'
import { useAuthStore } from '@/stores/auth.store'
import { Card, StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InstallmentStatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { CurrencyInput, Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils'
import type { Installment } from '@/types'

const STATUS_TABS = [
  { label: 'Todos', value: '' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Atrasados', value: 'overdue' },
]

interface PayModalProps { installment: Installment | null; onClose: () => void }

function PayInstallmentModal({ installment, onClose }: PayModalProps) {
  const { toast } = useToast()
  const { family } = useAuthStore()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(installment?.expected_amount ?? 0)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    if (!installment) return
    setLoading(true)
    try {
      await installmentsApi.pay(installment.id, family!.id, { paid_amount: amount, payment_date: date })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      toast('Parcela registrada como paga!', 'success')
      onClose()
    } catch (err: any) {
      toast(err.message || 'Erro ao registrar pagamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={!!installment} onClose={onClose} title="Registrar Pagamento" size="sm">
      <div className="space-y-4">
        {installment && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
            <p className="font-medium">{installment.goal?.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">{formatMonthYear(installment.reference_month)} • {installment.profile?.full_name}</p>
          </div>
        )}
        <CurrencyInput label="Valor Pago" value={amount} onChange={setAmount} />
        <Input label="Data do Pagamento" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handlePay} leftIcon={<CheckCircle2 className="size-4" />}>Confirmar</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function InstallmentsPage() {
  const { family } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(null)

  const { data: installments = [], isLoading } = useQuery({
    queryKey: ['installments', family?.id, statusFilter],
    queryFn: () => installmentsApi.listByFamily(family!.id, statusFilter ? { status: statusFilter as any } : {}),
    enabled: !!family,
  })

  const pending = installments.filter(i => i.status === 'pending')
  const paid = installments.filter(i => i.status === 'paid')
  const overdue = installments.filter(i => i.status === 'overdue')

  const pendingTotal = pending.reduce((s, i) => s + i.expected_amount, 0)
  const paidTotal = paid.reduce((s, i) => s + i.paid_amount, 0)
  const overdueTotal = overdue.reduce((s, i) => s + i.expected_amount, 0)

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Parcelas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe e registre os pagamentos das metas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="A Pagar" value={formatCurrency(pendingTotal)} icon={<Clock className="size-5" />} color="warning" subtitle={`${pending.length} parcelas`} />
        <StatCard title="Pagas" value={formatCurrency(paidTotal)} icon={<CheckCircle2 className="size-5" />} color="success" subtitle={`${paid.length} parcelas`} />
        <StatCard title="Atrasadas" value={formatCurrency(overdueTotal)} icon={<AlertCircle className="size-5" />} color="danger" subtitle={`${overdue.length} parcelas`} />
      </div>

      <Card padding="none">
        <div className="flex items-center gap-1 p-4 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${statusFilter === tab.value ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {installments.length === 0 ? (
          <EmptyState icon={<CreditCard className="size-8" />} title="Nenhuma parcela encontrada" description="Ajuste os filtros ou aguarde o próximo mês" />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {installments.map(inst => (
              <div key={inst.id} className="flex items-center gap-3 px-5 py-4">
                <Avatar name={inst.profile?.full_name ?? 'U'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{inst.goal?.name}</p>
                  <p className="text-xs text-gray-400">{inst.profile?.full_name} • {formatMonthYear(inst.reference_month)}</p>
                </div>
                <div className="text-right mr-3">
                  {inst.status === 'paid' ? (
                    <p className="text-sm font-bold text-green-600">{formatCurrency(inst.paid_amount)}</p>
                  ) : (
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(inst.expected_amount)}</p>
                  )}
                  {inst.due_date && <p className="text-[10px] text-gray-400">Vence {formatDate(inst.due_date)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <InstallmentStatusBadge status={inst.status} />
                  {(inst.status === 'pending' || inst.status === 'overdue') && (
                    <Button size="sm" variant="secondary" onClick={() => setPayingInstallment(inst)}>Pagar</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PayInstallmentModal installment={payingInstallment} onClose={() => setPayingInstallment(null)} />
    </div>
  )
}
