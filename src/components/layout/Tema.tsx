import { Moon, Sun } from 'lucide-react'
import { definirTema, useTema } from '@/lib/tema'
import { IconButton } from '@/components/ui'

/** Único alternador de tema: ícone pequeno no canto da barra superior. */
export function BotaoTema({ className }: { className?: string }) {
  const tema = useTema()
  const escuro = tema === 'escuro'
  const rotulo = escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'
  return (
    <IconButton
      aria-label={rotulo} title={rotulo}
      icone={escuro ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
      onClick={() => definirTema(escuro ? 'claro' : 'escuro')} className={className}
    />
  )
}
