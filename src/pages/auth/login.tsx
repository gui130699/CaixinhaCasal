import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, PiggyBank, LogIn } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/lib/validators'
import { authApi } from '@/api/auth.api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('')
      await authApi.signIn(data.email, data.password)
      // Redirect is handled by AuthProvider
    } catch (err: unknown) {
      const e = err as { message?: string }
      if (e.message?.includes('Invalid login')) {
        setError('E-mail ou senha incorretos.')
      } else if (e.message?.includes('Email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar.')
      } else {
        setError(e.message ?? 'Erro ao fazer login.')
      }
    }
  }

  return (
    <div className="min-h-dvh flex">
      {/* Left panel - branding (desktop) */}
      <div className="hidden lg:flex lg:flex-1 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNlYzNGgtNnptMC0xMHY2aDZWMjRoLTZ6bTEwIDEwdjZoNlYzNGgtNnptMC0xMHY2aDZWMjRoLTZ6bTEwIDEwdjZoNlYzNGgtNnptMC0xMHY2aDZWMjRoLTZ6bTEwIDEwdjZoNlYzNGgtNnptMC0xMHY2aDZWMjRoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
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
            Organize as finanças da sua família com clareza e confiança
          </h2>
          <p className="text-primary-200 text-sm leading-relaxed">
            Controle metas financeiras, parcelas, rendimentos e contas bancárias num único lugar. 
            Simples, seguro e feito para famílias.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { v: 'Metas', d: 'financeiras' },
              { v: 'Parcelas', d: 'automáticas' },
              { v: 'Juros', d: 'e rendimentos' },
            ].map(({ v, d }) => (
              <div key={v} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="font-semibold text-sm">{v}</p>
                <p className="text-primary-200 text-xs">{d}</p>
              </div>
            ))}
          </div>
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
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Caixinha Casal</h1>
              <p className="text-xs text-gray-500">Suas finanças em família</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="seu@email.com"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              required
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              {...register('password')}
            />

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={isSubmitting}
              leftIcon={<LogIn className="size-4" />}
            >
              Entrar
            </Button>
          </form>

          <div className="mt-5 space-y-2 text-center">
            <Link to="/forgot-password" className="block text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline">
              Esqueceu a senha?
            </Link>
            <p className="text-sm text-gray-500">
              Não tem conta?{' '}
              <Link to="/register" className="text-primary-600 hover:underline font-medium">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
