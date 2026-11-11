import { cx } from '@/components/ui'

/** Símbolo próprio da demo (um "A" em quadrado verde). */
export function SimboloMarca({ tamanho = 30 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#1F8A4C" />
      <path d="M8.5 23 16 8.5 23.5 23" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.6 19.2h6.8" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

export function Marca({ clara, className }: { clara?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <SimboloMarca />
      <span className="flex flex-col leading-none">
        <span className={cx('titulo text-[17px] tracking-tight', clara ? 'text-white' : 'text-mata')} style={{ fontStretch: '118%' }}>Grupo AERO</span>
        <span className={cx('mt-1 text-xs', clara ? 'text-white/55' : 'text-mata-suave')}>Gestão</span>
      </span>
    </span>
  )
}
