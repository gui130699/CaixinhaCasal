import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Share, Plus } from 'lucide-react'

declare global {
  interface Window {
    __pwaInstallPrompt: any
  }
}

/** Detecta iOS (iPhone/iPad) rodando no Safari fora do modo standalone */
function useIsIOS() {
  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true
  return isIOS && !isStandalone
}

export function InstallPrompt() {
  const isIOS = useIsIOS()
  const [canInstall, setCanInstall] = useState(() => !!window.__pwaInstallPrompt)
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem('pwa-install-dismissed-at')
    if (!ts) return false
    // Mostra novamente após 3 dias
    return Date.now() - parseInt(ts) < 1000 * 60 * 60 * 72
  })
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
  const [showIOSGuide, setShowIOSGuide] = useState(false)

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
    if (outcome === 'accepted') setInstalled(true)
    window.__pwaInstallPrompt = null
    setCanInstall(false)
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowIOSGuide(false)
    localStorage.setItem('pwa-install-dismissed-at', String(Date.now()))
  }

  if (installed) return null
  if (dismissed && !showIOSGuide) return null

  // ----- Banner Android / Chrome -----
  if (!isIOS && canInstall && !dismissed) {
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
          <button type="button" onClick={handleDismiss} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg shrink-0" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  // ----- Banner iOS — aparece sempre até instalar ou dispensar -----
  if (isIOS && !dismissed) {
    return (
      <>
        {/* Banner inferior */}
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl shrink-0">
              <Smartphone className="size-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Instalar no iPhone</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Toque para ver como adicionar à tela inicial</p>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
            >
              Ver como
            </button>
            <button type="button" onClick={handleDismiss} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg shrink-0" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal de instruções iOS */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <img src="/CaixinhaCasal/icons/pwa-192x192.png" alt="" className="size-9 rounded-xl" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Caixinha Casal</p>
                    <p className="text-xs text-gray-400">Instalar no iPhone / iPad</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowIOSGuide(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Passo 1 */}
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center shrink-0">1</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Toque no botão Compartilhar</p>
                    <p className="text-xs text-gray-500 mt-0.5">Barra inferior do Safari</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <Share className="size-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Compartilhar</span>
                    </div>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center shrink-0">2</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Role para baixo e toque em</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <Plus className="size-4 text-gray-700 dark:text-gray-300" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Adicionar à Tela de Início</span>
                    </div>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center shrink-0">3</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Confirme tocando em <strong>Adicionar</strong></p>
                    <p className="text-xs text-gray-500 mt-0.5">O app fica na tela inicial como qualquer outro</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="mt-6 w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Lembrar depois
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}

