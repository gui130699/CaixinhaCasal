import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, CheckCircle2, AlertCircle, Clock, RotateCcw } from 'lucide-react'
import { installmentsApi } from '@/api/installments.api'
import { useAuthStore } from '@/stores/auth.store'
import { Card, StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InstallmentStatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils'

const STATUS_TABS = [
  { label: 'Todos', value: '' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Atrasados', value: 'overdue' },
]

export default function InstallmentsPage() {
  const { family } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

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

  const handlePay = async (installmentId: string, amount: number) => {
    setProcessingId(installmentId)
    try {
      await installmentsApi.pay(installmentId, family!.id, {
        paid_amount: amount,
        payment_date: new Date().toISOString().slice(0, 10),
      })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      toast('Parcela registrada como paga!', 'success')
      setConfirmingId(null)
    } catch (err: any) {
      toast(err.message || 'Erro ao registrar pagamento', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRequestUndo = async (installmentId: string) => {
    const inst = installments.find(i => i.id === installmentId)
    if (!inst) return
    setProcessingId(installmentId)
    try {
      await installmentsApi.requestUndo(installmentId, family!.id, {
        goal_id: inst.goal_id,
        goal_name: inst.goal?.name ?? 'Meta',
        user_id: inst.user_id,
        reference_month: inst.reference_month,
        amount: inst.paid_amount,
      })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      toast('Solicitação de estorno enviada ao administrador.', 'success')
      setUndoConfirmId(null)
    } catch (err: any) {
      toast(err.message || 'Erro ao solicitar estorno', 'error')
    } finally {
      setProcessingId(null)
    }
  }

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
            {installments.map(inst => {
              const isConfirming = confirmingId === inst.id
              const isUndoConfirming = undoConfirmId === inst.id
              const isProcessing = processingId === inst.id
              const canPay = inst.status === 'pending' || inst.status === 'overdue'
              const canUndo = inst.status === 'paid'

              return (
                <div key={inst.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={inst.profile?.full_name ?? 'U'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {inst.goal?.name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {inst.profile?.full_name ?? '—'} • {formatMonthYear(inst.reference_month)}
                      </p>
                    </div>
                    <div className="text-right mr-2">
                      {inst.status === 'paid' ? (
                        <p className="text-sm font-bold text-green-600">{formatCurrency(inst.paid_amount)}</p>
                      ) : (
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(inst.expected_amount)}</p>
                      )}
                      {inst.due_date && <p className="text-[10px] text-gray-400">Vence {formatDate(inst.due_date)}</p>}
                    </div>
                    <InstallmentStatusBadge status={inst.status} />
                    {canPay && !isConfirming && (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmingId(inst.id)}>
                        Pagar
                      </Button>
                    )}
                    {canUndo && !isUndoConfirming && (
                      <button
                        onClick={() => setUndoConfirmId(inst.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title="Solicitar estorno"
                      >
                        <RotateCcw className="size-4" />
                      </button>
                    )}
                  </div>

                  {/* Confirmação de pagamento inline */}
                  {isConfirming && (
                    <div className="mt-2 ml-10 flex items-center gap-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
                      <p className="text-xs text-primary-700 dark:text-primary-400 flex-1">
                        Confirmar pagamento de <strong>{formatCurrency(inst.expected_amount)}</strong>?
                      </p>
                      <Button
                        size="sm"
                        loading={isProcessing}
                        onClick={() => handlePay(inst.id, inst.expected_amount)}
                      >
                        Sim
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isProcessing}
                        onClick={() => setConfirmingId(null)}
                      >
                        Não
                      </Button>
                    </div>
                  )}

                  {/* Confirmação de estorno inline */}
                  {isUndoConfirming && (
                    <div className="mt-2 ml-10 flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                        Solicitar estorno ao administrador?
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={isProcessing}
                        onClick={() => handleRequestUndo(inst.id)}
                      >
                        Sim
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isProcessing}
                        onClick={() => setUndoConfirmId(null)}
                      >
                        Não
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
