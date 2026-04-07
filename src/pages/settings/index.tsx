import { useState } from 'react'
import { Settings, Users, Copy, Check, RefreshCw, Clock, Sun, Moon, Bell, Shield, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { familiesApi } from '@/api/families.api'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

export default function SettingsPage() {
  const { family, familyRole, setFamily } = useAuthStore()
  const { theme, setTheme } = useUIStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [loadingCode, setLoadingCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expiresInHours, setExpiresInHours] = useState(24)

  const isAdmin = familyRole === 'admin'

  const isCodeExpired = family?.invite_code_expires_at
    ? new Date(family.invite_code_expires_at) < new Date()
    : false

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

  const handleLogout = async () => {
    await authApi.signOut()
    navigate('/login')
  }

  const expiryOptions = [
    { h: 24, label: '24h' },
    { h: 48, label: '48h' },
    { h: 168, label: '7 dias' },
    { h: 720, label: '30 dias' },
  ]

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie as preferências do aplicativo</p>
      </div>

      {/* Aparência */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          {theme === 'dark' ? <Moon className="size-4 text-gray-400" /> : <Sun className="size-4 text-gray-400" />}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aparência</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Escolha entre claro ou escuro</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-3 py-2 text-xs rounded-xl border font-medium transition-colors ${theme === 'light' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-400'}`}
            >
              <Sun className="size-3.5" />
              Claro
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-3 py-2 text-xs rounded-xl border font-medium transition-colors ${theme === 'dark' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-400'}`}
            >
              <Moon className="size-3.5" />
              Escuro
            </button>
          </div>
        </div>
      </Card>

      {/* Família */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Família</h3>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome da família</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{family?.name ?? '—'}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isAdmin ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
            {isAdmin ? 'Administrador' : 'Membro'}
          </span>
        </div>
      </Card>

      {/* Código de Convite — apenas admin */}
      {family && isAdmin && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="size-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Código de Convite</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
            Gere um código para convidar seu parceiro(a) a entrar na família <strong>{family.name}</strong>. Apenas o administrador pode gerar ou renovar o código.
          </p>

          {/* Código atual */}
          {family.invite_code ? (
            <div className={`flex items-center gap-3 p-4 rounded-xl border mb-3 ${isCodeExpired ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
              <p className={`font-mono text-2xl font-bold tracking-[0.3em] flex-1 ${isCodeExpired ? 'text-red-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                {family.invite_code}
              </p>
              {!isCodeExpired && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copiar código"
                  className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {copied ? <Check className="size-5 text-green-500" /> : <Copy className="size-5" />}
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 mb-3 text-center">
              <p className="text-sm text-gray-400">Nenhum código gerado ainda</p>
            </div>
          )}

          {/* Status de expiração */}
          {family.invite_code && (
            <div className="flex items-center gap-1.5 mb-5">
              <Clock className="size-3.5 text-gray-400 shrink-0" />
              {isCodeExpired ? (
                <span className="text-xs text-red-500 font-medium">Código expirado — gere um novo abaixo</span>
              ) : family.invite_code_expires_at ? (
                <span className="text-xs text-gray-500">Expira em {formatDate(family.invite_code_expires_at, 'dd/MM/yyyy HH:mm')}</span>
              ) : (
                <span className="text-xs text-gray-500">Sem data de expiração</span>
              )}
            </div>
          )}

          {/* Gerar novo código */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                Validade do novo código
              </label>
              <div className="grid grid-cols-4 gap-2">
                {expiryOptions.map(opt => (
                  <button
                    key={opt.h}
                    type="button"
                    onClick={() => setExpiresInHours(opt.h)}
                    className={`py-2 text-xs rounded-xl border font-medium transition-colors ${expiresInHours === opt.h ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-400'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              variant="secondary"
              loading={loadingCode}
              leftIcon={<RefreshCw className="size-4" />}
              onClick={handleGenerateCode}
            >
              {family.invite_code ? 'Renovar código' : 'Gerar código de convite'}
            </Button>
          </div>
        </Card>
      )}

      {/* Notificações (placeholder) */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="size-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</h3>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">Em breve: configurações de notificações por e-mail e push.</p>
      </Card>

      {/* Sair */}
      <Card padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sair da conta</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Encerrar sessão no dispositivo atual</p>
          </div>
          <Button
            variant="secondary"
            leftIcon={<LogOut className="size-4" />}
            onClick={handleLogout}
            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 dark:text-red-400"
          >
            Sair
          </Button>
        </div>
      </Card>
    </div>
  )
}
