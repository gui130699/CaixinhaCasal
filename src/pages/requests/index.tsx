import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Inbox, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { requestsApi } from '@/api/requests.api'
import { useAuthStore } from '@/stores/auth.store'
import { Card, StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatMonthYear } from '@/lib/utils'
import type { GoalRequestStatus } from '@/types'

const STATUS_TABS: { label: string; value: GoalRequestStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Aprovados', value: 'approved' },
  { label: 'Rejeitados', value: 'rejected' },
]

export default function RequestsPage() {
  const { family, user } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<GoalRequestStatus | 'all'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', family?.id],
    queryFn: () => requestsApi.list(family!.id),
    enabled: !!family?.id,
  })

  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter)

  const pending = requests.filter(r => r.status === 'pending')
  const approved = requests.filter(r => r.status === 'approved')
  const rejected = requests.filter(r => r.status === 'rejected')

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      await requestsApi.approve(requestId, family!.id, user!.uid)
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      toast('Solicitação aprovada. Parcela revertida para pendente.', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao aprovar solicitação', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      await requestsApi.reject(requestId, family!.id, user!.uid)
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      toast('Solicitação rejeitada.', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao rejeitar solicitação', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Solicitações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie solicitações de estorno de pagamentos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Pendentes"
          value={String(pending.length)}
          icon={<Clock className="size-5" />}
          color="warning"
          subtitle="aguardando revisão"
        />
        <StatCard
          title="Aprovados"
          value={String(approved.length)}
          icon={<CheckCircle2 className="size-5" />}
          color="success"
          subtitle="estornos liberados"
        />
        <StatCard
          title="Rejeitados"
          value={String(rejected.length)}
          icon={<XCircle className="size-5" />}
          color="danger"
          subtitle="solicitações negadas"
        />
      </div>

      <Card padding="none">
        <div className="flex items-center gap-1 p-4 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
              {tab.value === 'pending' && pending.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-8" />}
            title="Nenhuma solicitação"
            description={statusFilter === 'pending' ? 'Não há solicitações pendentes.' : 'Nenhuma solicitação encontrada.'}
          />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(req => {
              const isProcessing = processingId === req.id
              const isPending = req.status === 'pending'

              return (
                <div key={req.id} className="flex items-center gap-3 px-4 py-4">
                  <Avatar name={req.profile?.full_name ?? 'U'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {req.goal_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {req.profile?.full_name ?? '—'} • {formatMonthYear(req.reference_month)}
                    </p>
                  </div>
                  <div className="text-right mr-3">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(req.amount)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(req.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {req.status === 'approved' && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="size-3" /> Aprovado
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                        <XCircle className="size-3" /> Rejeitado
                      </span>
                    )}
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          loading={isProcessing}
                          onClick={() => handleApprove(req.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isProcessing}
                          onClick={() => handleReject(req.id)}
                        >
                          Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
