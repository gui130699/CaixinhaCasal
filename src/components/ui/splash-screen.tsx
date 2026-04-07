import { useEffect, useState } from 'react'

interface SplashScreenProps {
  updating?: boolean
  onDone?: () => void
}

export function SplashScreen({ updating = false, onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter')

  useEffect(() => {
    // Fase de entrada
    const t1 = setTimeout(() => setPhase('visible'), 50)
    // Fase de saída — mínimo 1.8s visível, mais se estiver atualizando
    const delay = updating ? 3000 : 1800
    const t2 = setTimeout(() => setPhase('exit'), delay)
    // Remove do DOM após animação de saída
    const t3 = setTimeout(() => onDone?.(), delay + 500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [updating, onDone])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
        transition: 'opacity 0.5s ease',
        opacity: phase === 'exit' ? 0 : 1,
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      {/* Ícone com pulso */}
      <div
        style={{
          transform: phase === 'enter' ? 'scale(0.6)' : 'scale(1)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <img
          src="/CaixinhaCasal/icons/pwa-192x192.png"
          alt="Caixinha Casal"
          style={{ width: 96, height: 96, borderRadius: 24 }}
        />
      </div>

      {/* Nome do app */}
      <div
        style={{
          marginTop: 24,
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(12px)' : 'translateY(0)',
          transition: 'opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'white', fontSize: 22, fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.5px' }}>
          Caixinha Casal
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
          {updating ? 'Aplicando atualização...' : 'Carregando...'}
        </p>
      </div>

      {/* Barra de progresso animada */}
      <div
        style={{
          marginTop: 32,
          width: 140,
          height: 3,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 99,
          overflow: 'hidden',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 0.4s ease 0.3s',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'white',
            borderRadius: 99,
            animation: 'splashProgress 1.6s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes splashProgress {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 70%;  margin-left: 15%; }
          100% { width: 0%;   margin-left: 140%; }
        }
      `}</style>
    </div>
  )
}
