import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from './cx'
import { IconButton } from './IconButton'
import { useFecharComEsc } from './Modal'

export interface GavetaProps {
  aberta: boolean
  aoFechar: () => void
  titulo: ReactNode
  children: ReactNode
  rodape?: ReactNode
  largura?: 'md' | 'lg' | 'xl'
}
const LARG = { md: 'sm:max-w-md', lg: 'sm:max-w-xl', xl: 'sm:max-w-3xl' }

/** Drawer lateral direito; tela cheia no mobile. */
export function Gaveta({ aberta, aoFechar, titulo, children, rodape, largura = 'lg' }: GavetaProps) {
  const ref = useRef<HTMLDivElement>(null)
  useFecharComEsc(aberta, aoFechar)
  useEffect(() => { if (aberta) ref.current?.focus() }, [aberta])
  if (!aberta) return null
  return createPortal(
    <div className="nao-imprimir fixed inset-0 z-50 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-barra/50" onClick={aoFechar} aria-hidden />
      <aside
        ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined}
        className={cx('anim-deslizar relative flex h-full w-full flex-col bg-papel shadow-2xl outline-none', LARG[largura])}
      >
        <header className="flex items-center justify-between gap-2 border-b border-linha px-4 py-3">
          <h2 className="text-lg">{titulo}</h2>
          <IconButton aria-label="Fechar" icone={<X size={18} />} onClick={aoFechar} />
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {rodape && <footer className="flex flex-wrap justify-end gap-2 border-t border-linha px-4 py-3">{rodape}</footer>}
      </aside>
    </div>,
    document.body,
  )
}
