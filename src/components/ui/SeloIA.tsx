import { Sparkles } from 'lucide-react'
import { cx } from './cx'

/** Selo "IA" com a assinatura em degradê (uso exclusivo de recursos de IA). */
export function SeloIA({ children = 'IA', className }: { children?: string; className?: string }) {
  return (
    <span className={cx('ia-gradiente inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', className)}>
      <Sparkles size={12} aria-hidden />{children}
    </span>
  )
}
