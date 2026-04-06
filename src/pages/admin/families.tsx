import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Home, Users, Copy, Check } from 'lucide-react'
import { familiesApi } from '@/api/families.api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const familySchema = z.object({ name: z.string().min(2) })
type FamilyForm = z.infer<typeof familySchema>

export default function AdminFamiliesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const { data: families = [], isLoading } = useQuery({ queryKey: ['admin-families'], queryFn: () => familiesApi.list() })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FamilyForm>({ resolver: zodResolver(familySchema) })

  const handleCreate = async (data: FamilyForm) => {
    setLoading(true)
    try {
      await familiesApi.create(data)
      queryClient.invalidateQueries({ queryKey: ['admin-families'] })
      toast({ type: 'success', message: 'Família criada!' })
      reset(); setShowCreate(false)
    } catch (err: any) {
      toast({ type: 'error', message: err.message || 'Erro ao criar família' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await familiesApi.delete(deletingId)
      queryClient.invalidateQueries({ queryKey: ['admin-families'] })
      toast({ type: 'success', message: 'Família removida' })
    } catch {
      toast({ type: 'error', message: 'Erro ao remover família' })
    } finally {
      setDeletingId(null)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Famílias</h1>
          <p className="text-sm text-gray-500">{families.length} família(s) cadastrada(s)</p>
        </div>
        <Button icon={<Plus className="size-4" />} onClick={() => setShowCreate(true)}>Nova Família</Button>
      </div>

      {families.length === 0 ? (
        <EmptyState icon={<Home className="size-8" />} title="Nenhuma família" description="Crie a primeira família do sistema" actionLabel="Nova Família" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {families.map(f => (
            <Card key={f.id} padding="md" className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="size-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Home className="size-4 text-primary-600" />
                </div>
                <button onClick={() => setDeletingId(f.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remover</button>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{f.name}</p>
              <p className="text-xs text-gray-400 mb-3">Criada em {formatDate(f.created_at)}</p>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-mono text-gray-600 dark:text-gray-300 flex-1">{f.invite_code}</p>
                <button onClick={() => copyCode(f.invite_code)} className="text-gray-400 hover:text-primary-600">
                  {copiedCode === f.invite_code ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => { reset(); setShowCreate(false) }} title="Nova Família" size="sm">
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <Input label="Nome da Família" placeholder="Ex: Família Silva" error={errors.name?.message} {...register('name')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { reset(); setShowCreate(false) }}>Cancelar</Button>
            <Button type="submit" loading={loading}>Criar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete} title="Remover família" description="Todos os dados da família serão apagados permanentemente." confirmLabel="Remover" variant="danger" />
    </div>
  )
}
