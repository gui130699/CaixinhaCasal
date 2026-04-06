import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, PiggyBank, UserPlus } from 'lucide-react'
import { z } from 'zod'
import { authApi } from '@/api/auth.api'
import { profilesApi } from '@/api/profiles.api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const registerSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('')
      const user = await authApi.signUp(data.email, data.password)
      await profilesApi.create(user.uid, {
        id: user.uid,
        full_name: data.full_name,
        email: data.email,
        status: 'active',
      })
      navigate('/family-setup')
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.')
      } else if (e.code === 'auth/weak-password') {
        setError('Senha muito fraca. Use ao menos 6 caracteres.')
      } else {
        setError(e.message ?? 'Erro ao criar conta.')
      }
    }
  }

  return (
    <div className="min-h-dvh flex">
      {/* Left panel - branding (desktop) */}
      <div className="hidden lg:flex lg:flex-1 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNlYzNGgtNnptMC0xMHY2aDZWMjRoLTZ6bTEwIDEwdjZoNlYzNGgtNnptMC0xMHY2aDZWMjRoLTZ6bTEwIDEwdjZoNlYzNGgtNnptMC0xMHY2aDZWMjRoLTZ6bTEwIDEwdjZoNlYzNGgtNnptMC0xMHY2aDZWMjRoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
        <div className="relative text-white max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <PiggyBank className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Caixinha Casal</h1>
              <p className="text-primary-200 text-sm">Suas finanças em família</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Comece agora a organizar as finanças da sua família
          </h2>
          <p className="text-primary-200 text-sm leading-relaxed">
            Crie sua conta, configure sua família e comece a controlar metas, parcelas e rendimentos juntos.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-6 bg-white dark:bg-gray-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary-600 rounded-xl">
              <PiggyBank className="size-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">Caixinha Casal</p>
              <p className="text-xs text-gray-500">Suas finanças em família</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Criar conta</h2>
            <p className="text-sm text-gray-500 mt-1">Preencha os dados para começar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Seu nome"
              placeholder="Ex: João Silva"
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirmar senha"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repita a senha"
                error={errors.confirm_password?.message}
                {...register('confirm_password')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting} leftIcon={<UserPlus className="size-4" />}>
              Criar conta
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
