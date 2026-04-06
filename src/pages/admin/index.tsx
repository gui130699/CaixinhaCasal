import { useQuery } from '@tanstack/react-query'
import { Users, Home, CreditCard, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { familiesApi } from '@/api/families.api'
import { profilesApi } from '@/api/profiles.api'
import { Card, StatCard } from '@/components/ui/card'
import { PageLoading } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'

export default function AdminPage() {
  const { data: families = [], isLoading: lf } = useQuery({ queryKey: ['admin-families'], queryFn: () => familiesApi.list() })
  const { data: users = [], isLoading: lu } = useQuery({ queryKey: ['admin-users'], queryFn: () => profilesApi.listAllWithEmail() })

  if (lf || lu) return <PageLoading />

  const activeUsers = users.filter(u => u.status === 'active')
  const recentFamilies = [...families].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Painel Administrativo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerenciamento global do sistema</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Famílias" value={String(families.length)} icon={<Home className="size-5" />} color="primary" />
        <StatCard title="Usuários" value={String(users.length)} icon={<Users className="size-5" />} color="success" />
        <StatCard title="Ativos" value={String(activeUsers.length)} icon={<Activity className="size-5" />} color="warning" />
        <StatCard title="Inativos" value={String(users.length - activeUsers.length)} icon={<CreditCard className="size-5" />} color="danger" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Famílias Recentes</h3>
            <Link to="/admin/families" className="text-xs text-primary-600 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentFamilies.map(f => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.invite_code}</p>
                </div>
                <p className="text-xs text-gray-400">{formatDate(f.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Usuários Recentes</h3>
            <Link to="/admin/users" className="text-xs text-primary-600 hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {users.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.full_name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {u.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { to: '/admin/families', label: 'Gerenciar Famílias', icon: <Home className="size-5" />, desc: 'Ver, criar e editar famílias' },
          { to: '/admin/users', label: 'Gerenciar Usuários', icon: <Users className="size-5" />, desc: 'Administrar contas de usuários' },
          { to: '/admin/audit', label: 'Log de Auditoria', icon: <Activity className="size-5" />, desc: 'Rastrear ações no sistema' },
        ].map(item => (
          <Link key={item.to} to={item.to} className="card card-hover flex items-center gap-3 p-5">
            <div className="size-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">{item.icon}</div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
