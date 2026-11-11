import type { ReactNode } from 'react'
import { cx } from './cx'

export function Painel({ titulo, acoes, children, className, semPadding }: {
  titulo?: ReactNode; acoes?: ReactNode; children?: ReactNode; className?: string; semPadding?: boolean
}) {
  return (
    <section className={cx('rounded-painel border border-linha bg-papel', className)}>
      {(titulo || acoes) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-4 py-3">
          <h2 className="text-base">{titulo}</h2>
          {acoes && <div className="flex items-center gap-2">{acoes}</div>}
        </header>
      )}
      <div className={cx(!semPadding && 'p-4')}>{children}</div>
    </section>
  )
}
