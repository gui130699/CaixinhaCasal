import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingUp, Target, CreditCard, Download } from 'lucide-react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { transactionsApi } from '@/api/transactions.api'
import { goalsApi } from '@/api/goals.api'
import { installmentsApi } from '@/api/installments.api'
import { useAuthStore } from '@/stores/auth.store'
import { Card, StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/empty-state'
import { formatCurrency, calculateProgress } from '@/lib/utils'

const COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ReportsPage() {
  const { family } = useAuthStore()

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', family?.id],
    queryFn: () => transactionsApi.listByFamily(family!.id, {}),
    enabled: !!family,
  })

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['goals', family?.id],
    queryFn: () => goalsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const { data: installments = [], isLoading: loadingInst } = useQuery({
    queryKey: ['installments', family?.id],
    queryFn: () => installmentsApi.listByFamily(family!.id, {}),
    enabled: !!family,
  })

  const isLoading = loadingTx || loadingGoals || loadingInst
  if (isLoading) return <PageLoading />

  const transactions = txData?.data ?? []

  // Monthly aggregation
  const monthlyMap: Record<string, { entradas: number; saidas: number; mes: string }> = {}
  transactions.forEach(tx => {
    const key = tx.date.slice(0, 7)
    if (!monthlyMap[key]) monthlyMap[key] = { mes: key, entradas: 0, saidas: 0 }
    if (tx.type === 'income') monthlyMap[key].entradas += tx.amount
    else monthlyMap[key].saidas += tx.amount
  })
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12)

  // Goals pie chart
  const goalsPie = goals.map(g => ({ name: g.name, value: g.current_balance }))

  // Installments by member
  const memberMap: Record<string, { name: string; pago: number; pendente: number }> = {}
  installments.forEach(inst => {
    const name = inst.profile?.full_name ?? 'Desconhecido'
    if (!memberMap[name]) memberMap[name] = { name, pago: 0, pendente: 0 }
    if (inst.status === 'paid') memberMap[name].pago += inst.paid_amount
    else memberMap[name].pendente += inst.expected_amount
  })
  const memberData = Object.values(memberMap)

  const totalSaved = goals.reduce((s, g) => s + g.current_balance, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)
  const totalPaid = installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.paid_amount, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatórios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Visão geral financeira da família</p>
        </div>
        <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => window.print()}>Exportar</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Guardado" value={formatCurrency(totalSaved)} icon={<Target className="size-5" />} color="primary" />
        <StatCard title="Progresso Geral" value={`${calculateProgress(totalSaved, totalTarget).toFixed(0)}%`} icon={<TrendingUp className="size-5" />} color="success" />
        <StatCard title="Parcelas Pagas" value={formatCurrency(totalPaid)} icon={<CreditCard className="size-5" />} color="warning" />
        <StatCard title="Receita Total" value={formatCurrency(totalIncome)} icon={<BarChart2 className="size-5" />} color="success" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Entradas x Saídas Mensais</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                <Bar dataKey="entradas" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Entradas" />
                <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Distribuição por Meta</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={goalsPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {goalsPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Contribuições por Membro</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={memberData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
              <Bar dataKey="pago" fill="#22c55e" radius={[0, 4, 4, 0]} name="Pago" />
              <Bar dataKey="pendente" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Pendente" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
