import { Search, X } from 'lucide-react'
import { cx } from './cx'

export function CampoBusca({ valor, aoMudar, placeholder = 'Buscar', className }: {
  valor: string; aoMudar: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <div className={cx('relative', className)}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mata-suave" aria-hidden />
      <input
        type="search" value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-10 w-full rounded-campo border border-linha bg-papel pl-9 pr-9 text-sm focus:border-ceu focus:outline-none focus:ring-2 focus:ring-ceu/25 [&::-webkit-search-cancel-button]:hidden"
      />
      {valor && (
        <button type="button" aria-label="Limpar busca" onClick={() => aoMudar('')} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-mata-suave hover:text-mata">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
