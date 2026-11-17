import type { ReactNode } from 'react'
import { cx } from '@/components/ui'
import { Marca } from '@/components/layout/Marca'

/** Barra de uso do plano ("8 de 30 perguntas este mês"). */
export function BarraUso({ rotulo, usado, limite, compacta }: { rotulo: string; usado: number; limite: number; compacta?: boolean }) {
  const pct = limite > 0 ? Math.min(100, Math.round((usado / limite) * 100)) : 100
  const cor = usado >= limite ? 'bg-barro' : pct >= 85 ? 'bg-ambar' : 'bg-lavoura'
  return (
    <div>
      <p className={cx('tabular-nums', compacta ? 'text-xs text-mata-suave' : 'text-sm')}>
        <strong className={compacta ? 'text-mata' : undefined}>{usado} de {limite}</strong> {rotulo}
      </p>
      <div className={cx('mt-1 overflow-hidden rounded-full bg-linha', compacta ? 'h-1.5' : 'h-2.5')} role="progressbar" aria-valuenow={usado} aria-valuemin={0} aria-valuemax={limite} aria-label={rotulo}>
        <div className={cx('h-full rounded-full', cor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Moldura das telas do cliente (celular, coluna única). */
export function TelaCliente({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-nevoa px-4 py-6 text-mata">
      <div className="mb-5 flex justify-center"><Marca largura={140} /></div>
      {children}
    </div>
  )
}
