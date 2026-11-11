import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cx } from './cx'

export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'ia'
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao
  tamanho?: 'sm' | 'md' | 'lg'
  icone?: ReactNode
  loading?: boolean
  bloco?: boolean
}

const VAR: Record<VarianteBotao, string> = {
  primario: 'bg-lavoura text-white hover:bg-lavoura-escuro border border-transparent',
  secundario: 'bg-papel text-mata border border-linha hover:bg-nevoa',
  fantasma: 'bg-transparent text-mata border border-transparent hover:bg-mata/5',
  perigo: 'bg-barro text-white border border-transparent hover:bg-barro/90',
  ia: 'ia-gradiente border border-transparent hover:brightness-110',
}
const TAM = { sm: 'h-10 md:h-9 px-3 text-sm gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-5 text-base gap-2' }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = 'primario', tamanho = 'md', icone, loading, bloco, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button
      ref={ref} type={type} disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-campo font-medium whitespace-nowrap transition-colors select-none disabled:opacity-50',
        VAR[variante], TAM[tamanho], bloco && 'w-full', className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : icone}
      {children}
    </button>
  )
})
