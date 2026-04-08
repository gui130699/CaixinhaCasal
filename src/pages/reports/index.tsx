import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingUp, Target, CreditCard } from 'lucide-react'
import { goalsApi } from '@/api/goals.api'
import { installmentsApi } from '@/api/installments.api'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { useAuthStore } from '@/stores/auth.store'
import { Card, StatCard } from '@/components/ui/card'
import { PageLoading } from '@/components/ui/empty-state'
import { formatCurrency, calculateProgress } from '@/lib/utils'
import { GoalStatusBadge } from '@/components/ui/badge'

export default function ReportsPage() {
  const { family } = useAuthStore()

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['goals', family?.id],
    queryFn: () => goalsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const { data: installments = [], isLoading: loadingInst } = useQuery({
    queryKey: ['installments', family?.id],
    queryFn: () => installmentsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['bank-accounts', family?.id],
    queryFn: () => bankAccountsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const isLoading = loadingGoals || loadingInst || loadingAccounts
  if (isLoading) return <PageLoading />

  const activeGoals = goals.filter(g => g.status === 'active')
  const totalSaved = goals.reduce((s, g) => s + (g.current_balance ?? 0), 0)
  const totalTarget = activeGoals.reduce((s, g) => s + (g.target_amount ?? 0), 0)
  const paidInstallments = installments.filter(i => i.status === 'paid')
  const pendingInstallments = installments.filter(i => i.status === 'pending' || i.status === 'overdue')
  const totalPaid = paidInstallments.reduce((s, i) => s + i.paid_amount, 0)
  const totalPending = pendingInstallments.reduce((s, i) => s + i.expected_amount, 0)
  const totalBalance = accounts.filter(a => a.status === 'active').reduce((s, a) => s + (a.current_balance ?? 0), 0)

  // Contribuições por membro (parcelas pagas)
  const memberMap: Record<string, { name: string; pago: number; pendente: number }> = {}
  installments.forEach(inst => {
    const name = inst.profile?.full_name ?? 'Desconhecido'
    if (!memberMap[name]) memberMap[name] = { name, pago: 0, pendente: 0 }
    if (inst.status === 'paid') memberMap[name].pago += inst.paid_amount
    else if (inst.status === 'pending' || inst.status === 'overdue') memberMap[name].pendente += inst.expected_amount
  })
  const memberData = Object.values(memberMap)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatórios</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Visão geral financeira da família</p>
      </div>

      {/* Totais gerais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Saldo Total" value={formatCurrency(totalBalance)} icon={<BarChart2 className="size-5" />} color="primary" />
        <StatCard title="Total Guardado" value={formatCurrency(totalSaved)} icon={<Target className="size-5" />} color="success" />
        <StatCard title="Parcelas Pagas" value={formatCurrency(totalPaid)} icon={<CreditCard className="size-5" />} color="success" />
        <StatCard title="A Pagar" value={formatCurrency(totalPending)} icon={<TrendingUp className="size-5" />} color="warning" />
      </div>

      {/* Metas ativas */}
      {activeGoals.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Progresso das Metas</h3>
          <div className="space-y-4">
            {activeGoals.map(goal => {
              const pct = calculateProgress(goal.current_balance, goal.target_amount)
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{goal.name}</p>
                      <GoalStatusBadge status={goal.status} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{formatCurrency(goal.current_balance)} / {formatCurrency(goal.target_amount)}</span>
                      <span className="text-xs font-bold text-primary-600">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-primary-600' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Contribuições por membro */}
      {memberData.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Contribuições por Membro</h3>
          <div className="space-y-3">
            {memberData.map(m => (
              <div key={m.name} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium text-gray-700 dark:text-gray-300 truncate shrink-0">{m.name}</div>
                <div className="flex-1 space-y-1">
                  {m.pago > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <span className="text-xs text-gray-500 w-14 shrink-0">Pago</span>
                      <span className="text-xs font-semibold text-green-600">{formatCurrency(m.pago)}</span>
                    </div>
                  )}
                  {m.pendente > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs text-gray-500 w-14 shrink-0">Pendente</span>
                      <span className="text-xs font-semibold text-amber-600">{formatCurrency(m.pendente)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
