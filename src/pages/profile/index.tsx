import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { User, Lock, Camera, Users, Copy, Check, RefreshCw, Clock } from 'lucide-react'
import { profilesApi } from '@/api/profiles.api'
import { authApi } from '@/api/auth.api'
import { familiesApi } from '@/api/families.api'
import { useAuthStore } from '@/stores/auth.store'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Senhas não coincidem', path: ['confirm'] })

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { profile, family, familyRole, setProfile, setFamily } = useAuthStore()
  const { toast } = useToast()
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [loadingCode, setLoadingCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expiresInHours, setExpiresInHours] = useState(24)

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' },
  })

  const passwordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  const handleProfileSubmit = async (data: ProfileFormData) => {
    if (!profile) return
    setLoadingProfile(true)
    try {
      const updated = await profilesApi.update(profile.id, data)
      setProfile(updated)
      toast('Perfil atualizado!', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao atualizar perfil', 'error')
    } finally {
      setLoadingProfile(false)
    }
  }

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setLoadingPassword(true)
    try {
      await authApi.updatePassword(data.password)
      toast('Senha alterada com sucesso!', 'success')
      passwordForm.reset()
    } catch (err: any) {
      toast(err.message || 'Erro ao alterar senha', 'error')
    } finally {
      setLoadingPassword(false)
    }
  }

  const handleCopyCode = () => {
    if (!family?.invite_code) return
    navigator.clipboard.writeText(family.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerateCode = async () => {
    if (!family) return
    setLoadingCode(true)
    try {
      const updated = await familiesApi.regenerateInviteCode(family.id, expiresInHours)
      setFamily(updated)
      toast('Código de convite gerado!', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao gerar código', 'error')
    } finally {
      setLoadingCode(false)
    }
  }

  const isCodeExpired = family?.invite_code_expires_at
    ? new Date(family.invite_code_expires_at) < new Date()
    : false

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meu Perfil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie suas informações pessoais</p>
      </div>

      {/* Avatar + info */}
      <Card padding="lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Avatar name={profile?.full_name ?? 'U'} size="xl" src={profile?.avatar_url} />
            <button className="absolute -bottom-1 -right-1 size-7 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-700 transition-colors">
              <Camera className="size-3" />
            </button>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{profile?.full_name}</p>
            <p className="text-sm text-gray-500">{family?.name}</p>
            <p className="text-xs text-primary-600 font-medium capitalize mt-0.5">{familyRole === 'admin' ? 'Administrador' : 'Membro'}</p>
          </div>
        </div>

        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="size-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Informações Pessoais</h3>
          </div>
          <Input label="Nome Completo" error={profileForm.formState.errors.full_name?.message} {...profileForm.register('full_name')} />
          <Input label="Telefone" type="tel" placeholder="+55 11 99999-9999" {...profileForm.register('phone')} />
          <div className="flex justify-end">
            <Button type="submit" loading={loadingProfile}>Salvar Alterações</Button>
          </div>
        </form>
      </Card>

      {/* Password change */}
      <Card padding="lg">
        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="size-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Alterar Senha</h3>
          </div>
          <Input label="Nova Senha" type="password" error={passwordForm.formState.errors.password?.message} {...passwordForm.register('password')} />
          <Input label="Confirmar Nova Senha" type="password" error={passwordForm.formState.errors.confirm?.message} {...passwordForm.register('confirm')} />
          <div className="flex justify-end">
            <Button type="submit" loading={loadingPassword} variant="secondary">Alterar Senha</Button>
          </div>
        </form>
      </Card>

      {/* Código de Convite da Família */}
      {family && familyRole === 'admin' && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Users className="size-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Código de Convite</h3>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Compartilhe este código para convidar seu parceiro(a) a entrar na família <strong>{family.name}</strong>.
          </p>

          {/* Código atual */}
          {family.invite_code ? (
            <div className={`flex items-center gap-3 p-3 rounded-xl border mb-3 ${isCodeExpired ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
              <p className={`font-mono text-xl font-bold tracking-widest flex-1 ${isCodeExpired ? 'text-red-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                {family.invite_code}
              </p>
              {!isCodeExpired && (
                <button type="button" onClick={handleCopyCode} className="text-gray-400 hover:text-primary-600 transition-colors">
                  {copied ? <Check className="size-5 text-green-500" /> : <Copy className="size-5" />}
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 mb-3 text-center">
              <p className="text-sm text-gray-400">Nenhum código gerado</p>
            </div>
          )}

          {/* Status de expiração */}
          {family.invite_code && (
            <div className="flex items-center gap-1.5 mb-4">
              <Clock className="size-3.5 text-gray-400" />
              {isCodeExpired ? (
                <span className="text-xs text-red-500 font-medium">Código expirado</span>
              ) : family.invite_code_expires_at ? (
                <span className="text-xs text-gray-500">Expira em {formatDate(family.invite_code_expires_at, 'dd/MM/yyyy HH:mm')}</span>
              ) : (
                <span className="text-xs text-gray-500">Sem data de expiração</span>
              )}
            </div>
          )}

          {/* Gerar novo código */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Validade do novo código</label>
            <div className="grid grid-cols-4 gap-2">
              {[{ h: 24, label: '24h' }, { h: 48, label: '48h' }, { h: 168, label: '7 dias' }, { h: 720, label: '30 dias' }].map(opt => (
                <button
                  key={opt.h}
                  type="button"
                  onClick={() => setExpiresInHours(opt.h)}
                  className={`py-1.5 text-xs rounded-lg border font-medium transition-colors ${expiresInHours === opt.h ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-400'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              variant="secondary"
              loading={loadingCode}
              leftIcon={<RefreshCw className="size-4" />}
              onClick={handleGenerateCode}
            >
              Gerar novo código
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
