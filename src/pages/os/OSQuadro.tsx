import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, FileText, LayoutGrid, List, MapPin, Plus, Wrench } from 'lucide-react'
import { useStore } from '@/store'
import { Button, CabecalhoPagina, CampoBusca, EstadoVazio, Painel, Select, SeloStatus, Tabela, cx, type Coluna } from '@/components/ui'
import { dataCurta, normalizar } from '@/lib/format'
import { nomeModelo, porId } from '@/store/selectors'
import type { OrdemServico, StatusOS } from '@/types'
import { ROTULO_COLUNA, STATUS_ORDEM, atrasada } from './status'
import { NovaOSGaveta } from './NovaOSGaveta'
import { useMoverOS } from './useMoverOS'

export default function OSQuadro() {
  const ordens = useStore((s) => s.ordens)
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const usuarios = useStore((s) => s.usuarios)
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const { mover, dialogo } = useMoverOS()

  const [visao, setVisao] = useState<'quadro' | 'lista'>('quadro')
  const [busca, setBusca] = useState('')
  const [tecnico, setTecnico] = useState('')
  const [modelo, setModelo] = useState('')
  const [onde, setOnde] = useState('')
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<StatusOS | null>(null)
  const [novaAberta, setNovaAberta] = useState(false)

  const equipInicial = params.get('novo') ?? undefined
  const gavetaAberta = novaAberta || !!equipInicial
  function fecharGaveta() {
    setNovaAberta(false)
    if (params.has('novo')) { const p = new URLSearchParams(params); p.delete('novo'); setParams(p, { replace: true }) }
  }

  const tecnicos = useMemo(() => usuarios.filter((u) => u.papel === 'Técnico'), [usuarios])
  const filtradas = useMemo(() => {
    const q = normalizar(busca).trim()
    return ordens.filter((o) => {
      const eq = porId(equipamentos, o.equipamentoId)
      if (tecnico && o.tecnico !== tecnico) return false
      if (modelo && eq?.modeloId !== modelo) return false
      if (onde && (o.atendimento ?? 'oficina') !== onde) return false
      if (!q) return true
      const alvo = normalizar(`${o.numero} ${porId(clientes, o.clienteId)?.nome ?? ''} ${eq?.serial ?? ''} ${eq?.apelido ?? ''} ${nomeModelo(eq?.modeloId ?? '', modelos)} ${o.relatoCliente}`)
      return alvo.includes(q)
    })
  }, [ordens, equipamentos, clientes, modelos, busca, tecnico, modelo, onde])

  const soltar = (status: StatusOS) => {
    const os = ordens.find((o) => o.id === arrastando)
    setArrastando(null); setSobre(null)
    if (os) mover(os, status)
  }

  const colunasLista: Coluna<OrdemServico>[] = [
    { id: 'num', titulo: 'OS', principal: true, valor: (o) => o.numero, render: (o) => <span className="num font-medium">#{o.numero}</span> },
    { id: 'cli', titulo: 'Cliente', valor: (o) => porId(clientes, o.clienteId)?.nome ?? '', render: (o) => porId(clientes, o.clienteId)?.nome ?? '-' },
    { id: 'drone', titulo: 'Drone', render: (o) => { const e = porId(equipamentos, o.equipamentoId); return e ? `${nomeModelo(e.modeloId, modelos)} · ${e.serial}` : '-' } },
    { id: 'onde', titulo: 'Atendimento', valor: (o) => o.atendimento ?? 'oficina', render: (o) => (o.atendimento === 'campo' ? <span className="inline-flex items-center gap-1 text-ceu"><MapPin size={14} />Campo</span> : 'Oficina'), ocultarMobile: true },
    { id: 'tec', titulo: 'Técnico', valor: (o) => o.tecnico, render: (o) => o.tecnico, ocultarMobile: true },
    { id: 'prev', titulo: 'Previsão', valor: (o) => o.previsao, render: (o) => <span className={cx('num', atrasada(o) && 'text-barro-texto')}>{dataCurta(o.previsao)}</span> },
    { id: 'st', titulo: 'Status', valor: (o) => STATUS_ORDEM.indexOf(o.status), render: (o) => <SeloStatus tipo="os" status={o.status} /> },
  ]

  return (
    <>
      <CabecalhoPagina
        titulo="Ordens de serviço" descricao="Drones na oficina, etapa por etapa."
        acoes={<Button icone={<Plus size={18} />} onClick={() => setNovaAberta(true)}>Nova OS</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1 sm:max-w-xs"><CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por cliente, número ou serial" /></div>
        <Select value={tecnico} onChange={(e) => setTecnico(e.target.value)} aria-label="Filtrar por técnico" className="w-auto!">
          <option value="">Todos os técnicos</option>
          {tecnicos.map((u) => <option key={u.id} value={u.nome}>{u.nome}</option>)}
        </Select>
        <Select value={modelo} onChange={(e) => setModelo(e.target.value)} aria-label="Filtrar por modelo" className="w-auto!">
          <option value="">Todos os modelos</option>
          {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Select>
        <Select value={onde} onChange={(e) => setOnde(e.target.value)} aria-label="Filtrar por local do atendimento" className="w-auto!">
          <option value="">Oficina e campo</option>
          <option value="oficina">Oficina</option>
          <option value="campo">Campo</option>
        </Select>
        <div role="group" aria-label="Forma de exibição" className="ml-auto flex rounded-campo border border-linha bg-papel p-0.5">
          {([['quadro', 'Quadro', LayoutGrid], ['lista', 'Lista', List]] as const).map(([id, rot, Ic]) => (
            <button key={id} type="button" onClick={() => setVisao(id)} aria-pressed={visao === id}
              className={cx('inline-flex h-10 items-center gap-1.5 rounded-[5px] px-3 text-sm font-medium', visao === id ? 'bg-forte text-white' : 'text-mata-suave hover:text-mata')}>
              <Ic size={16} />{rot}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <Painel><EstadoVazio icone={<Wrench size={32} />} titulo="Nenhuma OS encontrada" texto="Ajuste os filtros ou abra uma nova ordem de serviço." acao={<Button onClick={() => setNovaAberta(true)}>Nova OS</Button>} /></Painel>
      ) : visao === 'lista' ? (
        <Painel semPadding><Tabela colunas={colunasLista} dados={filtradas} chave={(o) => o.id} aoClicar={(o) => navegar(`/os/${o.id}`)} ordemInicial={{ coluna: 'num', direcao: 'desc' }} /></Painel>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-3">
            {STATUS_ORDEM.map((st) => {
              const cartoes = filtradas.filter((o) => o.status === st)
              return (
                <section
                  key={st} aria-label={ROTULO_COLUNA[st]}
                  onDragOver={(e) => { if (arrastando) { e.preventDefault(); setSobre(st) } }}
                  onDragLeave={() => setSobre((s) => (s === st ? null : s))}
                  onDrop={(e) => { e.preventDefault(); soltar(st) }}
                  className={cx('w-[272px] shrink-0 rounded-painel border bg-mata/[0.035] p-2 transition-colors', sobre === st ? 'border-lavoura bg-lavoura-claro' : 'border-linha')}
                >
                  <h2 className="mb-2 flex items-center justify-between px-1 text-sm">
                    <span>{ROTULO_COLUNA[st]}</span><span className="num rounded-full bg-mata/[0.08] px-2 text-xs">{cartoes.length}</span>
                  </h2>
                  <ul className="space-y-2">
                    {cartoes.map((o) => {
                      const eq = porId(equipamentos, o.equipamentoId)
                      return (
                        <li key={o.id} draggable onDragStart={(e) => { setArrastando(o.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => { setArrastando(null); setSobre(null) }}
                          className={cx('rounded-campo border border-linha bg-papel p-3 lg:cursor-grab', arrastando === o.id && 'opacity-50')}>
                          <Link to={`/os/${o.id}`} className="block">
                            <div className="flex items-center justify-between gap-2">
                              <span className="num text-sm font-semibold">OS {o.numero}</span>
                              <span className="flex items-center gap-1.5 text-mata-suave">
                                {o.atendimento === 'campo' && <span title="Atendimento em campo" className="inline-flex items-center gap-0.5 rounded-full bg-ceu-claro px-1.5 text-xs font-medium text-ceu-texto"><MapPin size={12} />Campo</span>}
                                {o.fotos.length > 0 && <span title={`${o.fotos.length} fotos`} className="inline-flex items-center gap-0.5 text-xs"><Camera size={14} /><span className="num">{o.fotos.length}</span></span>}
                                {o.relatorio && <span title="Tem relatório"><FileText size={14} className="text-lavoura-texto" /></span>}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium">{porId(clientes, o.clienteId)?.nome}</p>
                            <p className="text-sm text-mata-suave">{eq ? <>{nomeModelo(eq.modeloId, modelos)} · <span className="serial text-xs">{eq.serial}</span></> : '-'}</p>
                            <p className="mt-2 flex items-center justify-between text-xs text-mata-suave">
                              <span>{o.tecnico}</span>
                              <span className={cx('num', atrasada(o) && 'font-semibold text-barro-texto')}>{atrasada(o) ? 'Atrasada · ' : ''}{dataCurta(o.previsao)}</span>
                            </p>
                          </Link>
                          <Select value={o.status} aria-label={`Mover OS ${o.numero} para`} onChange={(e) => mover(o, e.target.value as StatusOS)} className="mt-2 h-10 text-sm lg:hidden">
                            {STATUS_ORDEM.map((s) => <option key={s} value={s}>{s === o.status ? `Mover para… (${ROTULO_COLUNA[s]})` : ROTULO_COLUNA[s]}</option>)}
                          </Select>
                        </li>
                      )
                    })}
                    {cartoes.length === 0 && <li className="px-1 py-4 text-center text-xs text-mata-suave">Nenhuma OS aqui</li>}
                  </ul>
                </section>
              )
            })}
          </div>
        </div>
      )}

      {dialogo}
      <NovaOSGaveta aberta={gavetaAberta} aoFechar={fecharGaveta} equipamentoInicial={equipInicial} aoCriar={(os) => { fecharGaveta(); navegar(`/os/${os.id}`) }} />
    </>
  )
}
