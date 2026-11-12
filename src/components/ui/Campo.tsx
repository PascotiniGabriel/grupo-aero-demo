import { useId, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'

export interface CampoRotuloProps {
  rotulo: string
  erro?: string
  ajuda?: string
  obrigatorio?: boolean
  className?: string
  children: ReactNode
}
/** Rótulo + controle + erro/ajuda. O filho (Input/Select/Textarea) recebe id automaticamente. */
export function Campo({ rotulo, erro, ajuda, obrigatorio, className, children }: CampoRotuloProps) {
  const id = useId()
  const filho = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, invalido: !!erro, 'aria-describedby': erro || ajuda ? `${id}-msg` : undefined })
    : children
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-mata">
        {rotulo}{obrigatorio && <span className="text-barro-texto" aria-hidden> *</span>}
      </label>
      {filho}
      {(erro || ajuda) && (
        <p id={`${id}-msg`} className={cx('text-xs', erro ? 'text-barro-texto' : 'text-mata-suave')}>{erro || ajuda}</p>
      )}
    </div>
  )
}
