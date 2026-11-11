import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function EstadoVazio({ icone, titulo, texto, acao }: { icone?: ReactNode; titulo?: string; texto?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="text-mata-suave/70" aria-hidden>{icone ?? <Inbox size={32} />}</div>
      {titulo && <p className="font-medium">{titulo}</p>}
      {texto && <p className="max-w-sm text-sm text-mata-suave">{texto}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}
