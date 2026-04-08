import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Building2, Star, TrendingUp, MoreVertical, ArrowRight } from 'lucide-react'
import { bankAccountsApi } from '@/api/bank-accounts.api'
import { useAuthStore } from '@/stores/auth.store'
import { Card, StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import CreateAccountModal from './create-account-modal'

export default function BankingPage() {
  const { family } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts', family?.id],
    queryFn: () => bankAccountsApi.listByFamily(family!.id),
    enabled: !!family,
  })

  const totalBalance = accounts.reduce((s, a) => s + (a.status === 'active' ? (a.current_balance ?? 0) : 0), 0)
  const primaryAccount = accounts.find(a => a.is_primary)

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await bankAccountsApi.delete(deletingId, family!.id)
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast('Conta removida', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao remover conta', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetPrimary = async (id: string) => {
    setSettingPrimary(id)
    try {
      await bankAccountsApi.setPrimary(id, family!.id)
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast('Conta principal atualizada', 'success')
    } catch {
      toast('Erro ao atualizar conta', 'error')
    } finally {
      setSettingPrimary(null)
    }
  }

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await bankAccountsApi.toggleStatus(id, active, family!.id)
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    } catch {
      toast('Erro ao atualizar status', 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contas Bancárias</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie as contas da família</p>
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setShowCreate(true)}>Nova Conta</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Saldo Total" value={formatCurrency(totalBalance)} icon={<TrendingUp className="size-5" />} color="primary" />
        <StatCard title="Contas Ativas" value={String(accounts.filter(a => a.status === 'active').length)} icon={<Building2 className="size-5" />} color="success" />
        <StatCard title="Conta Principal" value={primaryAccount?.nickname ?? '—'} icon={<Star className="size-5" />} color="warning" />
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon={<Building2 className="size-8" />} title="Nenhuma conta cadastrada" description="Adicione uma conta bancária para começar" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <div key={account.id} className={`card p-4 ${account.status !== 'active' ? 'opacity-60' : ''} relative group`}>
              {/* Cabeçalho: ícone + nome + badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Building2 className="size-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{account.nickname}</p>
                    <p className="text-xs text-gray-400 truncate">{account.bank_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {account.is_primary && <span className="badge bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Principal</span>}
                  {account.status !== 'active' && <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inativa</span>}
                </div>
              </div>

              {/* Saldo + número da conta */}
              <div className="flex items-end justify-between mb-3 px-0.5">
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5 uppercase tracking-wide">Saldo</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(account.current_balance ?? 0)}</p>
                </div>
                {account.account_number && (
                  <p className="text-xs text-gray-400">Ag. {account.agency ?? '—'} · Cc. {account.account_number}</p>
                )}
              </div>

              {/* Rodapé */}
              <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-gray-800">
                <Link to={`/banking/${account.id}`} className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
                  Ver extrato <ArrowRight className="size-3" />
                </Link>
                <div className="relative">
                  <details className="group/menu">
                    <summary className="list-none cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                      <MoreVertical className="size-4 text-gray-400" />
                    </summary>
                    <div className="absolute right-0 bottom-8 z-10 w-44 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-1">
                      {!account.is_primary && (
                        <button onClick={() => handleSetPrimary(account.id)} disabled={settingPrimary === account.id} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                          Definir como principal
                        </button>
                      )}
                      <button onClick={() => handleToggle(account.id, account.status !== 'active')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                        {account.status === 'active' ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => setDeletingId(account.id)} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        Remover
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateAccountModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Remover conta"
        message="Esta ação não pode ser desfeita. Todos os dados da conta serão perdidos."
        confirmLabel="Remover"
        danger
      />
    </div>
  )
}
