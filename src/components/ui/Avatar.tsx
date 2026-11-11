import { cx } from './cx'

export function Avatar({ nome, tamanho = 32, className }: { nome: string; tamanho?: number; className?: string }) {
  const partes = nome.trim().split(/\s+/)
  const ini = ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
  return (
    <span aria-hidden className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-lavoura-claro font-semibold text-lavoura-escuro', className)}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}>{ini}</span>
  )
}
