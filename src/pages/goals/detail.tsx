import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Users, Building2, Calendar, TrendingUp, CreditCard } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { goalsApi } from '@/api/goals.api'
import { installmentsApi } from '@/api/installments.api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoalStatusBadge, InstallmentStatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PageLoading } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, formatMonthYear, calculateProgress } from '@/lib/utils'

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: goal, isLoading } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => goalsApi.getById(id!),
    enabled: !!id,
  })

  const { data: installments = [] } = useQuery({
    queryKey: ['installments-goal', id],
    queryFn: () => installmentsApi.listByGoal(id!),
    enabled: !!id,
  })

  if (isLoading) return <PageLoading />
  if (!goal) return <div className="text-center py-12">Meta não encontrada</div>

  const pct = calculateProgress(goal.current_balance, goal.target_amount)

  // Dados do cronograma para o gráfico
  const chartData = installments.slice(0, 12).map(inst => ({
    month: formatDate(inst.reference_month, 'MMM/yy'),
    previsto: inst.expected_amount,
    pago: inst.paid_amount,
  }))

  // Agrupar por membro
  const memberInstallments = goal.goal_members ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/goals" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors">
          <ArrowLeft className="size-4" /> Voltar às metas
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{goal.name}</h1>
              <GoalStatusBadge status={goal.status} />
            </div>
            {goal.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{goal.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress overview */}
      <Card padding="lg">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progresso total</span>
              <span className="text-lg font-bold text-primary-600">{pct.toFixed(1)}%</span>
            </div>
            <div className="progress-bar h-3 mb-4 rounded-full">
              <div
                className={`progress-fill ${pct >= 100 ? 'bg-green-500' : 'bg-primary-600'} h-3 rounded-full`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Objetivo', value: formatCurrency(goal.target_amount) },
                { label: 'Acumulado', value: formatCurrency(goal.current_balance) },
                { label: 'Restante', value: formatCurrency(goal.remaining_amount) },
                { label: 'Parcela', value: formatCurrency(goal.installment_amount) },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="md:w-48 space-y-3">
            {goal.bank_account && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Building2 className="size-4 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Conta</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{goal.bank_account.nickname}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Calendar className="size-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Início</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatDate(goal.start_date)}</p>
              </div>
            </div>
            {goal.target_date && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <TrendingUp className="size-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Prazo</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatDate(goal.target_date)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Members */}
        <Card padding="md" className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Users className="size-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Participantes</h3>
          </div>
          <div className="space-y-3">
            {memberInstallments.map(gm => (
              <div key={gm.id} className="flex items-center gap-3">
                <Avatar name={gm.profile?.full_name ?? 'U'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{gm.profile?.full_name}</p>
                  <p className="text-[10px] text-gray-400">{gm.participation_percent}% • {formatCurrency(gm.expected_monthly_amount)}/mês</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Chart */}
        <Card padding="md" className="md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Evolução das Parcelas</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                <Area type="monotone" dataKey="previsto" stroke="#e5e7eb" strokeWidth={2} fill="#f9fafb" name="Previsto" />
                <Area type="monotone" dataKey="pago" stroke="#4f46e5" strokeWidth={2} fill="#eef2ff" name="Pago" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Installments table */}
      <Card padding="none">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cronograma de Parcelas</h3>
          </div>
          <span className="text-xs text-gray-400">{installments.length} parcelas</span>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Mês</th>
                <th className="table-th">Membro</th>
                <th className="table-th">Previsto</th>
                <th className="table-th">Pago</th>
                <th className="table-th">Vencimento</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {installments.map(inst => (
                <tr key={inst.id} className="table-row-hover">
                  <td className="table-td font-medium">{formatMonthYear(inst.reference_month)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <Avatar name={inst.profile?.full_name ?? 'U'} size="xs" />
                      <span className="text-xs">{inst.profile?.full_name}</span>
                    </div>
                  </td>
                  <td className="table-td">{formatCurrency(inst.expected_amount)}</td>
                  <td className="table-td font-medium text-green-600">{formatCurrency(inst.paid_amount)}</td>
                  <td className="table-td">{formatDate(inst.due_date)}</td>
                  <td className="table-td"><InstallmentStatusBadge status={inst.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
