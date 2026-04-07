import { useQuery } from '@tanstack/react-query'
import {
  Wallet, Target, AlertCircle, CreditCard,
  ArrowUpRight, Building2, Calendar, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '@/stores/auth.store'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { goalsApi } from '@/api/goals.api'
import { installmentsApi } from '@/api/installments.api'
import { transactionsApi } from '@/api/transactions.api'
import { StatCard } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/app-layout'
import { InstallmentStatusBadge } from '@/components/ui/badge'
import { formatCurrency, formatDate, calculateProgress, transactionTypeLabel } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { profile, family } = useAuthStore()
  const familyId = family?.id ?? ''

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['bank-accounts', familyId],
    queryFn: () => bankAccountsApi.listByFamily(familyId),
    enabled: !!familyId,
  })

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['goals', familyId],
    queryFn: () => goalsApi.listByFamily(familyId),
    enabled: !!familyId,
  })

  const { data: currentMonthInstallments = [], isLoading: loadingInstallments } = useQuery({
    queryKey: ['installments-current', familyId],
    queryFn: () => installmentsApi.getCurrentMonth(familyId),
    enabled: !!familyId,
  })

  const { data: overdueInstallments = [] } = useQuery({
    queryKey: ['installments-overdue', familyId],
    queryFn: () => installmentsApi.getOverdue(familyId),
    enabled: !!familyId,
  })

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['transactions-recent', familyId],
    queryFn: async () => (await transactionsApi.listByFamily(familyId, { limit: 8 })).data,
    enabled: !!familyId,
  })

  const isLoading = loadingAccounts || loadingGoals || loadingInstallments

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)
  const activeGoals = goals.filter(g => g.status === 'active')
  const totalTarget = activeGoals.reduce((s, g) => s + g.target_amount, 0)
  const totalSaved = activeGoals.reduce((s, g) => s + g.current_balance, 0)
  const monthlyPaid = currentMonthInstallments.filter(i => i.status === 'paid').reduce((s, i) => s + i.paid_amount, 0)
  const monthlyPending = currentMonthInstallments.filter(i => ['pending', 'partial', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.expected_amount - i.paid_amount), 0)
  const overdueAmount = overdueInstallments.reduce((s, i) => s + (i.expected_amount - i.paid_amount), 0)

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Bom dia' : greetingHour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${profile?.full_name?.split(' ')[0] ?? 'você'}!`}
        description={`Família ${family?.name ?? ''} • ${format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
      />

      {/* Alertas de atraso */}
      {overdueInstallments.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {overdueInstallments.length} parcela{overdueInstallments.length > 1 ? 's' : ''} em atraso
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Total em aberto: {formatCurrency(overdueAmount)}
            </p>
          </div>
          <Link to="/installments?status=overdue">
            <Button variant="danger" size="sm">Ver parcelas</Button>
          </Link>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(totalBalance)}
          subtitle={`${accounts.length} conta${accounts.length !== 1 ? 's' : ''}`}
          icon={<Wallet className="size-5" />}
          color="primary"
          loading={isLoading}
        />
        <StatCard
          title="Meta Principal"
          value={formatCurrency(totalSaved)}
          subtitle={`de ${formatCurrency(totalTarget)}`}
          icon={<Target className="size-5" />}
          color="success"
          loading={isLoading}
        />
        <StatCard
          title="Pago no Mês"
          value={formatCurrency(monthlyPaid)}
          subtitle={`${currentMonthInstallments.filter(i => i.status === 'paid').length} parcelas pagas`}
          icon={<CreditCard className="size-5" />}
          color="success"
          loading={isLoading}
        />
        <StatCard
          title="Pendente no Mês"
          value={formatCurrency(monthlyPending)}
          subtitle={overdueInstallments.length > 0 ? `${overdueInstallments.length} atrasadas` : 'em dia'}
          icon={<Calendar className="size-5" />}
          color={monthlyPending > 0 ? 'warning' : 'default'}
          loading={isLoading}
        />
      </div>

      {/* Goals + Accounts + Recent */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Metas ativas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Metas Ativas</h3>
            <Link to="/goals" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowUpRight className="size-3" />
            </Link>
          </div>
          {activeGoals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma meta ativa</p>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 3).map(goal => {
                const pct = calculateProgress(goal.current_balance, goal.target_amount)
                return (
                  <Link key={goal.id} to={`/goals/${goal.id}`}>
                    <div className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors -mx-1">
                      <div className="flex justify-between mb-1.5">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">{goal.name}</p>
                        <p className="text-xs font-bold text-primary-600 ml-2">{pct.toFixed(0)}%</p>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill bg-primary-600" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <p className="text-[10px] text-gray-400">{formatCurrency(goal.current_balance)}</p>
                        <p className="text-[10px] text-gray-400">{formatCurrency(goal.target_amount)}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Contas bancárias */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contas Bancárias</h3>
            <Link to="/banking" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowUpRight className="size-3" />
            </Link>
          </div>
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma conta cadastrada</p>
          ) : (
            <div className="space-y-3">
              {accounts.slice(0, 4).map(account => (
                <Link key={account.id} to={`/banking/${account.id}`}>
                  <div className="flex items-center gap-3 p-2 -mx-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <Building2 className="size-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{account.nickname}</p>
                      <p className="text-[10px] text-gray-400">{account.bank_name}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 shrink-0">
                      {formatCurrency(account.current_balance)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Parcelas do mês */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Parcelas do Mês</h3>
            <Link to="/installments" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowUpRight className="size-3" />
            </Link>
          </div>
          {currentMonthInstallments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma parcela no mês</p>
          ) : (
            <div className="space-y-2.5">
              {currentMonthInstallments.slice(0, 4).map(inst => (
                <div key={inst.id} className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {inst.goal?.name ?? 'Meta'}
                    </p>
                    <p className="text-[10px] text-gray-400">{inst.profile?.full_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(inst.expected_amount)}</p>
                    <InstallmentStatusBadge status={inst.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimas movimentações */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Movimentações Recentes</h3>
          <Link to="/transactions" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            Ver todas <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma movimentação</p>
          ) : (
            recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  ['deposit','extra_deposit','interest','transfer_in'].includes(tx.type)
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-500'
                }`}>
                  <RefreshCw className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description}</p>
                  <p className="text-[10px] text-gray-400">
                    {transactionTypeLabel[tx.type]} • {formatDate(tx.transaction_date)}
                  </p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${
                  ['deposit','extra_deposit','interest','transfer_in'].includes(tx.type)
                    ? 'text-green-600'
                    : 'text-red-500'
                }`}>
                  {['deposit','extra_deposit','interest','transfer_in'].includes(tx.type) ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
