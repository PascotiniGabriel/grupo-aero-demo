import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FilePlus2, FileText, MessageCircle, Pencil, Plus, QrCode, Receipt, ScrollText, Wallet, Wrench } from 'lucide-react'
import type { Cliente, Equipamento } from '@/types'
import { Avatar, Button, Campo, CabecalhoPagina, EstadoVazio, Gaveta, Indicador, Input, Painel, Select, Selo, toast, cx } from '@/components/ui'
import { useLeitorQR } from '@/components/qr/LeitorQR'
import { useStore, novoId } from '@/store'
import { nomeModelo, totalOrcamento } from '@/store/selectors'
import { brl, dataCurta, numero, relativo } from '@/lib/format'
import { rotuloStatus, statusLancamento } from '@/components/ui'
import { deInput, emAberto, paraInput, totalComprado, vencidoCliente } from './calc'
import { FormCliente } from './FormCliente'
import { LocaisCliente } from './LocaisCliente'

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const cliente = useStore((s) => s.clientes.find((c) => c.id === id))
  if (!cliente) {
    return (
      <>
        <CabecalhoPagina titulo="Cliente" />
        <Painel><EstadoVazio titulo="Cliente não encontrado" acao={<Button onClick={() => navegar('/clientes')}>Voltar para clientes</Button>} /></Painel>
      </>
    )
  }
  return <Detalhe key={cliente.id} cliente={cliente} />
}

