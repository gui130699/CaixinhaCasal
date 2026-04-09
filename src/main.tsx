import React, { useState, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRegisterSW } from 'virtual:pwa-register/react'
import App from './App'
import { ToastProvider } from './components/ui/toast'
import { SplashScreen } from './components/ui/splash-screen'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
  },
})

function Root() {
  const [showSplash, setShowSplash] = useState(true)
  const [updating, setUpdating] = useState(false)

  const hideSplash = useCallback(() => setShowSplash(false), [])

  const { updateServiceWorker } = useRegisterSW({
    onRegistered(registration) {
      // Verifica atualizações sempre que o app ganha foco (volta para tela)
      const checkUpdate = () => {
        if (document.visibilityState === 'visible') {
          registration?.update()
        }
      }
      document.addEventListener('visibilitychange', checkUpdate)
      // Também verifica imediatamente ao montar
      registration?.update()
    },
    onNeedRefresh() {
      // Nova versão disponível — mostra splash de atualização e aplica
      setUpdating(true)
      setShowSplash(true)
      setTimeout(() => {
        updateServiceWorker(true)
      }, 2800)
    },
    onOfflineReady() {
      // App pronto para uso offline — silencioso
    },
  })

  return (
    <>
      {showSplash && (
        <SplashScreen updating={updating} onDone={hideSplash} />
      )}
      <HashRouter>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </QueryClientProvider>
      </HashRouter>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
