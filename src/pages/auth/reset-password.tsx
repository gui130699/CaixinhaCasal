import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, PiggyBank, CheckCircle2 } from 'lucide-react'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth.api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const [showPass, setShowPass] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setError('')
      await authApi.updatePassword(data.password)
      setDone(true)
      setTimeout(() => navigate('/'), 2500)
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Erro ao redefinir senha.')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary-600 rounded-xl">
            <PiggyBank className="size-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Caixinha Casal</h1>
        </div>

        {done ? (
          <div className="card p-6 text-center">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl w-fit mx-auto mb-4">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Senha redefinida!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecionando...</p>
          </div>
        ) : (
          <div className="card p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nova senha</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Crie uma nova senha segura.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Nova senha"
                type={showPass ? 'text' : 'password'}
                error={errors.password?.message}
                required
                rightIcon={
                  <button type="button" onClick={() => setShowPass(!showPass)} className="p-1">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
                {...register('password')}
              />
              <Input
                label="Confirmar nova senha"
                type={showPass ? 'text' : 'password'}
                error={errors.confirmPassword?.message}
                required
                {...register('confirmPassword')}
              />

              {error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">{error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                Redefinir senha
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-gray-500 hover:text-primary-600">Cancelar</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
