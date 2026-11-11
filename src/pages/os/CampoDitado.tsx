import { useRef } from 'react'
import { Mic, Square } from 'lucide-react'
import { Textarea, cx } from '@/components/ui'
import { useDitado } from '@/lib/useDitado'

/** Caixa de texto com ditado por voz opcional (acrescenta ao que já está escrito). */
export function CampoDitado({ valor, aoMudar, placeholder, linhas = 3, rotulo }: {
  valor: string; aoMudar: (v: string) => void; placeholder?: string; linhas?: number; rotulo: string
}) {
  const base = useRef('')
  const { suportado, ouvindo, iniciar, parar } = useDitado((texto) => aoMudar(`${base.current}${base.current && !/\s$/.test(base.current) ? ' ' : ''}${texto}`))
  return (
    <div className="relative">
      <Textarea value={valor} onChange={(e) => aoMudar(e.target.value)} rows={linhas} placeholder={placeholder} aria-label={rotulo} className={cx(suportado && 'pr-12')} />
      {suportado && (
        <button
          type="button" aria-label={ouvindo ? 'Parar ditado' : 'Ditar'} title={ouvindo ? 'Parar ditado' : 'Ditar'}
          onClick={() => { if (ouvindo) parar(); else { base.current = valor; iniciar() } }}
          className={cx('absolute right-1.5 top-1.5 inline-flex h-10 w-10 items-center justify-center rounded-campo transition-colors',
            ouvindo ? 'bg-barro text-white' : 'text-mata-suave hover:bg-mata/5 hover:text-mata')}
        >
          {ouvindo ? <Square size={16} /> : <Mic size={18} />}
        </button>
      )}
    </div>
  )
}
