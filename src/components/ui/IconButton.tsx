import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  icone: ReactNode
  destaque?: boolean
}
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icone, destaque, className, type = 'button', ...rest }, ref,
) {
  return (
    <button
      ref={ref} type={type} title={rest['aria-label']}
      className={cx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-campo transition-colors disabled:opacity-50',
        destaque ? 'bg-lavoura text-white hover:bg-lavoura-escuro' : 'text-mata-suave hover:bg-mata/5 hover:text-mata', className)}
      {...rest}
    >{icone}</button>
  )
})
