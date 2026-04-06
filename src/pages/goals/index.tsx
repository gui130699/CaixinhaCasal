import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Target, Search, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { goalsApi } from '@/api/goals.api'
import { PageHeader } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { GoalStatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, calculateProgress } from '@/lib/utils'
import { CreateGoalModal } from './create-goal-modal'
import type { GoalStatus } from '@/types'

const statusFilters: { label: string; value: GoalStatus | 'all' }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'active' },
  { label: 'Pausadas', value: 'paused' },
  { label: 'Concluídas', value: 'completed' },
  { label: 'Canceladas', value: 'cancelled' },
]

export default function GoalsPage() {
  const { family, familyRole, isMasterAdmin } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', family?.id],
    queryFn: () => goalsApi.listByFamily(family!.id),
    enabled: !!family?.id,
  })

  const canManage = familyRole === 'admin' || isMasterAdmin

  const filtered = goals.filter(g => {
    const matchStatus = statusFilter === 'all' || g.status === statusFilter
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas Financeiras"
        description="Acompanhe e gerencie todas as metas da família"
        action={canManage ? (
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setShowCreate(true)}>
            Nova Meta
          </Button>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar meta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="size-4" />}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Goals grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-52 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Target className="size-8" />}
          title="Nenhuma meta encontrada"
          description="Crie sua primeira meta financeira para começar a economizar."
          action={canManage ? (
            <Button leftIcon={<Plus className="size-4" />} onClick={() => setShowCreate(true)}>
              Criar Meta
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(goal => {
            const pct = calculateProgress(goal.current_balance, goal.target_amount)
            return (
              <Link key={goal.id} to={`/goals/${goal.id}`} className="block">
                <Card hover className="h-full">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{goal.name}</h3>
                      {goal.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{goal.description}</p>
                      )}
                    </div>
                    <GoalStatusBadge status={goal.status} />
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Progresso</span>
                      <span className="text-xs font-bold text-primary-600">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-primary-600' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 mb-0.5">Acumulado</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(goal.current_balance)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Objetivo</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(goal.target_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Parcela</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(goal.installment_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Prazo</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(goal.target_date)}</p>
                    </div>
                  </div>

                  {goal.bank_account && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 truncate">
                      🏦 {goal.bank_account.nickname}
                    </div>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateGoalModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['goals', family?.id] })
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}
