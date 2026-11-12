import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Mic, Paperclip, Sparkles, Square } from 'lucide-react'
import { useDitado } from '@/lib/useDitado'
import { Button, cx } from '@/components/ui'

export interface AIComposerProps {
  valor: string
  aoMudar: (v: string) => void
  aoEnviar: () => void
  placeholder?: string
  /** Texto do botão de envio. Padrão: "Enviar". */
  rotuloEnviar?: string
  carregando?: boolean
  desabilitado?: boolean
  /** Frases prontas; clicar preenche o campo. */
  sugestoes?: string[]
  /** Se informado, mostra o botão de anexar fotos. */
  aoAnexar?: (arquivos: File[]) => void
  rotuloAnexar?: string
  /** Conteúdo extra dentro da caixa, acima dos botões (ex.: miniaturas das fotos anexadas). */
  anexos?: ReactNode
  /** Linhas mínimas do campo. Padrão: 2. */
  linhas?: number
  /** Enter envia e Shift+Enter quebra linha. Padrão: true. */
  enviarComEnter?: boolean
  /** Permite enviar com o campo vazio (ex.: só com fotos). */
  permitirVazio?: boolean
  autoFoco?: boolean
  className?: string
}

/**
 * Caixa de entrada padrão dos recursos de IA: texto, ditado por voz, fotos e sugestões.
 * Componente controlado (`valor` / `aoMudar`).
 */
export function AIComposer({
  valor, aoMudar, aoEnviar, placeholder = 'Escreva ou dite o que você precisa', rotuloEnviar = 'Enviar',
  carregando, desabilitado, sugestoes, aoAnexar, rotuloAnexar = 'Anexar fotos', anexos, linhas = 2,
  enviarComEnter = true, permitirVazio, autoFoco, className,
}: AIComposerProps) {
  const campo = useRef<HTMLTextAreaElement>(null)
  const arquivo = useRef<HTMLInputElement>(null)
  const base = useRef('')
  const valorAtual = useRef(valor)
  valorAtual.current = valor

  const ditado = useDitado((texto, final) => {
    const junto = [base.current, texto].filter(Boolean).join(base.current && !/\s$/.test(base.current) ? ' ' : '')
    aoMudar(junto)
    if (final) base.current = junto
  })

  // altura acompanha o conteúdo
  useLayoutEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [valor])

  useEffect(() => { if (autoFoco) campo.current?.focus() }, [autoFoco])

  const bloqueado = !!carregando || !!desabilitado
  const podeEnviar = !bloqueado && (permitirVazio || valor.trim().length > 0)

  const enviar = () => {
    if (!podeEnviar) return
    if (ditado.ouvindo) ditado.parar()
    aoEnviar()
  }
  const alternarDitado = () => {
    if (ditado.ouvindo) return ditado.parar()
    base.current = valorAtual.current.trim()
    ditado.iniciar()
  }
  const tecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (enviarComEnter && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar() }
  }

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div className={cx('ia-borda rounded-painel transition-shadow focus-within:shadow-[0_0_0_3px_rgb(30_120_200/0.16)]', bloqueado && 'opacity-80')}>
        <textarea
          ref={campo} rows={linhas} value={valor} disabled={bloqueado} placeholder={placeholder} aria-label={placeholder}
          onChange={(e) => aoMudar(e.target.value)} onKeyDown={tecla}
          className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed text-mata placeholder:text-mata-suave/70 focus:outline-none"
        />
        {anexos && <div className="px-4 pb-1 pt-2">{anexos}</div>}
        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          {ditado.suportado && (
            <button
              type="button" onClick={alternarDitado} disabled={bloqueado} aria-pressed={ditado.ouvindo}
              aria-label={ditado.ouvindo ? 'Parar ditado' : 'Ditar por voz'} title={ditado.ouvindo ? 'Parar ditado' : 'Ditar por voz'}
              className={cx('inline-flex h-10 shrink-0 items-center gap-2 rounded-campo px-2.5 text-sm font-medium transition-colors disabled:opacity-50',
                ditado.ouvindo ? 'bg-barro-claro text-barro-texto' : 'text-mata-suave hover:bg-mata/5 hover:text-mata')}
            >
              {ditado.ouvindo ? <Square size={15} fill="currentColor" aria-hidden /> : <Mic size={18} aria-hidden />}
              {ditado.ouvindo && <span className="anim-pulso">Ouvindo, pode falar</span>}
            </button>
          )}
          {aoAnexar && (
            <>
              <button
                type="button" onClick={() => arquivo.current?.click()} disabled={bloqueado} aria-label={rotuloAnexar} title={rotuloAnexar}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-campo px-2.5 text-sm font-medium text-mata-suave transition-colors hover:bg-mata/5 hover:text-mata disabled:opacity-50"
              >
                <Paperclip size={18} aria-hidden />
                <span className="hidden sm:inline">{rotuloAnexar}</span>
              </button>
              <input
                ref={arquivo} type="file" accept="image/*" multiple hidden
                onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) aoAnexar(fs); e.target.value = '' }}
              />
            </>
          )}
          <div className="flex-1" />
          <Button variante="ia" onClick={enviar} disabled={!podeEnviar} loading={carregando} icone={<Sparkles size={16} aria-hidden />}>
            {rotuloEnviar}
          </Button>
        </div>
      </div>

      <p className={cx('text-xs text-barro-texto', !ditado.erro && 'sr-only')} aria-live="polite">{ditado.erro}</p>

      {!!sugestoes?.length && !carregando && (
        <div className="flex flex-wrap gap-2">
          {sugestoes.map((s) => (
            <button
              key={s} type="button" disabled={bloqueado}
              onClick={() => { aoMudar(s); campo.current?.focus() }}
              className="min-h-10 rounded-campo border border-linha bg-papel px-3 py-2 text-left text-sm text-mata-suave transition-colors hover:border-mata-suave/40 hover:text-mata"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
