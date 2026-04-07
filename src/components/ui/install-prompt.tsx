import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

declare global {
  interface Window {
    __pwaInstallPrompt: any
  }
}

export function InstallPrompt() {
  const [canInstall, setCanInstall] = useState(() => !!window.__pwaInstallPrompt)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa-install-dismissed') === 'true'
  })
  const [installed, setInstalled] = useState(() => {
    return window.matchMedia('(display-mode: standalone)').matches
  })

  useEffect(() => {
    const onAvailable = () => setCanInstall(true)
    const onInstalled = () => { setInstalled(true); setCanInstall(false) }

    window.addEventListener('pwa-install-available', onAvailable)
    window.addEventListener('pwa-installed', onInstalled)

    return () => {
      window.removeEventListener('pwa-install-available', onAvailable)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  const handleInstall = async () => {
    const prompt = window.__pwaInstallPrompt
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    window.__pwaInstallPrompt = null
    setCanInstall(false)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (installed || dismissed || !canInstall) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 flex items-center gap-3">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl shrink-0">
          <Smartphone className="size-5 text-primary-600 dark:text-primary-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Instalar como app</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Acesse mais rápido pela tela inicial</p>
        </div>

        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
        >
          <Download className="size-3.5" />
          Instalar
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors shrink-0"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