function Detalhe({ cliente }: { cliente: Cliente }) {
  const navegar = useNavigate()
  const abrirQR = useLeitorQR((s) => s.abrir)
  const salvar = useStore((s) => s.salvar)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const orcamentos = useStore((s) => s.orcamentos)
  const ordens = useStore((s) => s.ordens)
  const notas = useStore((s) => s.notas)
  const lancamentos = useStore((s) => s.lancamentos)

  const [form, setForm] = useState<Cliente>(cliente)
  const [erro, setErro] = useState('')
  const [drone, setDrone] = useState<Equipamento | null>(null)
  const [droneNovo, setDroneNovo] = useState(false)
  const [erroDrone, setErroDrone] = useState('')

  useEffect(() => setForm(cliente), [cliente])
  const sujo = JSON.stringify(form) !== JSON.stringify(cliente)

  const drones = useMemo(() => equipamentos.filter((e) => e.clienteId === cliente.id), [equipamentos, cliente.id])
  const comprado = totalComprado(cliente.id, notas)
  const aberto = emAberto(cliente.id, lancamentos)
  const vencido = vencidoCliente(cliente.id, lancamentos)
  const orcAbertos = orcamentos.filter((o) => o.clienteId === cliente.id && (o.status === 'rascunho' || o.status === 'enviado'))

  const linha = useMemo(() => {
    const it: { id: string; data: string; icone: typeof FileText; titulo: string; detalhe: string; link: string }[] = []
    for (const o of orcamentos.filter((x) => x.clienteId === cliente.id))
      it.push({ id: o.id, data: o.data, icone: FileText, titulo: `Orçamento ${o.numero}`, detalhe: `${rotuloStatus('orcamento', o.status)} · ${brl(totalOrcamento(o))}`, link: `/orcamentos/${o.id}` })
    for (const o of ordens.filter((x) => x.clienteId === cliente.id)) {
      const e = equipamentos.find((q) => q.id === o.equipamentoId)
      it.push({ id: o.id, data: o.abertura, icone: Wrench, titulo: `OS ${o.numero}${e ? ` · ${nomeModelo(e.modeloId, modelos)}` : ''}`, detalhe: `${rotuloStatus('os', o.status)} · ${o.relatoCliente}`, link: `/os/${o.id}` })
    }
    for (const n of notas.filter((x) => x.clienteId === cliente.id))
      it.push({ id: n.id, data: n.data, icone: Receipt, titulo: `Nota ${n.numero} (${n.modelo})`, detalhe: `${n.natureza} · ${brl(n.valor)}`, link: '/notas' })
    for (const l of lancamentos.filter((x) => x.clienteId === cliente.id && x.tipo === 'receber'))
      it.push({ id: l.id, data: l.pagoEm ?? l.vencimento, icone: Wallet, titulo: l.descricao, detalhe: `${rotuloStatus('lancamento', statusLancamento(l))} · ${brl(l.valor)}`, link: '/financeiro' })
    return it.sort((a, b) => b.data.localeCompare(a.data))
  }, [orcamentos, ordens, notas, lancamentos, equipamentos, modelos, cliente.id])

  const gravarDados = () => {
    if (!form.nome.trim()) { setErro('Informe o nome'); return }
    setErro('')
    salvar('clientes', { ...form, nome: form.nome.trim(), ie: form.tipo === 'PJ' ? form.ie : undefined })
    toast.sucesso('Dados do cliente salvos')
  }

  const abrirNovoDrone = () => {
    setErroDrone(''); setDroneNovo(true)
    setDrone({ id: novoId('eqp'), clienteId: cliente.id, modeloId: modelos[0]?.id ?? 't40', serial: '', apelido: '', horasVoo: 0, hectares: 0, compradoConosco: false })
  }
  const gravarDrone = () => {
    if (!drone) return
    const serial = drone.serial.trim().toUpperCase()
    if (!serial) { setErroDrone('Informe o número de série'); return }
    if (equipamentos.some((e) => e.id !== drone.id && e.serial.toUpperCase() === serial)) { setErroDrone('Já existe um drone com esse número de série'); return }
    salvar('equipamentos', { ...drone, serial, apelido: drone.apelido?.trim() || undefined })
    toast.sucesso(droneNovo ? 'Drone adicionado' : 'Drone atualizado')
    setDrone(null); setDroneNovo(false)
  }
  const lerSerial = () => abrirQR({ titulo: 'Ler serial do drone', aoLer: (codigo) => setDrone((d) => (d ? { ...d, serial: codigo.trim().toUpperCase() } : d)) })

  const garantia = (e: Equipamento) => {
    if (!e.garantiaAte) return null
    const dias = Math.round((new Date(e.garantiaAte).getTime() - Date.now()) / 86400000)
    if (dias < 0) return <Selo cor="vermelho">Garantia vencida em {dataCurta(e.garantiaAte)}</Selo>
    if (dias <= 60) return <Selo cor="ambar">Garantia vence em {dias} {dias === 1 ? 'dia' : 'dias'}</Selo>
    return <Selo cor="verde">Garantia até {dataCurta(e.garantiaAte)}</Selo>
  }

  return (
    <>
      <CabecalhoPagina
        titulo={cliente.nome} descricao={`${cliente.cidade}/${cliente.uf} · cliente desde ${dataCurta(cliente.desde)}`}
        acoes={<>
          <Link to="/clientes" className="inline-flex h-10 items-center gap-1.5 rounded-campo border border-linha bg-papel px-3 text-sm font-medium hover:bg-nevoa"><ArrowLeft size={16} aria-hidden />Clientes</Link>
          <Button variante="secundario" icone={<MessageCircle size={16} />} onClick={() => navegar('/conversas')}>Conversar</Button>
          <Button icone={<FilePlus2 size={16} />} onClick={() => navegar(`/orcamentos/novo?cliente=${cliente.id}`)}>Novo orçamento</Button>
        </>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicador rotulo="Total comprado" valor={brl(comprado)} detalhe="Notas de saída autorizadas" />
        <Indicador rotulo="Em aberto a receber" valor={brl(aberto)} cor={vencido > 0 ? 'vermelho' : undefined} detalhe={vencido > 0 ? `${brl(vencido)} vencido` : 'Nada vencido'} />
        <Indicador rotulo="Orçamentos em aberto" valor={String(orcAbertos.length)} detalhe={orcAbertos.length ? brl(orcAbertos.reduce((s, o) => s + totalOrcamento(o), 0)) : 'Nenhum aguardando'} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Painel
            titulo={`Equipamentos${drones.length ? ` (${drones.length})` : ''}`}
            acoes={<Button tamanho="sm" variante="secundario" icone={<Plus size={16} />} onClick={abrirNovoDrone}>Adicionar drone</Button>}
          >
            {drones.length === 0 ? (
              <EstadoVazio icone={<Wrench size={28} />} titulo="Nenhum drone cadastrado" texto="Adicione o drone para abrir ordens de serviço e orçar peças compatíveis." />
            ) : (
              <ul className="flex flex-col gap-3">
                {drones.map((e) => {
                  const atend = ordens.filter((o) => o.equipamentoId === e.id).length
                  return (
                    <li key={e.id} className="rounded-painel border border-linha p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{nomeModelo(e.modeloId, modelos)}{e.apelido ? ` · ${e.apelido}` : ''}</p>
                          <p className="serial text-xs text-mata-suave">{e.serial}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">{e.compradoConosco && <Selo cor="azul">Comprado conosco</Selo>}{garantia(e)}</div>
                      </div>
                      <p className="num mt-2 text-sm text-mata-suave">{numero(e.horasVoo)} h de voo · {numero(e.hectares)} ha · {atend} {atend === 1 ? 'atendimento' : 'atendimentos'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button tamanho="sm" variante="secundario" icone={<Wrench size={16} />} onClick={() => navegar(`/os?novo=${e.id}`)}>Abrir OS</Button>
                        <Button tamanho="sm" variante="fantasma" icone={<Pencil size={16} />} onClick={() => { setErroDrone(''); setDroneNovo(false); setDrone({ ...e }) }}>Editar</Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Painel>

          <LocaisCliente cliente={cliente} />

          <Painel titulo="Histórico">
            {linha.length === 0 ? (
              <EstadoVazio icone={<ScrollText size={28} />} titulo="Sem movimentação ainda" texto="Orçamentos, ordens de serviço, notas e cobranças deste cliente aparecem aqui." />
            ) : (
              <ol className="relative ml-2 border-l border-linha">
                {linha.map((i) => (
                  <li key={`${i.id}-${i.titulo}`} className="relative pb-4 pl-5 last:pb-0">
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-papel bg-lavoura" aria-hidden />
                    <Link to={i.link} className="group block">
                      <p className="flex items-center gap-2 text-sm font-medium group-hover:text-ceu"><i.icone size={14} className="text-mata-suave" aria-hidden />{i.titulo}</p>
                      <p className="text-xs text-mata-suave">{dataCurta(i.data)} ({relativo(i.data)}) · {i.detalhe}</p>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Painel>
        </div>

        <Painel titulo="Dados do cliente" acoes={<Avatar nome={cliente.nome} tamanho={32} />}>
          <FormCliente valor={form} aoMudar={(p) => setForm((f) => ({ ...f, ...p }))} erros={erro ? { nome: erro } : undefined} />
          <div className="mt-4 flex justify-end gap-2">
            {sujo && <Button variante="fantasma" onClick={() => { setForm(cliente); setErro('') }}>Descartar</Button>}
            <Button disabled={!sujo} onClick={gravarDados}>Salvar alterações</Button>
          </div>
        </Painel>
      </div>

      <Gaveta
        aberta={!!drone} aoFechar={() => { setDrone(null); setDroneNovo(false) }} titulo={droneNovo ? 'Adicionar drone' : 'Editar drone'}
        rodape={<><Button variante="secundario" onClick={() => { setDrone(null); setDroneNovo(false) }}>Cancelar</Button><Button onClick={gravarDrone}>{droneNovo ? 'Adicionar drone' : 'Salvar'}</Button></>}
      >
        {drone && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Modelo" obrigatorio>
              <Select value={drone.modeloId} onChange={(e) => setDrone({ ...drone, modeloId: e.target.value })}>
                {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome} · tanque de {m.tanqueL} L</option>)}
              </Select>
            </Campo>
            <Campo rotulo="Apelido"><Input value={drone.apelido ?? ''} onChange={(e) => setDrone({ ...drone, apelido: e.target.value })} placeholder="Ex.: Drone da safra" /></Campo>
            <div className="sm:col-span-2">
              <Campo rotulo="Número de série" obrigatorio erro={erroDrone}>
                <Input className="serial uppercase" value={drone.serial} onChange={(e) => setDrone({ ...drone, serial: e.target.value })} />
              </Campo>
              <Button tamanho="sm" variante="secundario" icone={<QrCode size={16} />} onClick={lerSerial} className="mt-2">Ler serial por QR code</Button>
            </div>
            <Campo rotulo="Horas de voo"><Input type="number" inputMode="numeric" min={0} className="num" value={drone.horasVoo} onChange={(e) => setDrone({ ...drone, horasVoo: Math.max(0, parseFloat(e.target.value) || 0) })} /></Campo>
            <Campo rotulo="Hectares aplicados"><Input type="number" inputMode="numeric" min={0} className="num" value={drone.hectares} onChange={(e) => setDrone({ ...drone, hectares: Math.max(0, parseFloat(e.target.value) || 0) })} /></Campo>
            <Campo rotulo="Data da compra"><Input type="date" value={paraInput(drone.dataCompra)} onChange={(e) => setDrone({ ...drone, dataCompra: deInput(e.target.value) })} /></Campo>
            <Campo rotulo="Garantia até"><Input type="date" value={paraInput(drone.garantiaAte)} onChange={(e) => setDrone({ ...drone, garantiaAte: deInput(e.target.value) })} /></Campo>
            <label className={cx('flex min-h-10 items-center gap-2 text-sm sm:col-span-2')}>
              <input type="checkbox" className="h-5 w-5 accent-lavoura" checked={drone.compradoConosco} onChange={(e) => setDrone({ ...drone, compradoConosco: e.target.checked })} />
              Comprado conosco
            </label>
          </div>
        )}
      </Gaveta>
    </>
  )
}
