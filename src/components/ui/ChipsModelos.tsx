import { useStore } from '@/store'
import { cx } from './cx'

/** Lista de modelos compatíveis como chips. `ids` = ids de modelos (ex.: ['t40','t50']). */
export function ChipsModelos({ ids, max, className }: { ids: string[]; max?: number; className?: string }) {
  const modelos = useStore((s) => s.modelos)
  if (!ids.length) return <span className="text-xs text-mata-suave">Universal</span>
  const mostrar = max ? ids.slice(0, max) : ids
  const resto = ids.length - mostrar.length
  return (
    <span className={cx('inline-flex flex-wrap gap-1', className)}>
      {mostrar.map((id) => (
        <span key={id} className="rounded bg-ceu-claro px-1.5 py-0.5 text-xs font-medium text-[#14578F]">
          {modelos.find((m) => m.id === id)?.nome ?? id.toUpperCase()}
        </span>
      ))}
      {resto > 0 && <span className="rounded bg-mata/[0.07] px-1.5 py-0.5 text-xs text-mata-suave">+{resto}</span>}
    </span>
  )
}
