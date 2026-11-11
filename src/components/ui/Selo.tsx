import type { ReactNode } from 'react'
import { cx } from './cx'

export type CorSelo = 'neutro' | 'verde' | 'azul' | 'ambar' | 'vermelho'
const COR: Record<CorSelo, string> = {
  neutro: 'bg-mata/[0.07] text-mata-suave',
  verde: 'bg-lavoura-claro text-lavoura-escuro',
  azul: 'bg-ceu-claro text-[#14578F]',
  ambar: 'bg-ambar-claro text-[#7A5600]',
  vermelho: 'bg-barro-claro text-[#9A2D20]',
}
export function Selo({ cor = 'neutro', children, className, icone }: { cor?: CorSelo; children: ReactNode; className?: string; icone?: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', COR[cor], className)}>
      {icone}{children}
    </span>
  )
}
