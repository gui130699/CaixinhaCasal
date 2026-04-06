import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, PiggyBank } from 'lucide-react'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth.api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError('')
      await authApi.sendPasswordReset(data.email)
      setSent(true)
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Erro ao enviar e-mail.')
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

        {sent ? (
          <div className="card p-6 text-center">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl w-fit mx-auto mb-4">
              <Mail className="size-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">E-mail enviado!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                <ArrowLeft className="size-4" /> Voltar ao login
              </Button>
            </Link>
          </div>
        ) : (
          <div className="card p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recuperar senha</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Informe seu e-mail e enviaremos um link para redefinição.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                error={errors.email?.message}
                required
                {...register('email')}
              />

              {error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">{error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                Enviar link de recuperação
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-1">
                <ArrowLeft className="size-3.5" /> Voltar ao login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
