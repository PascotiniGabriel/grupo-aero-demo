import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { toast } from '@/components/ui/Toasts'
import { idbStorage } from '@/store/armazenamento'

export interface ItemFila {
  id: string
  quando: string
  acao: 'salvar' | 'remover' | 'estoque' | 'empresa'
  colecao: string
  itemId: string
  resumo: string
}
export interface ItemEnviado extends ItemFila { enviadoEm: string }

interface EstadoSync {
  fila: ItemFila[]
  enviados: ItemEnviado[]
  /** Interruptor de demonstração. */
  simularOffline: boolean
  /** Estado real do navegador (não persistido). */
  navegadorOnline: boolean
  sincronizando: boolean
  progresso: number
  registrar: (i: Omit<ItemFila, 'id' | 'quando'>) => void
  definirSimulado: (v: boolean) => void
  sincronizarAgora: () => Promise<void>
}

const MAX_ENVIADOS = 30
const MAX_FILA = 500

export const useSync = create<EstadoSync>()(
  persist(
    (set, get) => ({
      fila: [],
      enviados: [],
      simularOffline: false,
      navegadorOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
      sincronizando: false,
      progresso: 0,

      registrar: (i) => {
        const item: ItemFila = { ...i, id: `sy-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, quando: new Date().toISOString() }
        set((s) => ({ fila: [...s.fila, item].slice(-MAX_FILA) }))
        if (estaOnline()) agendar()
      },

      definirSimulado: (v) => {
        set({ simularOffline: v })
        if (!v && estaOnline() && get().fila.length > 0) void get().sincronizarAgora()
      },

      sincronizarAgora: async () => {
        const s = get()
        if (s.sincronizando || s.fila.length === 0 || !estaOnline()) return
        const lote = s.fila.slice()
        set({ sincronizando: true, progresso: 0 })
        const passo = Math.max(60, Math.min(300, 1500 / lote.length))
        let enviados = 0
        for (const item of lote) {
          await new Promise((r) => setTimeout(r, passo))
          if (!estaOnline()) break
          enviados++
          set((st) => ({
            fila: st.fila.filter((x) => x.id !== item.id),
            enviados: [{ ...item, enviadoEm: new Date().toISOString() }, ...st.enviados].slice(0, MAX_ENVIADOS),
            progresso: enviados / lote.length,
          }))
        }
        set({ sincronizando: false, progresso: 0 })
        if (enviados > 0) {
          toast.sucesso(`${enviados} ${enviados === 1 ? 'alteração sincronizada' : 'alterações sincronizadas'}`)
        }
      },
    }),
    {
      name: 'aero-sync-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ fila: s.fila, enviados: s.enviados, simularOffline: s.simularOffline }) as unknown as EstadoSync,
    },
  ),
)

export function estaOnline(): boolean {
  const s = useSync.getState()
  return s.navegadorOnline && !s.simularOffline
}

/** Hook: true quando há conexão (e a simulação está desligada). */
export function useOnline(): boolean {
  return useSync((s) => s.navegadorOnline && !s.simularOffline)
}

let timer: ReturnType<typeof setTimeout> | undefined
/** Com internet, junta alterações próximas e envia em seguida. */
function agendar() {
  clearTimeout(timer)
  timer = setTimeout(() => { void useSync.getState().sincronizarAgora() }, 1200)
}

let iniciado = false
/** Liga os eventos online/offline e tenta enviar o que ficou pendente. Chamar uma vez, depois da hidratação. */
export function iniciarSync() {
  if (iniciado || typeof window === 'undefined') return
  iniciado = true
  window.addEventListener('online', () => {
    useSync.setState({ navegadorOnline: true })
    if (useSync.getState().fila.length > 0) agendar()
  })
  window.addEventListener('offline', () => useSync.setState({ navegadorOnline: false }))
  useSync.setState({ navegadorOnline: navigator.onLine })
  if (estaOnline() && useSync.getState().fila.length > 0) agendar()
}

// Ao ligar/desligar a simulação ou voltar a conexão, retoma o envio.
useSync.subscribe((s, ant) => {
  const voltou = (s.navegadorOnline && !s.simularOffline) && !(ant.navegadorOnline && !ant.simularOffline)
  if (voltou && s.fila.length > 0) agendar()
})
