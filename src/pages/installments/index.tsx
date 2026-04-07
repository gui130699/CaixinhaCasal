import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, CheckCircle2, AlertCircle, Clock, RotateCcw, Users } from 'lucide-react'
import { installmentsApi } from '@/api/installments.api'
import { useAuthStore } from '@/stores/auth.store'
import { Card, StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InstallmentStatusBadge } from '@/components/ui/badge'
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
  const { family, user } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  // Quando não-nulo, exibe todos os membros filtrados por esse status (clique nos cards)
  const [showAllStatus, setShowAllStatus] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Busca todas as parcelas da família (para os totais dos cards)
  const { data: allInstallments = [], isLoading } = useQuery({
    queryKey: ['installments', family?.id],
    queryFn: () => installmentsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  // Totais usando TODOS os membros
  const allPending = allInstallments.filter(i => i.status === 'pending' || i.status === 'overdue')
  const allPaid = allInstallments.filter(i => i.status === 'paid')
  const allOverdue = allInstallments.filter(i => i.status === 'overdue')
  const pendingTotal = allPending.reduce((s, i) => s + i.expected_amount, 0)
  const paidTotal = allPaid.reduce((s, i) => s + i.paid_amount, 0)
  const overdueTotal = allOverdue.reduce((s, i) => s + i.expected_amount, 0)

  // Lista exibida: se clicou em um card mostra todos os membros com aquele status,
  // caso contrário mostra apenas as parcelas do usuário logado
  const myInstallments = allInstallments.filter(i => i.user_id === user?.uid)

  const displayList = showAllStatus !== null
    ? allInstallments.filter(i => {
        if (showAllStatus === 'pending') return i.status === 'pending' || i.status === 'overdue'
        return i.status === showAllStatus
      })
    : myInstallments.filter(i => {
        if (!statusFilter) return true
        return i.status === statusFilter
      })

  const handleCardClick = (status: string) => {
    setShowAllStatus(prev => prev === status ? null : status)
    setStatusFilter('')
    setConfirmingId(null)
    setUndoConfirmId(null)
  }

  const handleTabClick = (value: string) => {
    setStatusFilter(value)
    setShowAllStatus(null)
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

  const handleRequestUndo = async (installmentId: string) => {
    const inst = allInstallments.find(i => i.id === installmentId)
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

      {/* Cards clicáveis: mostram totais de TODOS os membros; clique filtra a lista */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div onClick={() => handleCardClick('pending')} className="cursor-pointer">
          <StatCard
            title="A Pagar"
            value={formatCurrency(pendingTotal)}
            icon={<Clock className="size-5" />}
            color={showAllStatus === 'pending' ? 'primary' : 'warning'}
            subtitle={`${allPending.length} parcelas — todos`}
          />
        </div>
        <div onClick={() => handleCardClick('paid')} className="cursor-pointer">
          <StatCard
            title="Pagas"
            value={formatCurrency(paidTotal)}
            icon={<CheckCircle2 className="size-5" />}
            color={showAllStatus === 'paid' ? 'primary' : 'success'}
            subtitle={`${allPaid.length} parcelas — todos`}
          />
        </div>
        <div onClick={() => handleCardClick('overdue')} className="cursor-pointer">
          <StatCard
            title="Atrasadas"
            value={formatCurrency(overdueTotal)}
            icon={<AlertCircle className="size-5" />}
            color={showAllStatus === 'overdue' ? 'primary' : 'danger'}
            subtitle={`${allOverdue.length} parcelas — todos`}
          />
        </div>
      </div>

      <Card padding="none">
        {/* Cabeçalho: tabs ou indicador de "todos os membros" */}
        <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-100 dark:border-gray-800 flex-wrap">
          {showAllStatus ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg">
                <Users className="size-3.5" />
                Todos os membros •&nbsp;
                {showAllStatus === 'pending' ? 'A Pagar' : showAllStatus === 'paid' ? 'Pagos' : 'Atrasados'}
              </span>
              <button
                onClick={() => setShowAllStatus(null)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                Ver apenas meus
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => handleTabClick(tab.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === tab.value
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {!showAllStatus && (
            <span className="text-[11px] text-gray-400 shrink-0">Apenas as minhas</span>
          )}
        </div>

        {displayList.length === 0 ? (
          <EmptyState icon={<CreditCard className="size-8" />} title="Nenhuma parcela encontrada" description="Ajuste os filtros ou aguarde o próximo mês" />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {displayList.map(inst => {
              const isConfirming = confirmingId === inst.id
              const isUndoConfirming = undoConfirmId === inst.id
              const isProcessing = processingId === inst.id
              const isOwn = inst.user_id === user?.uid
              const canPay = isOwn && (inst.status === 'pending' || inst.status === 'overdue')
              const canUndo = isOwn && inst.status === 'paid'

              return (
                <div key={inst.id} className="px-4 py-3 space-y-2">
                  {/* Linha principal: 2 linhas internas para não sobrepor */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Coluna esquerda: nome da meta + info secundária */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-snug">
                        {inst.goal?.name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatMonthYear(inst.reference_month)}
                        {showAllStatus && inst.profile?.full_name && (
                          <span className="text-primary-600 dark:text-primary-400"> · {inst.profile.full_name.split(' ')[0]}</span>
                        )}
                      </p>
                      {inst.due_date && (
                        <p className="text-[10px] text-gray-400">Vence {formatDate(inst.due_date)}</p>
                      )}
                    </div>

                    {/* Coluna direita: valor + badge + ação — empilhados verticalmente */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {inst.status === 'paid' ? (
                        <span className="text-sm font-bold text-green-600">{formatCurrency(inst.paid_amount)}</span>
                      ) : (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(inst.expected_amount)}</span>
                      )}
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
                            title="Solicitar estorno"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confirmação de pagamento */}
                  {isConfirming && (
                    <div className="flex items-center gap-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
                      <p className="text-xs text-primary-700 dark:text-primary-400 flex-1">
                        Confirmar pagamento de <strong>{formatCurrency(inst.expected_amount)}</strong>?
                      </p>
                      <Button size="sm" loading={isProcessing} onClick={() => handlePay(inst.id, inst.expected_amount)}>
                        Sim
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isProcessing} onClick={() => setConfirmingId(null)}>
                        Não
                      </Button>
                    </div>
                  )}

                  {/* Confirmação de estorno */}
                  {isUndoConfirming && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                        Solicitar estorno ao administrador?
                      </p>
                      <Button size="sm" variant="secondary" loading={isProcessing} onClick={() => handleRequestUndo(inst.id)}>
                        Sim
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isProcessing} onClick={() => setUndoConfirmId(null)}>
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

