import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { aguardarHidratacao } from '@/store'
import { pedirArmazenamentoPersistente } from '@/store/armazenamento'
import { iniciarSync, useSync } from '@/lib/sync'

function aguardarSync(): Promise<void> {
  if (useSync.persist.hasHydrated()) return Promise.resolve()
  return new Promise((ok) => { useSync.persist.onFinishHydration(() => ok()) })
}

/** Só mostra o app depois de ler do aparelho o que estava salvo. */
function Raiz() {
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    let vivo = true
    // Se a leitura do aparelho falhar ou demorar, o zustand não avisa o fim da hidratação:
    // depois de 3 s o app abre mesmo assim com os dados iniciais da demonstração.
    const limite = new Promise<void>((ok) => setTimeout(ok, 3000))
    void Promise.race([Promise.all([aguardarHidratacao(), aguardarSync()]), limite]).then(() => {
      if (!vivo) return
      iniciarSync()
      void pedirArmazenamentoPersistente()
      setPronto(true)
    })
    return () => { vivo = false }
  }, [])
  if (!pronto) {
    return <div role="status" className="flex min-h-dvh items-center justify-center text-sm text-mata-suave">Carregando os dados do aparelho…</div>
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Raiz />
  </StrictMode>,
)
