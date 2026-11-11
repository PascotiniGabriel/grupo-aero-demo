import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cx } from './cx'

export function Indicador({ rotulo, valor, variacao, detalhe, cor, className }: {
  rotulo: string; valor: ReactNode; variacao?: number; detalhe?: ReactNode; cor?: 'verde' | 'vermelho' | 'ambar'; className?: string
}) {
  const sobe = (variacao ?? 0) >= 0
  return (
    <div className={cx('rounded-painel border border-linha bg-papel p-4', className)}>
      <p className="text-sm text-mata-suave">{rotulo}</p>
      <p className={cx('titulo num mt-1 text-2xl', cor === 'vermelho' && 'text-barro', cor === 'verde' && 'text-lavoura-escuro', cor === 'ambar' && 'text-[#7A5600]')}>{valor}</p>
      {(variacao !== undefined || detalhe) && (
        <p className="mt-1 flex items-center gap-1 text-xs text-mata-suave">
          {variacao !== undefined && (
            <span className={cx('inline-flex items-center font-medium', sobe ? 'text-lavoura-escuro' : 'text-barro')}>
              {sobe ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />}
              {Math.abs(variacao).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
            </span>
          )}
          {detalhe}
        </p>
      )}
    </div>
  )
}
