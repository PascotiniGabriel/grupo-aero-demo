import { agruparChecklist, progressoChecklist } from '@/lib/checklist'
import { cx } from '@/components/ui'
import type { ItemChecklist } from '@/types'

/** Barra "3 de 8". */
export function BarraProgresso({ lista, compacta }: { lista?: ItemChecklist[]; compacta?: boolean }) {
  const { feitos, total } = progressoChecklist(lista)
  if (total === 0) return null
  const pct = Math.round((feitos / total) * 100)
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${feitos} de ${total} itens do checklist feitos`}>
      <div className={cx('flex-1 overflow-hidden rounded-full bg-linha', compacta ? 'h-1.5' : 'h-2')}>
        <div className={cx('h-full rounded-full', feitos === total ? 'bg-lavoura' : 'bg-ceu')} style={{ width: `${pct}%` }} />
      </div>
      <span className="num shrink-0 text-xs text-mata-suave">{feitos} de {total}</span>
    </div>
  )
}

/** Checklist agrupado por origem (serviço ou tipo de atendimento), com itens marcáveis. */
export function ChecklistGrupos({ lista, aoMarcar }: { lista: ItemChecklist[]; aoMarcar: (idx: number) => void }) {
  const grupos = agruparChecklist(lista)
  const agrupar = grupos.length > 1 || (grupos[0] && grupos[0].origem !== 'Avulsos')
  return (
    <div className="space-y-2">
      {grupos.map((g) => (
        <div key={g.origem}>
          {agrupar && <p className="mt-1 text-xs font-medium text-mata-suave">{g.origem}</p>}
          <ul>
            {g.itens.map(({ item, idx }) => (
              <li key={idx}>
                <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" className="h-5 w-5 shrink-0 accent-lavoura" checked={item.feito} onChange={() => aoMarcar(idx)} />
                  <span className={cx(item.feito && 'text-mata-suave line-through')}>{item.texto}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
