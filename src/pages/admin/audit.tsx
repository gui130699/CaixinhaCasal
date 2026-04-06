import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search, Filter } from 'lucide-react'
import { auditApi } from '@/api/audit.api'
import { Card } from '@/components/ui/card'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => auditApi.list({ page, limit: 50 }),
  })

  const logs = data?.data ?? []
  const total = data?.total ?? 0

  const filtered = search
    ? logs.filter(l => l.table_name?.toLowerCase().includes(search.toLowerCase()) || l.action?.toLowerCase().includes(search.toLowerCase()) || l.profile?.full_name?.toLowerCase().includes(search.toLowerCase()))
    : logs

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Log de Auditoria</h1>
        <p className="text-sm text-gray-500">{total} registros no sistema</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar por tabela, ação ou usuário..." className="input-base pl-10 w-full" />
      </div>

      <Card padding="none">
        {filtered.length === 0 ? (
          <EmptyState icon={<Activity className="size-8" />} title="Nenhum log encontrado" description="O log estará disponível conforme o sistema for usado" />
        ) : (
          <>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map(log => (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar name={log.profile?.full_name ?? 'S'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.profile?.full_name ?? 'Sistema'}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>{log.action}</span>
                      <span className="text-xs text-gray-500 font-mono">{log.table_name}</span>
                    </div>
                    {log.description && <p className="text-xs text-gray-400 truncate">{log.description}</p>}
                  </div>
                  <p className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(log.created_at, 'dd/MM HH:mm')}</p>
                </div>
              ))}
            </div>
            {total > 50 && (
              <div className="flex items-center justify-center gap-3 p-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">Anterior</button>
                <span className="text-xs text-gray-500">Página {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">Próxima</button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
