import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from './cx'
import { IconButton } from './IconButton'

export function useFecharComEsc(aberto: boolean, aoFechar: () => void) {
  useEffect(() => {
    if (!aberto) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [aberto, aoFechar])
}

export interface ModalProps {
  aberto: boolean
  aoFechar: () => void
  titulo: ReactNode
  children: ReactNode
  rodape?: ReactNode
  largura?: 'sm' | 'md' | 'lg' | 'xl'
}
const LARG = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

export function Modal({ aberto, aoFechar, titulo, children, rodape, largura = 'md' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  useFecharComEsc(aberto, aoFechar)
  useEffect(() => { if (aberto) ref.current?.focus() }, [aberto])
  if (!aberto) return null
  return createPortal(
    <div className="nao-imprimir fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-barra/50" onClick={aoFechar} aria-hidden />
      <div
        ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined}
        className={cx('anim-entrar relative flex max-h-[92dvh] w-full flex-col rounded-t-painel bg-papel shadow-2xl outline-none sm:rounded-painel', LARG[largura])}
      >
        <header className="flex items-center justify-between gap-2 border-b border-linha px-4 py-3">
          <h2 className="text-lg">{titulo}</h2>
          <IconButton aria-label="Fechar" icone={<X size={18} />} onClick={aoFechar} />
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
        {rodape && <footer className="flex flex-wrap justify-end gap-2 border-t border-linha px-4 py-3">{rodape}</footer>}
      </div>
    </div>,
    document.body,
  )
}
