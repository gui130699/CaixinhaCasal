import { useQuery } from '@tanstack/react-query'
import { History, Target, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { goalsApi } from '@/api/goals.api'
import { installmentsApi } from '@/api/installments.api'
import { Card } from '@/components/ui/card'
import { EmptyState, PageLoading } from '@/components/ui/empty-state'
import { GoalStatusBadge } from '@/components/ui/badge'
import { formatCurrency, formatDate, calculateProgress } from '@/lib/utils'

const HISTORY_STATUSES = ['completed', 'cancelled', 'deleted']

export default function HistoryPage() {
  const { family } = useAuthStore()

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['goals', family?.id],
    queryFn: () => goalsApi.listByFamily(family!.id),
    enabled: !!family?.id,
  })

  const { data: allInstallments = [], isLoading: loadingInst } = useQuery({
    queryKey: ['installments', family?.id],
    queryFn: () => installmentsApi.listByFamily(family!.id),
    enabled: !!family?.id,
  })

  const isLoading = loadingGoals || loadingInst

  const historyGoals = goals.filter(g => HISTORY_STATUSES.includes(g.status))

  const getGoalStats = (goalId: string) => {
    const insts = allInstallments.filter(i => i.goal_id === goalId)
    const paid = insts.filter(i => i.status === 'paid')
    const totalPaid = paid.reduce((s, i) => s + i.paid_amount, 0)
    return { totalInstallments: insts.length, paidCount: paid.length, totalPaid }
  }

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
    if (status === 'deleted') return <Trash2 className="size-4 text-gray-500 dark:text-gray-400" />
    return <XCircle className="size-4 text-red-500 dark:text-red-400" />
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Histórico</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Metas concluídas, canceladas ou excluídas</p>
      </div>

      {historyGoals.length === 0 ? (
        <EmptyState
          icon={<History className="size-8" />}
          title="Nenhuma meta no histórico"
          description="Metas concluídas, canceladas ou excluídas aparecerão aqui."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {historyGoals.map(goal => {
            const { totalInstallments, paidCount, totalPaid } = getGoalStats(goal.id)
            const pct = calculateProgress(goal.current_balance, goal.target_amount)

            return (
              <Card key={goal.id} className="opacity-90">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <StatusIcon status={goal.status} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">{goal.name}</h3>
                      {goal.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{goal.description}</p>
                      )}
                    </div>
                  </div>
                  <GoalStatusBadge status={goal.status} />
                </div>

                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Progresso</span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-primary-600' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-gray-400 mb-0.5">Acumulado</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Objetivo</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(goal.target_amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Parcelas pagas</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{paidCount}/{totalInstallments}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">{goal.status === 'deleted' ? 'Excluído' : goal.status === 'completed' ? 'Concluído' : 'Cancelado'}</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {goal.status === 'deleted'
                        ? formatDate((goal as any).deleted_at ?? goal.updated_at)
                        : goal.status === 'completed'
                        ? formatDate(goal.completed_at ?? goal.updated_at)
                        : formatDate(goal.updated_at)}
                    </p>
                  </div>
                </div>

                {goal.bank_account && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 truncate">
                    🏦 {goal.bank_account.nickname}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
