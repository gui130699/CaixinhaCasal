import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { transactionsApi } from '@/api/transactions.api'
import { useAuthStore } from '@/stores/auth.store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoading } from '@/components/ui/empty-state'
import { Avatar } from '@/components/ui/avatar'
import { formatCurrency, formatDate, transactionTypeLabel } from '@/lib/utils'

export default function BankingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { family } = useAuthStore()

  const { data: account, isLoading } = useQuery({
    queryKey: ['bank-account', id],
    queryFn: () => bankAccountsApi.getById(id!, family!.id),
    enabled: !!id && !!family,
  })

  const { data } = useQuery({
    queryKey: ['transactions-account', id],
    queryFn: () => transactionsApi.listByFamily(account!.family_id, { bank_account_id: id }),
    enabled: !!account,
  })

  const transactions = data?.data ?? []

  const incomingTypes = ['deposit', 'extra_deposit', 'interest', 'transfer_in']
  // Build monthly chart data
  const monthlyMap: Record<string, { entradas: number; saidas: number }> = {}
  transactions.forEach(tx => {
    const key = tx.transaction_date.slice(0, 7)
    if (!monthlyMap[key]) monthlyMap[key] = { entradas: 0, saidas: 0 }
    if (incomingTypes.includes(tx.type)) monthlyMap[key].entradas += tx.amount
    else monthlyMap[key].saidas += tx.amount
  })
  const chartData = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, v]) => ({ month, ...v }))

  const income = transactions.filter(t => incomingTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => !incomingTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0)

  if (isLoading) return <PageLoading />
  if (!account) return <div className="text-center py-12">Conta não encontrada</div>

  return (
    <div className="space-y-6">
      <div>
        <Link to="/banking" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors">
          <ArrowLeft className="size-4" /> Voltar às contas
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{account.nickname}</h1>
            <p className="text-sm text-gray-500">{account.bank_name}{account.account_number ? ` • ${account.account_number}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(account.current_balance)}</p>
            <p className="text-xs text-gray-400">Saldo atual</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Entradas', value: income, icon: <TrendingUp className="size-4 text-green-500" />, cls: 'text-green-600' },
          { label: 'Saídas', value: expense, icon: <TrendingDown className="size-4 text-red-500" />, cls: 'text-red-600' },
          { label: 'Líquido', value: income - expense, icon: <ArrowRightLeft className="size-4 text-blue-500" />, cls: income - expense >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(({ label, value, icon, cls }) => (
          <Card key={label} padding="md">
            <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-gray-500">{label}</p></div>
            <p className={`text-lg font-bold ${cls}`}>{formatCurrency(value)}</p>
          </Card>
        ))}
      </div>

      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Fluxo Mensal</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
              <Area type="monotone" dataKey="entradas" stroke="#22c55e" strokeWidth={2} fill="#dcfce7" name="Entradas" />
              <Area type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={2} fill="#fee2e2" name="Saídas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card padding="none">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Movimentações</h3>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {transactions.length === 0 && (
            <p className="text-center py-8 text-sm text-gray-400">Nenhuma movimentação registrada</p>
          )}
          {transactions.map(tx => {
            const isIncoming = ['deposit', 'extra_deposit', 'interest', 'transfer_in'].includes(tx.type)
            return (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${isIncoming ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {isIncoming ? <TrendingUp className="size-4 text-green-600" /> : <TrendingDown className="size-4 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description}</p>
                <p className="text-xs text-gray-400">{formatDate(tx.transaction_date)} • {transactionTypeLabel[tx.type]}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${isIncoming ? 'text-green-600' : 'text-red-500'}`}>
                  {isIncoming ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
                {tx.profile && <Avatar name={tx.profile.full_name} size="xs" className="ml-auto mt-0.5" />}
              </div>
            </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
