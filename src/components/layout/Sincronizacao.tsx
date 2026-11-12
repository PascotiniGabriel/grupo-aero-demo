import { useState } from 'react'
import { CloudOff, Loader2, RefreshCw, Wifi } from 'lucide-react'
import { Button, Gaveta, cx } from '@/components/ui'
import { useOnline, useSync } from '@/lib/sync'
import { dataCurta } from '@/lib/format'

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}

/** Interruptor de demonstração "Simular sem internet". */
export function InterruptorOffline({ className }: { className?: string }) {
  const simular = useSync((s) => s.simularOffline)
  const definir = useSync((s) => s.definirSimulado)
  return (
    <button
      type="button" role="switch" aria-checked={simular} onClick={() => definir(!simular)}
      className={cx('flex min-h-11 w-full items-center justify-between gap-3 rounded-campo border border-linha bg-papel px-3 py-2 text-left text-sm', className)}
    >
      <span>Simular sem internet</span>
      <span className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors', simular ? 'bg-ambar' : 'bg-mata/20')} aria-hidden>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', simular ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

/** Indicador compacto da barra superior; abre a gaveta de sincronização. */
export function IndicadorSync() {
  const online = useOnline()
  const pendentes = useSync((s) => s.fila.length)
  const sincronizando = useSync((s) => s.sincronizando)
  const [aberta, setAberta] = useState(false)

  let texto: string, curto: string, cor: string, icone
  if (sincronizando) {
    texto = 'Sincronizando…'; curto = 'Sincronizando'; cor = 'border-ceu/40 bg-ceu-claro text-ceu-texto'
    icone = <Loader2 size={15} className="animate-spin" aria-hidden />
  } else if (!online) {
    texto = `Sem internet · ${plural(pendentes, 'alteração salva', 'alterações salvas')} no aparelho`
    curto = pendentes > 0 ? `Sem internet · ${pendentes}` : 'Sem internet'
    cor = 'border-ambar/50 bg-ambar-claro text-ambar-texto'
    icone = <CloudOff size={15} aria-hidden />
  } else if (pendentes > 0) {
    texto = `Online · ${plural(pendentes, 'alteração', 'alterações')} para enviar`; curto = `${pendentes} para enviar`
    cor = 'border-ceu/40 bg-ceu-claro text-ceu-texto'
    icone = <Wifi size={15} aria-hidden />
  } else {
    texto = 'Online · tudo sincronizado'; curto = 'Online'
    cor = 'border-linha bg-papel text-mata-suave'
    icone = <Wifi size={15} className="text-lavoura-texto" aria-hidden />
  }

  return (
    <>
      <button
        type="button" onClick={() => setAberta(true)} aria-label={`Sincronização: ${texto}`} title={texto}
        className={cx('inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-campo border px-2.5 text-xs font-medium transition-colors', cor)}
      >
        {icone}
        <span className="hidden xl:inline">{texto}</span>
        <span className="hidden sm:inline xl:hidden">{curto}</span>
        {pendentes > 0 && !sincronizando && <span className="num sm:hidden">{pendentes}</span>}
      </button>
      <GavetaSync aberta={aberta} aoFechar={() => setAberta(false)} />
    </>
  )
}

function GavetaSync({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const online = useOnline()
  const fila = useSync((s) => s.fila)
  const enviados = useSync((s) => s.enviados)
  const sincronizando = useSync((s) => s.sincronizando)
  const progresso = useSync((s) => s.progresso)
  const agora = useSync((s) => s.sincronizarAgora)

  const estado = sincronizando ? 'Sincronizando…' : !online ? 'Sem internet' : fila.length > 0 ? 'Online, com envio pendente' : 'Online, tudo sincronizado'

  return (
    <Gaveta aberta={aberta} aoFechar={aoFechar} titulo="Sincronização" largura="md">
      <div className="space-y-5">
        <div className={cx('flex items-center gap-3 rounded-painel border p-3', !online ? 'border-ambar/50 bg-ambar-claro' : 'border-linha bg-nevoa')}>
          {sincronizando ? <Loader2 size={20} className="animate-spin text-ceu" aria-hidden /> : !online ? <CloudOff size={20} className="text-ambar-texto" aria-hidden /> : <Wifi size={20} className="text-lavoura-texto" aria-hidden />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{estado}</p>
            <p className="text-sm text-mata-suave">{plural(fila.length, 'alteração pendente', 'alterações pendentes')}</p>
          </div>
        </div>
        {sincronizando && (
          <div className="h-2 rounded-full bg-mata/[0.08]" role="progressbar" aria-valuenow={Math.round(progresso * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-lavoura transition-all" style={{ width: `${progresso * 100}%` }} />
          </div>
        )}

        <p className="text-sm text-mata-suave">
          Tudo que você faz fica gravado no aparelho na hora. Se a bateria acabar, nada se perde: quando o celular ligar e tiver sinal, o envio continua.
        </p>

        <div className="space-y-2">
          <Button icone={<RefreshCw size={16} aria-hidden />} onClick={() => void agora()} disabled={!online || sincronizando || fila.length === 0}>Sincronizar agora</Button>
          <InterruptorOffline />
        </div>

        <section>
          <h3 className="mb-1.5 text-sm font-medium">Aguardando envio ({fila.length})</h3>
          {fila.length === 0 ? <p className="text-sm text-mata-suave">Nada pendente.</p> : (
            <ul className="divide-y divide-linha rounded-painel border border-linha">
              {fila.slice().reverse().slice(0, 50).map((i) => (
                <li key={i.id} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">{i.resumo}</span>
                  <span className="num shrink-0 text-xs text-mata-suave">{hora(i.quando)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-medium">Enviadas recentemente</h3>
          {enviados.length === 0 ? <p className="text-sm text-mata-suave">Nenhum envio ainda.</p> : (
            <ul className="divide-y divide-linha rounded-painel border border-linha">
              {enviados.slice(0, 15).map((i) => (
                <li key={`${i.id}-e`} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm text-mata-suave">
                  <span className="min-w-0 flex-1">{i.resumo}</span>
                  <span className="num shrink-0 text-xs">{dataCurta(i.enviadoEm)} {hora(i.enviadoEm)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Gaveta>
  )
}
