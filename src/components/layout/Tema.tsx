import { Monitor, Moon, Sun } from 'lucide-react'
import { PROXIMO_TEMA, ROTULO_TEMA, definirTema, useTema, type PreferenciaTema } from '@/lib/tema'
import { IconButton, cx } from '@/components/ui'

const ICONE = { claro: Sun, escuro: Moon, auto: Monitor }
const OPCOES: PreferenciaTema[] = ['claro', 'escuro', 'auto']

/** Botão da barra superior: cada toque passa para o próximo tema (Claro, Escuro, Automático). */
export function BotaoTema({ className }: { className?: string }) {
  const tema = useTema()
  const I = ICONE[tema]
  return (
    <IconButton
      aria-label={`Tema: ${ROTULO_TEMA[tema]}. Tocar para mudar para ${ROTULO_TEMA[PROXIMO_TEMA[tema]]}`}
      title={`Tema: ${ROTULO_TEMA[tema]}`}
      icone={<I size={20} aria-hidden />} onClick={() => definirTema(PROXIMO_TEMA[tema])} className={className}
    />
  )
}

/** As três opções lado a lado. `escuroFundo` para usar sobre a barra lateral. */
export function SeletorTema({ escuroFundo, className }: { escuroFundo?: boolean; className?: string }) {
  const tema = useTema()
  return (
    <div role="radiogroup" aria-label="Tema da tela" className={cx('flex gap-1 rounded-campo p-1', escuroFundo ? 'bg-white/[0.07]' : 'border border-linha bg-nevoa', className)}>
      {OPCOES.map((o) => {
        const I = ICONE[o]
        const sel = tema === o
        return (
          <button
            key={o} type="button" role="radio" aria-checked={sel} onClick={() => definirTema(o)}
            className={cx('flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[5px] px-1.5 text-sm transition-colors',
              escuroFundo
                ? sel ? 'bg-white/15 font-medium text-white' : 'text-white/70 hover:text-white'
                : sel ? 'bg-papel font-medium text-mata shadow-sm' : 'text-mata-suave hover:text-mata')}
          >
            {!escuroFundo && <I size={15} aria-hidden />}{ROTULO_TEMA[o]}
          </button>
        )
      })}
    </div>
  )
}
