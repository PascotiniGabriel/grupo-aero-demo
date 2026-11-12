import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarPlus, Check, FileText, MapPin, Sparkles, Wrench } from 'lucide-react'
import { useStore } from '@/store'
import { Abas, Button, CabecalhoPagina, EstadoVazio, Gaveta, Painel, Selo, SeloStatus, cx, toast } from '@/components/ui'
import { dataCurta, dataHora } from '@/lib/format'
import { nomeModelo, porId } from '@/store/selectors'
import { ROTULO_COLUNA, STATUS_ORDEM, atrasada } from './status'
import { useMoverOS } from './useMoverOS'
import { CampoDitado } from './CampoDitado'
import { GerenciadorFotos } from './FotosOS'
import { PecasServicosOS } from './PecasServicosOS'
import { AgendaChecklistOS } from './AgendaChecklistOS'
import { CartaoLocal, EditorLocal } from './LocalUI'
import { CompromissoGaveta } from '@/pages/agenda/CompromissoGaveta'
import { quando } from '@/pages/agenda/agendaUtil'
import type { Local, StatusOS } from '@/types'

export default function OSDetalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const ordens = useStore((s) => s.ordens)
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const salvar = useStore((s) => s.salvar)
  const usuarios = useStore((s) => s.usuarios)
  const compromissosRaw = useStore((s) => s.compromissos)
  const [editandoLocal, setEditandoLocal] = useState(false)
  const [rascunhoLocal, setRascunhoLocal] = useState<Local | undefined>()
  const [agendando, setAgendando] = useState(false)
  const { mover, dialogo } = useMoverOS()
  const [aba, setAba] = useState('resumo')

  const os = ordens.find((o) => o.id === id)
  const [diag, setDiag] = useState(os?.diagnostico ?? '')
  useEffect(() => { setDiag(os?.diagnostico ?? '') }, [os?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!os) {
    return (
      <Painel>
        <EstadoVazio icone={<Wrench size={32} />} titulo="Ordem de serviço não encontrada" acao={<Button onClick={() => navegar('/os')}>Voltar para as ordens</Button>} />
      </Painel>
    )
  }

  const cliente = porId(clientes, os.clienteId)
  const eq = porId(equipamentos, os.equipamentoId)
  const anteriores = ordens.filter((o) => o.equipamentoId === os.equipamentoId && o.id !== os.id).sort((a, b) => b.abertura.localeCompare(a.abertura))
  const idx = STATUS_ORDEM.indexOf(os.status)
  const campo = os.atendimento === 'campo'
  const agendados = (compromissosRaw ?? []).filter((c) => c.osId === os.id && c.status !== 'cancelado').sort((a, b) => a.inicio.localeCompare(b.inicio))
  const proxAgenda = agendados.find((c) => c.status !== 'concluido') ?? agendados[agendados.length - 1]
  const tecnicoUsuario = usuarios.find((u) => u.nome === os.tecnico)

  const abrirEditorLocal = () => { setRascunhoLocal(os.local); setEditandoLocal(true) }
  const gravarLocal = () => {
    salvar('ordens', {
      ...os, atendimento: 'campo', local: rascunhoLocal ? { ...rascunhoLocal, atualizadoEm: new Date().toISOString() } : undefined,
      historico: [...os.historico, { data: new Date().toISOString(), texto: rascunhoLocal ? 'Local do atendimento atualizado' : 'Local do atendimento removido' }],
    })
    setEditandoLocal(false); toast.sucesso('Local do atendimento salvo')
  }
  const mudarAtendimento = (a: 'oficina' | 'campo') => {
    salvar('ordens', { ...os, atendimento: a })
    if (a === 'campo' && !os.local) abrirEditorLocal()
  }

  const salvarDiag = () => {
    if (diag !== os.diagnostico) {
      salvar('ordens', { ...os, diagnostico: diag, historico: [...os.historico, { data: new Date().toISOString(), texto: 'Diagnóstico atualizado' }] })
      toast.sucesso('Diagnóstico salvo')
    }
  }

  return (
    <>
      <Link to="/os" className="mb-2 inline-flex min-h-10 items-center gap-1 text-sm text-ceu hover:underline"><ArrowLeft size={16} />Ordens de serviço</Link>
      <CabecalhoPagina
        titulo={`OS ${os.numero}`}
        descricao={cliente ? `${cliente.nome} · ${eq ? `${nomeModelo(eq.modeloId, modelos)} ${eq.serial}` : ''}` : undefined}
        acoes={<>{campo && <Selo cor="azul" icone={<MapPin size={12} />}>Campo</Selo>}<SeloStatus tipo="os" status={os.status} /></>}
      />

      <Painel className="mb-4">
        <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Etapas da ordem de serviço">
          {STATUS_ORDEM.map((s, i) => {
            const feito = i < idx
            const atual = i === idx
            return (
              <li key={s} className="min-w-[112px] flex-1">
                <button
                  type="button" onClick={() => mover(os, s as StatusOS)} aria-current={atual ? 'step' : undefined}
                  className={cx('flex min-h-11 w-full items-center justify-center gap-1.5 rounded-campo border px-2 text-center text-xs font-medium transition-colors',
                    atual ? 'border-lavoura bg-lavoura text-white' : feito ? 'border-lavoura/40 bg-lavoura-claro text-lavoura-texto' : 'border-linha text-mata-suave hover:bg-nevoa')}
                >
                  {feito && <Check size={14} />}{ROTULO_COLUNA[s]}
                </button>
              </li>
            )
          })}
        </ol>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-mata-suave">Cliente</p>{cliente ? <Link className="font-medium text-ceu hover:underline" to={`/clientes/${cliente.id}`}>{cliente.nome}</Link> : '-'}</div>
          <div><p className="text-xs text-mata-suave">Drone</p>{eq && cliente ? <Link className="font-medium text-ceu hover:underline" to={`/clientes/${cliente.id}`}>{nomeModelo(eq.modeloId, modelos)} · <span className="serial text-xs">{eq.serial}</span></Link> : '-'}</div>
          <div><p className="text-xs text-mata-suave">Técnico</p><p className="font-medium">{os.tecnico || '-'}</p></div>
          <div><p className="text-xs text-mata-suave">Previsão</p><p className={cx('num font-medium', atrasada(os) && 'text-barro-texto')}>{dataCurta(os.previsao)}{atrasada(os) ? ' (atrasada)' : ''}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {proxAgenda ? (
            <p className="flex items-center gap-1.5"><CalendarPlus size={16} className="text-mata-suave" aria-hidden />Agendado para <span className="font-medium">{quando(proxAgenda.inicio)}</span> com {usuarios.find((u) => u.id === proxAgenda.tecnicoId)?.nome ?? os.tecnico}</p>
          ) : <p className="text-mata-suave">Sem visita agendada.</p>}
          <Button tamanho="sm" variante="secundario" icone={<CalendarPlus size={16} />} onClick={() => setAgendando(true)}>Agendar visita</Button>
          {!campo && <Button tamanho="sm" variante="fantasma" icone={<MapPin size={16} />} onClick={() => mudarAtendimento('campo')}>Atender em campo</Button>}
          {campo && <Button tamanho="sm" variante="fantasma" onClick={() => mudarAtendimento('oficina')}>Voltar para oficina</Button>}
        </div>
        {anteriores.length > 0 && (
          <div className="mt-4 flex gap-2 rounded-campo bg-ambar-claro p-3 text-sm" role="note">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-ambar-texto" />
            <p>
              Este drone já foi atendido {anteriores.length} {anteriores.length === 1 ? 'vez' : 'vezes'}:{' '}
              {anteriores.map((a, i) => (
                <span key={a.id}>{i > 0 && ', '}<Link to={`/os/${a.id}`} className="font-medium text-ceu hover:underline">OS {a.numero}</Link> ({dataCurta(a.abertura)})</span>
              ))}.
            </p>
          </div>
        )}
      </Painel>

      <AgendaChecklistOS os={os} />

      <Abas
        className="mb-4"
        abas={[
          { id: 'resumo', rotulo: 'Resumo' },
          { id: 'pecas', rotulo: 'Peças e serviços', contagem: os.itens.length },
          { id: 'fotos', rotulo: 'Fotos', contagem: os.fotos.length },
          { id: 'relatorio', rotulo: 'Relatório' },
        ]}
        ativa={aba} aoMudar={setAba}
      />

      {aba === 'resumo' && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            {campo && <CartaoLocal local={os.local} aoEditar={abrirEditorLocal} />}
            <Painel titulo="Relato do cliente"><p className="text-sm">{os.relatoCliente || <span className="text-mata-suave">Sem relato registrado.</span>}</p></Painel>
            <Painel titulo="Diagnóstico" acoes={diag !== os.diagnostico && <Button tamanho="sm" onClick={salvarDiag}>Salvar</Button>}>
              <CampoDitado rotulo="Diagnóstico" valor={diag} aoMudar={setDiag} linhas={4} placeholder="O que foi encontrado na bancada? Pode ditar." />
            </Painel>
          </div>
          <div className="space-y-4">
            <Painel titulo="Datas">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-mata-suave">Entrada</dt><dd className="num">{dataCurta(os.abertura)}</dd></div>
                <div className="flex justify-between"><dt className="text-mata-suave">Previsão</dt><dd className="num">{dataCurta(os.previsao)}</dd></div>
                <div className="flex justify-between"><dt className="text-mata-suave">Conclusão</dt><dd className="num">{os.conclusao ? dataCurta(os.conclusao) : '-'}</dd></div>
              </dl>
            </Painel>
            <Painel titulo="Histórico">
              <ol className="space-y-3 border-l border-linha pl-4">
                {[...os.historico].reverse().map((h, i) => (
                  <li key={i} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-lavoura" />
                    <p>{h.texto}</p><p className="num text-xs text-mata-suave">{dataHora(h.data)}</p>
                  </li>
                ))}
              </ol>
            </Painel>
          </div>
        </div>
      )}

      {aba === 'pecas' && <PecasServicosOS os={os} modeloId={eq?.modeloId} />}

      {aba === 'fotos' && <Painel><GerenciadorFotos osId={os.id} /></Painel>}

      {aba === 'relatorio' && (
        <Painel>
          {os.relatorio ? (
            <div className="space-y-3">
              <p className="text-sm text-mata-suave">Gerado em {dataHora(os.relatorio.geradoEm)}</p>
              <p className="text-sm">{os.relatorio.resumo}</p>
              <Button icone={<FileText size={18} />} onClick={() => navegar(`/relatorios/${os.id}`)}>Abrir relatório</Button>
            </div>
          ) : (
            <EstadoVazio
              icone={<FileText size={32} />} titulo="Esta OS ainda não tem relatório"
              texto="Conte o que foi feito, por texto ou voz, e a IA monta o relatório com as fotos nos lugares certos."
              acao={<Button variante="ia" icone={<Sparkles size={18} />} onClick={() => navegar(`/relatorios/${os.id}`)}>Montar relatório</Button>}
            />
          )}
        </Painel>
      )}
      {dialogo}
      <Gaveta
        aberta={editandoLocal} aoFechar={() => setEditandoLocal(false)} titulo="Local do atendimento" largura="md"
        rodape={<><Button variante="secundario" onClick={() => setEditandoLocal(false)}>Cancelar</Button><Button onClick={gravarLocal}>Salvar local</Button></>}
      >
        <EditorLocal valor={rascunhoLocal} aoMudar={setRascunhoLocal} locaisCliente={cliente?.locais} />
      </Gaveta>
      <CompromissoGaveta
        aberta={agendando} aoFechar={() => setAgendando(false)}
        inicial={{ osId: os.id, clienteId: os.clienteId, local: os.local, tecnicoId: tecnicoUsuario?.id, tipo: campo ? 'atendimento_campo' : 'manutencao_oficina', titulo: `${campo ? 'Atendimento' : 'Manutenção'}, OS ${os.numero}` }}
      />
    </>
  )
}
