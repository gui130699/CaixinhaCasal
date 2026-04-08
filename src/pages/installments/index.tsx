import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, CheckCircle2, AlertCircle, Clock, RotateCcw, ChevronDown, ChevronRight, Target } from 'lucide-react'
import { installmentsApi } from '@/api/installments.api'
import { useAuthStore } from '@/stores/auth.store'
import { StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InstallmentStatusBadge } from '@/components/ui/badge'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils'
import type { Installment } from '@/types'

export default function InstallmentsPage() {
  const { family, user, familyRole, isMasterAdmin } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isAdmin = familyRole === 'admin' || isMasterAdmin

  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set())
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const { data: allInstallments = [], isLoading } = useQuery({
    queryKey: ['installments', family?.id],
    queryFn: () => installmentsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const allPending = allInstallments.filter(i => i.status === 'pending' || i.status === 'overdue')
  const allPaid = allInstallments.filter(i => i.status === 'paid')
  const allOverdue = allInstallments.filter(i => i.status === 'overdue')
  const pendingTotal = allPending.reduce((s, i) => s + i.expected_amount, 0)
  const paidTotal = allPaid.reduce((s, i) => s + i.paid_amount, 0)
  const overdueTotal = allOverdue.reduce((s, i) => s + i.expected_amount, 0)

  const myInstallments = allInstallments.filter(i => i.user_id === user?.uid)

  const goalMap = new Map<string, { goalName: string; installments: Installment[] }>()
  myInstallments.forEach(i => {
    if (!goalMap.has(i.goal_id)) {
      goalMap.set(i.goal_id, { goalName: i.goal?.name ?? 'Meta', installments: [] })
    }
    goalMap.get(i.goal_id)!.installments.push(i)
  })
  const goalGroups = Array.from(goalMap.entries()).map(([goalId, data]) => ({ goalId, ...data }))
  goalGroups.sort((a, b) => {
    const priority = (g: typeof a) => {
      if (g.installments.some(i => i.status === 'overdue')) return 0
      if (g.installments.some(i => i.status === 'pending')) return 1
      return 2
    }
    return priority(a) - priority(b)
  })

  const toggleGoal = (goalId: string) => {
    setExpandedGoalIds(prev => {
      const next = new Set(prev)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
    setConfirmingId(null)
    setUndoConfirmId(null)
  }

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

  const handleUndo = async (installmentId: string) => {
    const inst = allInstallments.find(i => i.id === installmentId)
    if (!inst) return
    setProcessingId(installmentId)
    try {
      if (isAdmin) {
        await installmentsApi.undoDirect(installmentId, family!.id)
        toast('Pagamento desfeito com sucesso.', 'success')
      } else {
        await installmentsApi.requestUndo(installmentId, family!.id, {
          goal_id: inst.goal_id,
          goal_name: inst.goal?.name ?? 'Meta',
          user_id: inst.user_id,
          reference_month: inst.reference_month,
          amount: inst.paid_amount,
        })
        toast('Solicitação de estorno enviada ao administrador.', 'success')
      }
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      setUndoConfirmId(null)
    } catch (err: any) {
      toast(err.message || 'Erro', 'error')
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
        <StatCard title="A Pagar" value={formatCurrency(pendingTotal)} icon={<Clock className="size-5" />} color="warning" subtitle={`${allPending.length} parcelas — todos`} />
        <StatCard title="Pagas" value={formatCurrency(paidTotal)} icon={<CheckCircle2 className="size-5" />} color="success" subtitle={`${allPaid.length} parcelas — todos`} />
        <StatCard title="Atrasadas" value={formatCurrency(overdueTotal)} icon={<AlertCircle className="size-5" />} color="danger" subtitle={`${allOverdue.length} parcelas — todos`} />
      </div>

      {goalGroups.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-8" />} title="Nenhuma parcela encontrada" description="Você ainda não tem parcelas associadas a metas." />
      ) : (
        <div className="space-y-3">
          {goalGroups.map(({ goalId, goalName, installments }) => {
            const isExpanded = expandedGoalIds.has(goalId)
            const pending = installments.filter(i => i.status === 'pending' || i.status === 'overdue')
            const paid = installments.filter(i => i.status === 'paid')
            const hasOverdue = installments.some(i => i.status === 'overdue')
            const goalPendingTotal = pending.reduce((s, i) => s + i.expected_amount, 0)

            return (
              <div key={goalId} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGoal(goalId)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${hasOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary-100 dark:bg-primary-900/30'}`}>
                    <Target className={`size-4 ${hasOverdue ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{goalName}</p>
                    <p className="text-xs text-gray-400">
                      {pending.length > 0 && <span className={hasOverdue ? 'text-red-500' : 'text-amber-500'}>{pending.length} pendente{pending.length > 1 ? 's' : ''}</span>}
                      {pending.length > 0 && paid.length > 0 && <span className="mx-1">·</span>}
                      {paid.length > 0 && <span className="text-green-600">{paid.length} paga{paid.length > 1 ? 's' : ''}</span>}
                    </p>
                  </div>
                  {pending.length > 0 && (
                    <span className={`text-xs font-semibold shrink-0 ${hasOverdue ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      {formatCurrency(goalPendingTotal)}
                    </span>
                  )}
                  {isExpanded ? <ChevronDown className="size-4 text-gray-400 shrink-0" /> : <ChevronRight className="size-4 text-gray-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                    {installments
                      .sort((a, b) => a.due_date.localeCompare(b.due_date))
                      .map(inst => {
                        const isConfirming = confirmingId === inst.id
                        const isUndoConfirming = undoConfirmId === inst.id
                        const isProcessing = processingId === inst.id
                        const canPay = inst.status === 'pending' || inst.status === 'overdue'
                        const canUndo = inst.status === 'paid'

                        return (
                          <div key={inst.id} className="px-4 py-3 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {formatMonthYear(inst.reference_month)}
                                </p>
                                {inst.due_date && <p className="text-xs text-gray-400">Vence {formatDate(inst.due_date)}</p>}
                                {inst.payment_date && inst.status === 'paid' && (
                                  <p className="text-xs text-green-600">Pago em {formatDate(inst.payment_date)}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {inst.status === 'paid'
                                  ? <span className="text-sm font-bold text-green-600">{formatCurrency(inst.paid_amount)}</span>
                                  : <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(inst.expected_amount)}</span>
                                }
                                <div className="flex items-center gap-1.5">
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
                                      title={isAdmin ? 'Desfazer pagamento' : 'Solicitar estorno'}
                                    >
                                      <RotateCcw className="size-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isConfirming && (
                              <div className="flex items-center gap-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
                                <p className="text-xs text-primary-700 dark:text-primary-400 flex-1">
                                  Confirmar pagamento de <strong>{formatCurrency(inst.expected_amount)}</strong>?
                                </p>
                                <Button size="sm" loading={isProcessing} onClick={() => handlePay(inst.id, inst.expected_amount)}>Sim</Button>
                                <Button size="sm" variant="ghost" disabled={isProcessing} onClick={() => setConfirmingId(null)}>Não</Button>
                              </div>
                            )}

                            {isUndoConfirming && (
                              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                                  {isAdmin ? 'Desfazer este pagamento?' : 'Solicitar estorno ao administrador?'}
                                </p>
                                <Button size="sm" variant="secondary" loading={isProcessing} onClick={() => handleUndo(inst.id)}>Sim</Button>
                                <Button size="sm" variant="ghost" disabled={isProcessing} onClick={() => setUndoConfirmId(null)}>Não</Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
