import { create } from 'zustand'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cx } from './cx'

type TipoToast = 'sucesso' | 'erro' | 'info'
interface ItemToast { id: number; tipo: TipoToast; texto: string }
interface EstadoToast { itens: ItemToast[]; adicionar: (tipo: TipoToast, texto: string) => void; fechar: (id: number) => void }

let contador = 0
const useToastStore = create<EstadoToast>((set) => ({
  itens: [],
  adicionar: (tipo, texto) => {
    const id = ++contador
    set((s) => ({ itens: [...s.itens, { id, tipo, texto }] }))
    setTimeout(() => set((s) => ({ itens: s.itens.filter((t) => t.id !== id) })), tipo === 'erro' ? 6000 : 3500)
  },
  fechar: (id) => set((s) => ({ itens: s.itens.filter((t) => t.id !== id) })),
}))

const toastApi = {
  sucesso: (t: string) => useToastStore.getState().adicionar('sucesso', t),
  erro: (t: string) => useToastStore.getState().adicionar('erro', t),
  info: (t: string) => useToastStore.getState().adicionar('info', t),
}
/** `const toast = useToast(); toast.sucesso('Salvo')` */
export function useToast() { return toastApi }
export { toastApi as toast }

const ICONE = { sucesso: CheckCircle2, erro: AlertCircle, info: Info }
const COR = { sucesso: 'text-lavoura', erro: 'text-barro', info: 'text-ceu' }

/** Montar uma vez no AppShell. */
export function Toasts() {
  const itens = useToastStore((s) => s.itens)
  const fechar = useToastStore((s) => s.fechar)
  return (
    <div className="nao-imprimir pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      {itens.map((t) => {
        const I = ICONE[t.tipo]
        return (
          <div key={t.id} role={t.tipo === 'erro' ? 'alert' : 'status'} className="anim-entrar pointer-events-auto flex max-w-md items-start gap-2 rounded-painel border border-linha bg-papel px-4 py-3 text-sm shadow-lg">
            <I size={18} className={cx('mt-0.5 shrink-0', COR[t.tipo])} aria-hidden />
            <span className="flex-1">{t.texto}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => fechar(t.id)} className="-m-2 flex h-10 w-10 items-center justify-center text-mata-suave"><X size={14} /></button>
          </div>
        )
      })}
    </div>
  )
}
