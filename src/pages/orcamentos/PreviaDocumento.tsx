import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cx } from '@/components/ui'
import { EscalaFolha } from './propostaDrone'

/** Prévia escalada do documento com troca de página (só para o tipo drone, que tem 2 páginas). */
export function PreviaDocumento({ duasPaginas, renderizar, larguraFolha, className }: {
  duasPaginas: boolean
  renderizar: (pagina: 1 | 2 | undefined) => ReactNode
  larguraFolha?: number
  className?: string
}) {
  const [pag, setPag] = useState<1 | 2>(1)
  const btn = 'inline-flex h-10 w-10 items-center justify-center rounded-campo border border-linha bg-papel hover:bg-nevoa disabled:opacity-40'
  return (
    <div className={cx('min-w-0', className)}>
      {duasPaginas && (
        <div className="mb-2 flex items-center justify-center gap-2">
          <button type="button" className={btn} aria-label="Página anterior" disabled={pag === 1} onClick={() => setPag(1)}><ChevronLeft size={18} /></button>
          <span className="num min-w-24 text-center text-sm text-mata-suave">Página {pag} de 2</span>
          <button type="button" className={btn} aria-label="Próxima página" disabled={pag === 2} onClick={() => setPag(2)}><ChevronRight size={18} /></button>
        </div>
      )}
      <div className="overflow-hidden rounded-campo border border-linha bg-nevoa p-1">
        <EscalaFolha largura={larguraFolha}>{renderizar(duasPaginas ? pag : undefined)}</EscalaFolha>
      </div>
    </div>
  )
}
