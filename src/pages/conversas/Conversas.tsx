import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, FileText, Info, MessageCircle, PanelRight, Plane, Receipt, Send, Sparkles, Wrench } from 'lucide-react'
import {
  Avatar, Button, CabecalhoPagina, CampoBusca, EstadoVazio, Gaveta, IconButton, Modal, Selo, SeloIA, Textarea, cx, toast,
  type CorSelo,
} from '@/components/ui'
import { AIPensando } from '@/components/ia/AIPensando'
import { useStore, novoId } from '@/store'
import { totalOrcamento } from '@/store/selectors'
import { brl, dataCurta } from '@/lib/format'
import { extrairPedido, resumirConversa, sugerirResposta } from '@/lib/ai/conversas'
import { Markdown } from '@/pages/assistente/Markdown'
import { rotuloStatus } from '@/components/ui'
import type { Conversa, Equipamento } from '@/types'

type Etiqueta = Conversa['etiqueta']
const ETIQUETAS: Etiqueta[] = ['Peças', 'Manutenção', 'Venda de drone', 'Financeiro']
const COR_ETIQUETA: Record<Etiqueta, CorSelo> = { Peças: 'azul', Manutenção: 'ambar', 'Venda de drone': 'verde', Financeiro: 'neutro' }
const DIA = 86400000

function useDesktop() {
  const [ok, setOk] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 1024px)').matches : true))
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const f = () => setOk(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return ok
}

