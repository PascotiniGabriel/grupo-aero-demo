import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cx } from '@/components/ui'

/**
 * Retorno visual enquanto a IA trabalha: as etapas vão sendo marcadas em sequência.
 * A última etapa fica girando até `ativa` virar false. Não renderiza nada quando inativa.
 */
export function AIPensando({ etapas, ativa, intervaloMs = 650, className }: {
  etapas: string[]; ativa: boolean; intervaloMs?: number; className?: string
}) {
  const [atual, setAtual] = useState(0)

  useEffect(() => {
    if (!ativa) return
    setAtual(0)
    const t = setInterval(() => setAtual((i) => Math.min(i + 1, etapas.length - 1)), intervaloMs)
    return () => clearInterval(t)
  }, [ativa, etapas.length, intervaloMs])

  if (!ativa) return null
  return (
    <ol className={cx('ia-borda anim-entrar flex flex-col gap-2 rounded-painel px-4 py-3 text-sm', className)} role="status" aria-live="polite">
      {etapas.map((e, i) => {
        const feita = i < atual
        const corrente = i === atual
        return (
          <li key={e} className={cx('flex items-center gap-2.5', !feita && !corrente && 'text-mata-suave/60')}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              {feita ? <Check size={16} className="text-lavoura-texto" /> : corrente ? <Loader2 size={16} className="animate-spin text-ceu" /> : <span className="h-1.5 w-1.5 rounded-full bg-linha" />}
            </span>
            <span className={cx(corrente && 'font-medium')}>{e}</span>
          </li>
        )
      })}
    </ol>
  )
}
