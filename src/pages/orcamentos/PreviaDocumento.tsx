import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Printer, X } from 'lucide-react'
import { Button, cx } from '@/components/ui'
import { useFecharComEsc } from '@/components/ui/Modal'
import { EscalaFolha } from './propostaDrone'

const LARGURA_A4 = 186 * 3.7795 + 2
const btn = 'inline-flex h-10 w-10 items-center justify-center rounded-campo border border-linha bg-papel hover:bg-nevoa disabled:opacity-40'

/** Prévia escalada do documento com troca de página (só para o tipo drone, que tem 2 páginas) e botão para ampliar. */
export function PreviaDocumento({ duasPaginas, renderizar, larguraFolha, className, imprimir }: {
  duasPaginas: boolean
  renderizar: (pagina: 1 | 2 | undefined) => ReactNode
  larguraFolha?: number
  className?: string
  /** Mostra "Imprimir / salvar PDF" na visão ampliada (só onde existe documento de impressão na página). */
  imprimir?: boolean
}) {
  const [pag, setPag] = useState<1 | 2>(1)
  const [ampliado, setAmpliado] = useState(false)
  return (
    <div className={cx('min-w-0', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        {duasPaginas ? <SeletorPagina pag={pag} setPag={setPag} /> : <span />}
        <button type="button" className={cx(btn, 'w-auto gap-1.5 px-3 text-sm')} onClick={() => setAmpliado(true)}>
          <Maximize2 size={16} /> Ampliar
        </button>
      </div>
      <div className="overflow-hidden rounded-campo border border-linha bg-nevoa p-1">
        <EscalaFolha largura={larguraFolha}>{renderizar(duasPaginas ? pag : undefined)}</EscalaFolha>
      </div>
      {ampliado && (
        <Ampliada
          aoFechar={() => setAmpliado(false)} duasPaginas={duasPaginas} pag={pag} setPag={setPag}
          largura={larguraFolha ?? LARGURA_A4} imprimir={imprimir}
        >
          {renderizar(duasPaginas ? pag : undefined)}
        </Ampliada>
      )}
    </div>
  )
}

function SeletorPagina({ pag, setPag }: { pag: 1 | 2; setPag: (p: 1 | 2) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} aria-label="Página anterior" disabled={pag === 1} onClick={() => setPag(1)}><ChevronLeft size={18} /></button>
      <span className="num min-w-24 text-center text-sm text-mata-suave">Página {pag} de 2</span>
      <button type="button" className={btn} aria-label="Próxima página" disabled={pag === 2} onClick={() => setPag(2)}><ChevronRight size={18} /></button>
    </div>
  )
}

function Ampliada({ aoFechar, duasPaginas, pag, setPag, largura, imprimir, children }: {
  aoFechar: () => void; duasPaginas: boolean; pag: 1 | 2; setPag: (p: 1 | 2) => void
  largura: number; imprimir?: boolean; children: ReactNode
}) {
  const area = useRef<HTMLDivElement>(null)
  const [disp, setDisp] = useState(0)
  const [manual, setManual] = useState<number | null>(null)
  useFecharComEsc(true, aoFechar)
  useEffect(() => {
    const el = area.current
    if (!el) return
    const medir = () => setDisp(el.clientWidth)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const ajuste = disp > 0 ? Math.min(1, (disp - 16) / largura) : 1
  const z = manual ?? ajuste
  const passo = (d: number) => setManual(Math.min(2, Math.max(0.25, Math.round((z + d) * 100) / 100)))
  return createPortal(
    <div className="nao-imprimir fixed inset-0 z-50 flex items-center justify-center sm:p-3" role="presentation">
      <div className="absolute inset-0 bg-barra/60" onClick={aoFechar} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Prévia ampliada" className="anim-entrar relative flex h-dvh w-full flex-col bg-papel shadow-2xl sm:h-[96dvh] sm:max-w-[1100px] sm:rounded-painel">
        <header className="flex flex-wrap items-center gap-2 border-b border-linha px-3 py-2">
          {duasPaginas && <SeletorPagina pag={pag} setPag={setPag} />}
          <div className="flex items-center gap-1">
            <button type="button" className={btn} aria-label="Diminuir zoom" onClick={() => passo(-0.1)}><Minus size={16} /></button>
            <button type="button" className={cx(btn, 'num w-16 text-sm')} aria-label="Zoom 100%" onClick={() => setManual(1)}>{Math.round(z * 100)}%</button>
            <button type="button" className={btn} aria-label="Aumentar zoom" onClick={() => passo(0.1)}><Plus size={16} /></button>
            <button type="button" className={cx(btn, 'w-auto px-3 text-sm')} onClick={() => setManual(null)}>Ajustar à tela</button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {imprimir && <Button icone={<Printer size={16} />} onClick={() => window.print()}>Imprimir / salvar PDF</Button>}
            <Button variante="secundario" icone={<X size={16} />} onClick={aoFechar}>Fechar</Button>
          </div>
        </header>
        <div ref={area} className="min-h-0 flex-1 overflow-auto bg-nevoa p-2">
          <div style={{ zoom: z, width: largura }} className="doc-drone mx-auto">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
