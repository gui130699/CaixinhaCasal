import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Search, Mail, Phone } from 'lucide-react'
import { profilesApi } from '@/api/profiles.api'
import { familiesApi } from '@/api/families.api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { Badge, UserStatusBadge, RoleBadge } from '@/components/ui/badge'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, CreateUserFormData } from '@/lib/validators'
import { auth } from '@/lib/firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'

export default function AdminUsersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => profilesApi.listAllWithEmail() })
  const { data: families = [] } = useQuery({ queryKey: ['admin-families'], queryFn: () => familiesApi.list() })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  })

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (data: CreateUserFormData) => {
    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast('Usuário criado!', 'success')
      reset(); setShowCreate(false)
    } catch (err: any) {
      toast(err.message || 'Erro ao criar usuário', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Usuários</h1>
          <p className="text-sm text-gray-500">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setShowCreate(true)}>Novo Usuário</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="input-base pl-10 w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="Nenhum usuário encontrado" description="Tente ajustar a busca" />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-4">
                <Avatar name={u.full_name} size="md" src={u.avatar_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{u.full_name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="size-3" />{u.email}</p>
                  {u.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="size-3" />{u.phone}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <UserStatusBadge status={u.status} />
                  <span className="text-xs text-gray-400 hidden sm:block">{formatDate(u.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => { reset(); setShowCreate(false) }} title="Novo Usuário" size="md">
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <Input label="Nome Completo" error={errors.full_name?.message} {...register('full_name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Senha Inicial" type="password" error={errors.password?.message} {...register('password')} />
          <Select label="Família (opcional)" {...register('family_id')}>
            <option value="">Nenhuma</option>
            {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { reset(); setShowCreate(false) }}>Cancelar</Button>
            <Button type="submit" loading={loading}>Criar Usuário</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
