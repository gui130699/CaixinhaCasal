import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PiggyBank, Plus, Users, ArrowRight, LogOut } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { familiesApi } from '@/api/families.api'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const createSchema = z.object({ name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres') })
const joinSchema = z.object({ invite_code: z.string().length(6, 'Código deve ter 6 caracteres').toUpperCase() })

type CreateForm = z.infer<typeof createSchema>
type JoinForm = z.infer<typeof joinSchema>

export default function FamilySetupPage() {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user, setFamily, setFamilyRole } = useAuthStore()

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const joinForm = useForm<JoinForm>({ resolver: zodResolver(joinSchema) })

  const handleCreate = async (data: CreateForm) => {
    if (!user) return
    try {
      setError('')
      const family = await familiesApi.create({ name: data.name })
      await familiesApi.addMember(family.id, user.uid, 'admin')
      setFamily(family)
      setFamilyRole('admin')
      navigate('/')
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Erro ao criar família.')
    }
  }

  const handleJoin = async (data: JoinForm) => {
    if (!user) return
    try {
      setError('')
      const family = await familiesApi.findByInviteCode(data.invite_code.toUpperCase())
      if (!family) {
        setError('Código inválido. Verifique e tente novamente.')
        return
      }
      await familiesApi.addMember(family.id, user.uid, 'member')
      setFamily(family)
      setFamilyRole('member')
      navigate('/')
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Erro ao entrar na família.')
    }
  }

  const handleLogout = async () => {
    await authApi.signOut()
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary-600 rounded-2xl mb-4">
            <PiggyBank className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurar família</h1>
          <p className="text-sm text-gray-500 mt-1">
            Crie uma família nova ou entre em uma existente
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => { setTab('create'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                tab === 'create'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Plus className="size-4" />
              Criar família
            </button>
            <button
              onClick={() => { setTab('join'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                tab === 'join'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users className="size-4" />
              Entrar em família
            </button>
          </div>

          <div className="p-6">
            {tab === 'create' ? (
              <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-4">
                    Crie uma família e convide seu parceiro(a) com o código gerado.
                  </p>
                  <Input
                    label="Nome da família"
                    placeholder="Ex: Família Silva"
                    error={createForm.formState.errors.name?.message}
                    {...createForm.register('name')}
                  />
                </div>
                {error && tab === 'create' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  loading={createForm.formState.isSubmitting}
                  rightIcon={<ArrowRight className="size-4" />}
                >
                  Criar e entrar
                </Button>
              </form>
            ) : (
              <form onSubmit={joinForm.handleSubmit(handleJoin)} className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-4">
                    Peça o código de convite de 6 letras para quem criou a família.
                  </p>
                  <Input
                    label="Código de convite"
                    placeholder="Ex: ABC123"
                    maxLength={6}
                    className="uppercase tracking-widest text-center font-mono text-lg"
                    error={joinForm.formState.errors.invite_code?.message}
                    {...joinForm.register('invite_code', {
                      onChange: e => { e.target.value = e.target.value.toUpperCase() }
                    })}
                  />
                </div>
                {error && tab === 'join' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  loading={joinForm.formState.isSubmitting}
                  rightIcon={<ArrowRight className="size-4" />}
                >
                  Entrar na família
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <LogOut className="size-3.5" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}
