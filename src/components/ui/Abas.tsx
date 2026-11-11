import { cx } from './cx'

export interface AbaDef { id: string; rotulo: string; contagem?: number }

export function Abas({ abas, ativa, aoMudar, className }: { abas: AbaDef[]; ativa: string; aoMudar: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex gap-1 overflow-x-auto border-b border-linha', className)}>
      {abas.map((a) => {
        const sel = a.id === ativa
        return (
          <button
            key={a.id} role="tab" type="button" aria-selected={sel} onClick={() => aoMudar(a.id)}
            className={cx('relative inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors',
              sel ? 'text-mata after:absolute after:inset-x-2 after:bottom-[-1px] after:h-0.5 after:bg-lavoura' : 'text-mata-suave hover:text-mata')}
          >
            {a.rotulo}
            {a.contagem !== undefined && <span className="num rounded-full bg-mata/[0.07] px-1.5 text-xs">{a.contagem}</span>}
          </button>
        )
      })}
    </div>
  )
}
