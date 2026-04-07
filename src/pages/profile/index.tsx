import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Lock, Camera } from 'lucide-react'
import { profilesApi } from '@/api/profiles.api'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'

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
  const { profile, family, familyRole, setProfile } = useAuthStore()
  const { toast } = useToast()
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

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

    </div>
  )
}
