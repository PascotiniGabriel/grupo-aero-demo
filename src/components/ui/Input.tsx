import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from './cx'

export const campoBase =
  'w-full rounded-campo border bg-papel px-3 text-sm text-mata placeholder:text-mata-suave/70 transition-colors focus:border-ceu focus:outline-none focus:ring-2 focus:ring-ceu/25 disabled:bg-nevoa disabled:text-mata-suave'

export interface CampoProps { invalido?: boolean }

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & CampoProps>(function Input(
  { invalido, className, ...rest }, ref,
) {
  return <input ref={ref} aria-invalid={invalido || undefined} className={cx(campoBase, 'h-10', invalido ? 'border-barro' : 'border-linha', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & CampoProps>(function Textarea(
  { invalido, className, rows = 3, ...rest }, ref,
) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalido || undefined} className={cx(campoBase, 'py-2 leading-relaxed resize-y', invalido ? 'border-barro' : 'border-linha', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & CampoProps>(function Select(
  { invalido, className, children, ...rest }, ref,
) {
  return <select ref={ref} aria-invalid={invalido || undefined} className={cx(campoBase, 'h-10 pr-8', invalido ? 'border-barro' : 'border-linha', className)} {...rest}>{children}</select>
})