const inicioDia = (iso: string) => { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d.getTime() }
const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }
const horaMin = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function rotuloLista(iso: string): string {
  const dif = Math.round((hoje0() - inicioDia(iso)) / DIA)
  if (dif <= 0) return horaMin(iso)
  if (dif === 1) return 'Ontem'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function rotuloDia(iso: string): string {
  const dif = Math.round((hoje0() - inicioDia(iso)) / DIA)
  if (dif <= 0) return 'Hoje'
  if (dif === 1) return 'Ontem'
  return dataCurta(iso)
}

const ultima = (c: Conversa) => c.mensagens[c.mensagens.length - 1]
const previa = (c: Conversa) => {
  const m = [...c.mensagens].reverse().find((x) => x.de !== 'ia') ?? ultima(c)
  return m ? `${m.de === 'equipe' ? 'Você: ' : ''}${m.texto}` : ''
}

function Contexto({ conversa }: { conversa: Conversa }) {
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const ordens = useStore((s) => s.ordens)
  const orcamentos = useStore((s) => s.orcamentos)
  const cliente = clientes.find((c) => c.id === conversa.clienteId)
  const eqps = useMemo(() => equipamentos.filter((e) => e.clienteId === cliente?.id), [equipamentos, cliente])
  const abertas = useMemo(() => ordens.filter((o) => o.clienteId === cliente?.id && o.status !== 'entregue'), [ordens, cliente])
  const ultimoOrc = useMemo(() => orcamentos.filter((o) => o.clienteId === cliente?.id).sort((a, b) => b.data.localeCompare(a.data))[0], [orcamentos, cliente])
  const nomeModelo = (id: string) => modelos.find((m) => m.id === id)?.nome ?? id.toUpperCase()

  if (!cliente) {
    return (
      <div className="space-y-2 p-4 text-sm">
        <p className="font-medium">{conversa.nome}</p>
        <p className="text-mata-suave">Este contato ainda não é um cliente cadastrado. Quando fechar negócio, cadastre-o em Clientes para ver drones, OS e orçamentos aqui.</p>
        <Link to="/clientes" className="inline-flex min-h-10 items-center font-medium text-ceu">Ir para Clientes</Link>
      </div>
    )
  }
  const bloco = 'border-t border-linha px-4 py-3'
  const titulo = 'mb-2 text-xs font-semibold text-mata-suave'
  return (
    <div className="text-sm">
      <div className="px-4 py-3">
        <Link to={`/clientes/${cliente.id}`} className="font-medium text-ceu">{cliente.nome}</Link>
        <p className="text-mata-suave">{cliente.cidade}/{cliente.uf} · cliente desde {dataCurta(cliente.desde)}</p>
        <p className="num text-mata-suave">{cliente.fone}</p>
      </div>
      <div className={bloco}>
        <h3 className={titulo}>Drones</h3>
        {eqps.length === 0 ? <p className="text-mata-suave">Nenhum drone cadastrado.</p> : (
          <ul className="space-y-1.5">
            {eqps.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-2">
                <span>{nomeModelo(e.modeloId)}{e.apelido ? <span className="text-mata-suave"> · {e.apelido}</span> : null}</span>
                <span className="num shrink-0 text-xs text-mata-suave">{e.horasVoo} h</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={bloco}>
        <h3 className={titulo}>OS em aberto</h3>
        {abertas.length === 0 ? <p className="text-mata-suave">Nenhuma OS em aberto.</p> : (
          <ul className="space-y-2">
            {abertas.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <Link to={`/os/${o.id}`} className="font-medium text-ceu">OS {o.numero}</Link>
                <span className="text-right text-xs text-mata-suave">{rotuloStatus('os', o.status)} · {dataCurta(o.previsao)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={bloco}>
        <h3 className={titulo}>Último orçamento</h3>
        {!ultimoOrc ? <p className="text-mata-suave">Nenhum orçamento.</p> : (
          <div className="flex items-center justify-between gap-2">
            <Link to={`/orcamentos/${ultimoOrc.id}`} className="font-medium text-ceu">#{ultimoOrc.numero}</Link>
            <span className="text-right text-xs text-mata-suave"><span className="num">{brl(totalOrcamento(ultimoOrc))}</span> · {rotuloStatus('orcamento', ultimoOrc.status)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Conversas() {
  const navegar = useNavigate()
  const desktop = useDesktop()
  const conversas = useStore((s) => s.conversas)
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const salvar = useStore((s) => s.salvar)

  const [filtro, setFiltro] = useState<Etiqueta | 'todas'>('todas')
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [sugerido, setSugerido] = useState(false)
  const [sugerindo, setSugerindo] = useState(false)
  const [contextoAberto, setContextoAberto] = useState(false)
  const [resumo, setResumo] = useState<{ aberto: boolean; texto: string; carregando: boolean }>({ aberto: false, texto: '', carregando: false })
  const [escolherDrone, setEscolherDrone] = useState(false)
  const [criandoOrc, setCriandoOrc] = useState(false)
  const [acoesAbertas, setAcoesAbertas] = useState(false)
  const rolagem = useRef<HTMLDivElement>(null)

  const ordenadas = useMemo(
    () => [...conversas].sort((a, b) => (ultima(b)?.hora ?? '').localeCompare(ultima(a)?.hora ?? '')),
    [conversas],
  )
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return ordenadas.filter((c) =>
      (filtro === 'todas' || c.etiqueta === filtro)
      && (!q || c.nome.toLowerCase().includes(q) || c.fone.includes(q) || c.mensagens.some((m) => m.texto.toLowerCase().includes(q))))
  }, [ordenadas, filtro, busca])

  const ativaId = sel ?? (desktop ? lista[0]?.id ?? null : null)
  const ativa = conversas.find((c) => c.id === ativaId)
  const cliente = clientes.find((c) => c.id === ativa?.clienteId)
  const drones = useMemo(() => equipamentos.filter((e) => e.clienteId === cliente?.id), [equipamentos, cliente])
  const totalNaoLidas = conversas.reduce((a, c) => a + c.naoLidas, 0)

  // abrir a conversa marca como lida; rola até a última mensagem
  useEffect(() => {
    if (ativa && ativa.naoLidas > 0) salvar('conversas', { ...ativa, naoLidas: 0 })
  }, [ativa, salvar])
  useEffect(() => {
    const el = rolagem.current
    if (el) el.scrollTop = el.scrollHeight
  }, [ativaId, ativa?.mensagens.length])
  useEffect(() => { setTexto(''); setSugerido(false) }, [ativaId])

  function enviar() {
    const t = texto.trim()
    if (!ativa || !t) return
    salvar('conversas', {
      ...ativa, naoLidas: 0,
      mensagens: [...ativa.mensagens, { id: novoId('msg'), de: 'equipe', texto: t, hora: new Date().toISOString() }],
    })
    setTexto(''); setSugerido(false)
    toast.sucesso('Mensagem enviada')
  }

  async function sugerir() {
    if (!ativa) return
    setSugerindo(true)
    try {
      const s = await sugerirResposta(ativa, useStore.getState())
      setTexto(s); setSugerido(true)
    } catch {
      toast.erro('Não consegui sugerir uma resposta agora')
    } finally { setSugerindo(false) }
  }

  async function resumir() {
    if (!ativa) return
    setResumo({ aberto: true, texto: '', carregando: true })
    try {
      const t = await resumirConversa(ativa)
      setResumo({ aberto: true, texto: t, carregando: false })
    } catch {
      setResumo({ aberto: false, texto: '', carregando: false })
      toast.erro('Não consegui resumir a conversa agora')
    }
  }

  async function criarOrcamento() {
    if (!ativa) return
    setCriandoOrc(true)
    try {
      const pedido = await extrairPedido(ativa, useStore.getState())
      toast.info('Pedido lido da conversa. Revise o orçamento.')
      navegar(`/orcamentos/novo?texto=${encodeURIComponent(pedido)}${cliente ? `&cliente=${cliente.id}` : ''}`)
    } catch {
      toast.erro('Não consegui ler o pedido da conversa')
    } finally { setCriandoOrc(false) }
  }

  function abrirOS() {
    if (drones.length === 1) navegar(`/os?novo=${drones[0].id}`)
    else if (drones.length > 1) setEscolherDrone(true)
  }
  const nomeDrone = (e: Equipamento) => `${modelos.find((m) => m.id === e.modeloId)?.nome ?? ''}${e.apelido ? ` · ${e.apelido}` : ''}`

  // mensagens agrupadas por dia
  const grupos = useMemo(() => {
    const out: { dia: string; msgs: Conversa['mensagens'] }[] = []
    for (const m of ativa?.mensagens ?? []) {
      const dia = rotuloDia(m.hora)
      const g = out[out.length - 1]
      if (g && g.dia === dia) g.msgs.push(m); else out.push({ dia, msgs: [m] })
    }
    return out
  }, [ativa])

  return (
    <>
      <CabecalhoPagina
        titulo="Conversas"
        descricao={totalNaoLidas ? `${totalNaoLidas} ${totalNaoLidas === 1 ? 'mensagem não lida' : 'mensagens não lidas'}` : 'Atendimento pelo WhatsApp em um só lugar.'}
      />
      <div className="grid h-[calc(100dvh-17.5rem)] min-h-[420px] min-w-0 overflow-hidden rounded-painel border border-linha bg-papel lg:h-[calc(100dvh-14rem)] lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_290px]">
        {/* lista */}
        <section className={cx('min-h-0 min-w-0 flex-col border-linha lg:flex lg:border-r', ativaId && !desktop ? 'hidden' : 'flex')} aria-label="Lista de conversas">
          <div className="space-y-2 border-b border-linha p-3">
            <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar conversa" />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por etiqueta">
              {(['todas', ...ETIQUETAS] as const).map((e) => (
                <button key={e} type="button" onClick={() => setFiltro(e)} aria-pressed={filtro === e}
                  className={cx('min-h-9 rounded-full border px-3 text-xs font-medium transition-colors',
                    filtro === e ? 'border-mata bg-mata text-white' : 'border-linha bg-papel text-mata-suave hover:text-mata')}>
                  {e === 'todas' ? 'Todas' : e}
                </button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-linha overflow-y-auto">
            {lista.length === 0 && <li className="p-6 text-center text-sm text-mata-suave">Nenhuma conversa encontrada.</li>}
            {lista.map((c) => {
              const u = ultima(c)
              const selecionada = c.id === ativaId
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => setSel(c.id)} aria-current={selecionada ? 'true' : undefined}
                    className={cx('flex min-h-[72px] w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-nevoa', selecionada && 'bg-nevoa')}>
                    <Avatar nome={c.nome} tamanho={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cx('truncate text-sm', c.naoLidas ? 'font-semibold' : 'font-medium')}>{c.nome}</span>
                        <span className="num shrink-0 text-xs text-mata-suave">{u ? rotuloLista(u.hora) : ''}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className={cx('line-clamp-1 text-sm', c.naoLidas ? 'text-mata' : 'text-mata-suave')}>{previa(c)}</span>
                        {c.naoLidas > 0 && (
                          <span className="num inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lavoura px-1.5 text-xs font-semibold text-white" aria-label={`${c.naoLidas} não lidas`}>{c.naoLidas}</span>
                        )}
                      </span>
                      <Selo cor={COR_ETIQUETA[c.etiqueta]} className="mt-1.5">{c.etiqueta}</Selo>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="flex items-start gap-2 border-t border-linha px-3 py-2.5 text-xs text-mata-suave">
            <Info size={14} className="mt-px shrink-0" aria-hidden />Na versão final, ligado ao WhatsApp Business da empresa.
          </p>
        </section>

        {/* conversa */}
        <section className={cx('min-h-0 min-w-0 flex-col lg:flex xl:border-r xl:border-linha', ativaId || desktop ? 'flex' : 'hidden')} aria-label="Conversa">
          {!ativa ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EstadoVazio icone={<MessageCircle size={32} />} titulo="Escolha uma conversa" texto="Selecione um contato na lista para ver as mensagens." />
            </div>
          ) : (
            <>
              <header className="flex items-center gap-2 border-b border-linha px-3 py-2.5">
                <IconButton aria-label="Voltar para a lista" icone={<ArrowLeft size={18} />} className="lg:hidden" onClick={() => setSel(null)} />
                <Avatar nome={ativa.nome} tamanho={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">{ativa.nome}</p>
                  <p className="num truncate text-xs text-mata-suave">
                    {ativa.fone}
                    {cliente && <> · <Link to={`/clientes/${cliente.id}`} className="text-ceu">Ver cliente</Link></>}
                  </p>
                </div>
                <span className="hidden sm:inline-flex"><Selo cor={COR_ETIQUETA[ativa.etiqueta]}>{ativa.etiqueta}</Selo></span>
                <IconButton aria-label="Ver contexto do cliente" icone={<PanelRight size={18} />} className="xl:hidden" onClick={() => setContextoAberto(true)} />
              </header>

              <div ref={rolagem} className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden bg-nevoa px-3 py-4 md:px-5">
                {grupos.map((g) => (
                  <div key={g.dia} className="space-y-2">
                    <p className="text-center text-xs font-medium text-mata-suave">{g.dia}</p>
                    {g.msgs.map((m) => m.de === 'ia' ? (
                      <div key={m.id} className="ia-borda mx-auto max-w-[92%] rounded-painel px-3.5 py-2.5 text-sm">
                        <div className="mb-1 flex items-center gap-2"><SeloIA>IA</SeloIA><span className="num text-xs text-mata-suave">{horaMin(m.hora)}</span></div>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.texto}</p>
                      </div>
                    ) : (
                      <div key={m.id} className={cx('flex', m.de === 'equipe' ? 'justify-end' : 'justify-start')}>
                        <div className={cx('max-w-[86%] rounded-painel px-3.5 py-2 text-[15px] leading-relaxed sm:max-w-[72%]',
                          m.de === 'equipe' ? 'rounded-br-sm bg-lavoura-claro' : 'rounded-bl-sm border border-linha bg-papel')}>
                          {m.de === 'equipe' && <p className="mb-0.5 text-xs font-semibold text-lavoura-escuro">Equipe</p>}
                          <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                          <p className="num mt-0.5 text-right text-[11px] text-mata-suave">{horaMin(m.hora)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 border-t border-linha p-3">
                <button type="button" aria-expanded={acoesAbertas} onClick={() => setAcoesAbertas((v) => !v)}
                  className="flex min-h-10 items-center gap-2 text-sm font-medium text-mata-suave sm:hidden">
                  <Sparkles size={15} aria-hidden />Ações da IA<ChevronDown size={15} className={cx('transition-transform', acoesAbertas && 'rotate-180')} aria-hidden />
                </button>
                <div className={cx('flex-wrap gap-1.5 sm:flex', acoesAbertas ? 'flex' : 'hidden')}>
                  <Button tamanho="sm" variante="secundario" icone={<FileText size={15} />} onClick={() => void resumir()}>Resumir conversa</Button>
                  <Button tamanho="sm" variante="secundario" icone={<Receipt size={15} />} loading={criandoOrc} onClick={() => void criarOrcamento()}>
                    Criar orçamento com o que o cliente pediu
                  </Button>
                  {drones.length > 0 && <Button tamanho="sm" variante="secundario" icone={<Wrench size={15} />} onClick={abrirOS}>Abrir OS</Button>}
                </div>
                {sugerido && (
                  <p className="flex items-center gap-2 text-xs text-mata-suave"><SeloIA>Sugestão da IA</SeloIA>Revise e edite antes de enviar.</p>
                )}
                <Textarea
                  value={texto} rows={sugerido ? 5 : 2} placeholder="Escreva a resposta" aria-label="Resposta ao cliente"
                  onChange={(e) => { setTexto(e.target.value); if (!e.target.value.trim()) setSugerido(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviar() } }}
                  className="max-h-48 resize-y"
                />
                <AIPensando ativa={sugerindo} etapas={['Lendo a conversa', 'Consultando estoque, OS e orçamentos', 'Escrevendo a resposta']} intervaloMs={380} />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variante="ia" icone={<Sparkles size={16} />} loading={sugerindo} onClick={() => void sugerir()}>Sugerir resposta</Button>
                  <Button icone={<Send size={16} />} disabled={!texto.trim()} onClick={enviar}>Enviar</Button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* contexto (telas largas) */}
        <aside className="hidden min-h-0 overflow-y-auto xl:block" aria-label="Contexto do cliente">
          <div className="border-b border-linha px-4 py-3"><h2 className="text-base">Contexto</h2></div>
          {ativa && <Contexto conversa={ativa} />}
        </aside>
      </div>

      <Gaveta aberta={contextoAberto && !!ativa} aoFechar={() => setContextoAberto(false)} titulo="Contexto do cliente" largura="md">
        {ativa && <div className="-m-4"><Contexto conversa={ativa} /></div>}
      </Gaveta>

      <Modal aberto={resumo.aberto} aoFechar={() => setResumo((r) => ({ ...r, aberto: false }))} titulo="Resumo da conversa"
        rodape={<Button variante="secundario" onClick={() => setResumo((r) => ({ ...r, aberto: false }))}>Fechar</Button>}>
        {resumo.carregando
          ? <AIPensando ativa etapas={['Lendo as mensagens', 'Separando pedidos e combinados', 'Montando o resumo']} intervaloMs={350} />
          : <div className="space-y-3"><SeloIA>Resumo da IA</SeloIA><Markdown texto={resumo.texto} /></div>}
      </Modal>

      <Modal aberto={escolherDrone} aoFechar={() => setEscolherDrone(false)} titulo="Abrir OS para qual drone?" largura="sm">
        <ul className="divide-y divide-linha">
          {drones.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => { setEscolherDrone(false); navegar(`/os?novo=${e.id}`) }}
                className="flex min-h-12 w-full items-center gap-3 py-2 text-left hover:text-ceu">
                <Plane size={18} className="shrink-0 text-mata-suave" aria-hidden />
                <span className="flex-1">{nomeDrone(e)}</span>
                <span className="serial text-xs text-mata-suave">{e.serial}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
