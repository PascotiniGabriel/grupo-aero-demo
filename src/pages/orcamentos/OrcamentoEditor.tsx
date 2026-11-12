import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Copy, MessageCircle, Printer, Save, Send, Trash2, UserPlus, X } from 'lucide-react'
import type { Cliente, ItemComercial, Orcamento, StatusOrcamento } from '@/types'
import {
  Button, Campo, CabecalhoPagina, Confirmar, EstadoVazio, IconButton, Input, Modal, Painel, Select, SeloIA, SeloStatus, Textarea, cx, toast,
} from '@/components/ui'
import { AIComposer } from '@/components/ia/AIComposer'
import { AIPensando } from '@/components/ia/AIPensando'
import { localizarCodigo, useLeitorQR } from '@/components/qr/LeitorQR'
import { useStore, novoId } from '@/store'
import { nomeModelo, pesoItens, totalItens } from '@/store/selectors'
import { brl, dataCurta, peso } from '@/lib/format'
import { diasAFrente } from '@/data/seed'
import {
  compativel, interpretarPedido, interpretarSimulado, itemDeProduto, itemDeServico, novoIdItem, type OpcaoItem, type PedidoInterpretado,
} from '@/lib/ai/orcamento'
import { BuscaItem, FORMAS_PAGAMENTO, PRAZOS_ENTREGA, Proposta, SeletorCliente, deInput, paraInput, rotuloEquipamento } from './comum'

const SUGESTOES = [
  'Orçamento para a Fazenda Boa Esperança: 2 pares de hélice do T40, 1 bomba, troca de motor e revisão geral. Frete por conta do cliente.',
  'Fazenda Santa Luzia: um par de hélices do T25, uma bateria DB800 e calibração de bússola. Desconto de 5%.',
  '4 bicos centrífugos, 2 filtros do tanque e limpeza do sistema de pulverização para a Cooperativa Campos do Sul.',
]
const ETAPAS_IA = ['Entendendo o pedido', 'Procurando as peças no estoque', 'Conferindo a compatibilidade com o drone', 'Montando o orçamento']

interface Pendente { id: string; texto: string }

interface Rascunho {
  clienteId: string
  equipamentoId: string
  itens: ItemComercial[]
  descontoTipo: 'valor' | 'pct'
  descontoEntrada: number
  frete: number
  formaPagamento: string
  prazoEntrega: string
  validade: string
  vendedor: string
  observacoes: string
  criadoPorIA: boolean
}

export default function OrcamentoEditor() {
  const { id } = useParams()
  return <Editor key={id ?? 'novo'} id={id} />
}

function Editor({ id }: { id?: string }) {
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const abrirQR = useLeitorQR((s) => s.abrir)

  const produtos = useStore((s) => s.produtos)
  const servicos = useStore((s) => s.servicos)
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const usuarios = useStore((s) => s.usuarios)
  const leads = useStore((s) => s.leads)
  const empresa = useStore((s) => s.empresa)
  const usuarioAtualId = useStore((s) => s.usuarioAtualId)
  const orcamentos = useStore((s) => s.orcamentos)
  const salvarNaStore = useStore((s) => s.salvar)
  const movimentar = useStore((s) => s.movimentarEstoque)

  const existente = id ? orcamentos.find((o) => o.id === id) : undefined
  const idNovo = useRef(novoId('orc'))
  const numeroProvisorio = useRef(useStore.getState().proximoNumero('orcamento'))
  const dataCriacao = useRef(new Date().toISOString())
  const vendedorPadrao = usuarios.find((u) => u.id === usuarioAtualId)?.nome ?? usuarios[0]?.nome ?? ''

  const [rasc, setRasc] = useState<Rascunho>(() => {
    if (existente) {
      const eqs = equipamentos.filter((e) => e.clienteId === existente.clienteId)
      return {
        clienteId: existente.clienteId, equipamentoId: eqs.length === 1 ? eqs[0].id : '', itens: existente.itens.map((i) => ({ ...i })),
        descontoTipo: 'valor', descontoEntrada: existente.desconto, frete: existente.frete, formaPagamento: existente.formaPagamento,
        prazoEntrega: existente.prazoEntrega, validade: paraInput(existente.validade), vendedor: existente.vendedor,
        observacoes: existente.observacoes, criadoPorIA: !!existente.criadoPorIA,
      }
    }
    return {
      clienteId: '', equipamentoId: '', itens: [], descontoTipo: 'valor', descontoEntrada: 0, frete: 0, formaPagamento: FORMAS_PAGAMENTO[0],
      prazoEntrega: PRAZOS_ENTREGA[1], validade: paraInput(diasAFrente(15)), vendedor: vendedorPadrao,
      observacoes: 'Valores sujeitos a confirmação de estoque. Garantia de 90 dias para peças e serviços.', criadoPorIA: false,
    }
  })
  const [status, setStatus] = useState<StatusOrcamento>(existente?.status ?? 'rascunho')
  const [numero, setNumero] = useState<number | null>(existente?.numero ?? null)
  const [salvoId, setSalvoId] = useState<string | null>(existente?.id ?? null)
  const [texto, setTexto] = useState('')
  const [gerando, setGerando] = useState(false)
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [avisos, setAvisos] = useState<string[]>([])
  const [resumoIA, setResumoIA] = useState('')
  const [leadSemCadastro, setLeadSemCadastro] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<null | 'aprovar' | 'recusar'>(null)
  const [previa, setPrevia] = useState(false)
  const [whats, setWhats] = useState<string | null>(null)

  const atualizar = (p: Partial<Rascunho>) => setRasc((r) => ({ ...r, ...p }))

  /* ------------------------------------------------------------ derivados */
  const cliente = clientes.find((c) => c.id === rasc.clienteId)
  const equipsDoCliente = useMemo(() => equipamentos.filter((e) => e.clienteId === rasc.clienteId), [equipamentos, rasc.clienteId])
  const equipamento = equipsDoCliente.find((e) => e.id === rasc.equipamentoId)
  const modeloId = equipamento?.modeloId
  const subtotal = totalItens(rasc.itens)
  const descontoReais = Math.min(subtotal, rasc.descontoTipo === 'pct' ? Math.round(subtotal * rasc.descontoEntrada) / 100 : rasc.descontoEntrada || 0)
  const total = Math.max(0, subtotal - descontoReais + (rasc.frete || 0))
  const pesoG = pesoItens(rasc.itens, produtos)
  const faltas = useMemo(() => {
    if (status === 'aprovado') return []
    return rasc.itens.flatMap((i) => {
      const p = i.produtoId ? produtos.find((x) => x.id === i.produtoId) : undefined
      return p && p.estoque < i.quantidade ? [{ item: i, disponivel: p.estoque }] : []
    })
  }, [rasc.itens, produtos, status])
  const dadosIA = { produtos, servicos, clientes, equipamentos, modelos }
  const mostrarNumero = numero ?? numeroProvisorio.current

  /* ------------------------------------------------------------ itens */
  const adicionarItem = (novo: ItemComercial) => {
    setRasc((r) => {
      const ex = r.itens.find((i) => (novo.produtoId && i.produtoId === novo.produtoId) || (novo.servicoId && i.servicoId === novo.servicoId))
      return { ...r, itens: ex ? r.itens.map((i) => (i === ex ? { ...i, quantidade: i.quantidade + novo.quantidade } : i)) : [...r.itens, novo] }
    })
  }
  const escolherOpcao = (o: OpcaoItem) => adicionarItem(o.produto ? itemDeProduto(o.produto) : itemDeServico(o.servico!))
  const mudarItem = (itemId: string, p: Partial<ItemComercial>) => setRasc((r) => ({ ...r, itens: r.itens.map((i) => (i.id === itemId ? { ...i, ...p } : i)) }))
  const removerItem = (itemId: string) => setRasc((r) => ({ ...r, itens: r.itens.filter((i) => i.id !== itemId) }))

  const lerQR = () =>
    abrirQR({
      titulo: 'Adicionar peça por QR code',
      aoLer: (codigo) => {
        const res = localizarCodigo(codigo, produtos, equipamentos)
        if (res.tipo === 'produto') { adicionarItem(itemDeProduto(res.produto)); toast.sucesso(`Adicionado: ${res.produto.nome}`) }
        else if (res.tipo === 'equipamento') {
          atualizar({ clienteId: res.equipamento.clienteId, equipamentoId: res.equipamento.id })
          toast.sucesso('Cliente e drone preenchidos pelo serial')
        } else toast.erro('Código não encontrado no cadastro')
      },
    })

  /* ------------------------------------------------------------ IA */
  const aplicar = (r: PedidoInterpretado, origemIA: boolean) => {
    setRasc((prev) => {
      let itens = [...prev.itens]
      for (const novo of r.itens) {
        const ex = itens.find((i) => (novo.produtoId && i.produtoId === novo.produtoId) || (novo.servicoId && i.servicoId === novo.servicoId))
        itens = ex ? itens.map((i) => (i === ex ? { ...i, quantidade: i.quantidade + novo.quantidade } : i)) : [...itens, novo]
      }
      const clienteMudou = !!r.clienteId && r.clienteId !== prev.clienteId
      const obs = r.observacoes && !prev.observacoes.includes(r.observacoes) ? `${prev.observacoes}${prev.observacoes ? ' ' : ''}${r.observacoes}` : prev.observacoes
      return {
        ...prev,
        clienteId: r.clienteId ?? prev.clienteId,
        equipamentoId: r.equipamentoId ?? (clienteMudou ? '' : prev.equipamentoId),
        itens,
        frete: r.frete ?? prev.frete,
        descontoTipo: r.desconto ? 'valor' : prev.descontoTipo,
        descontoEntrada: r.desconto ?? prev.descontoEntrada,
        observacoes: obs,
        criadoPorIA: prev.criadoPorIA || origemIA,
      }
    })
    if (r.naoReconhecidos.length) setPendentes((p) => [...p, ...r.naoReconhecidos.map((t) => ({ id: novoIdItem(), texto: t }))])
    setAvisos(r.avisos)
    const partes = [`${r.itens.length} ${r.itens.length === 1 ? 'item incluído' : 'itens incluídos'}`]
    if (r.clienteId) partes.push(`cliente: ${clientes.find((c) => c.id === r.clienteId)?.nome}`)
    else if (r.clienteTexto) partes.push(`não achei o cliente "${r.clienteTexto}" no cadastro`)
    if (r.naoReconhecidos.length) partes.push(`${r.naoReconhecidos.length} para você escolher`)
    setResumoIA(partes.join(' · '))
  }

  const gerarCom = async (t: string) => {
    if (!t.trim() || gerando) return
    setGerando(true)
    try {
      const r = await interpretarPedido(t, dadosIA, { clienteId: rasc.clienteId || undefined, modeloId })
      aplicar(r, true)
      setTexto('')
    } catch {
      toast.erro('Não consegui montar o orçamento. Tente descrever de outro jeito.')
    } finally {
      setGerando(false)
    }
  }

  /* ------------------------------------------------------------ parâmetros de URL (só em /novo) */
  const iniciou = useRef(false)
  useEffect(() => {
    if (iniciou.current || id) return
    iniciou.current = true
    const cli = params.get('cliente')
    if (cli && clientes.some((c) => c.id === cli)) {
      const eqs = equipamentos.filter((e) => e.clienteId === cli)
      atualizar({ clienteId: cli, equipamentoId: eqs.length === 1 ? eqs[0].id : '' })
    }
    const add = params.get('add')
    const prod = add ? produtos.find((p) => p.id === add) : undefined
    if (prod) adicionarItem(itemDeProduto(prod))
    const lead = leads.find((l) => l.id === params.get('lead'))
    if (lead) {
      const achado = clientes.find((c) => c.nome.toLowerCase() === lead.nome.toLowerCase())
      const r = interpretarSimulado(lead.interesse, dadosIA)
      const nota = `Contato do funil: ${lead.nome} (${lead.cidade}/${lead.uf}), interesse: ${lead.interesse}.`
      setRasc((p) => ({
        ...p, clienteId: achado?.id ?? p.clienteId, vendedor: usuarios.find((u) => u.nome === lead.responsavel)?.nome ?? p.vendedor,
        itens: [...p.itens, ...r.itens], observacoes: `${p.observacoes} ${nota}`.trim(),
      }))
      if (!achado) setLeadSemCadastro(lead.id)
    }
    const t = params.get('texto')
    if (t) { setTexto(t); void gerarCom(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cadastrarLead = () => {
    const lead = leads.find((l) => l.id === leadSemCadastro)
    if (!lead) return
    const novo: Cliente = {
      id: novoId('cli'), nome: lead.nome, tipo: /^(fazenda|agr|coop|grupo|vin|s[ií]tio|granja|cafeic)/i.test(lead.nome) ? 'PJ' : 'PF', documento: 'Não informado',
      cidade: lead.cidade, uf: lead.uf, endereco: 'Não informado', cep: '', fone: lead.fone, email: '', desde: new Date().toISOString(),
    }
    useStore.getState().salvar('clientes', novo)
    atualizar({ clienteId: novo.id })
    setLeadSemCadastro(null)
    toast.sucesso('Cliente cadastrado a partir do contato')
  }

  /* ------------------------------------------------------------ salvar e ações */
  const montar = (st: StatusOrcamento, num: number): Orcamento => ({
    id: salvoId ?? existente?.id ?? idNovo.current, numero: num, clienteId: rasc.clienteId, data: existente?.data ?? dataCriacao.current,
    validade: deInput(rasc.validade), status: st, itens: rasc.itens, desconto: descontoReais, frete: rasc.frete || 0,
    formaPagamento: rasc.formaPagamento, prazoEntrega: rasc.prazoEntrega, observacoes: rasc.observacoes, vendedor: rasc.vendedor,
    osId: existente?.osId, criadoPorIA: rasc.criadoPorIA || undefined,
  })

  const validar = (): boolean => {
    if (!rasc.clienteId) { toast.erro('Escolha o cliente do orçamento'); return false }
    if (rasc.itens.length === 0) { toast.erro('Adicione ao menos um item'); return false }
    return true
  }

  const persistir = (st: StatusOrcamento, avisar: string | null): Orcamento | null => {
    if (!validar()) return null
    const num = numero ?? useStore.getState().proximoNumero('orcamento')
    const o = montar(st, num)
    salvarNaStore('orcamentos', o)
    setNumero(num); setSalvoId(o.id); setStatus(st)
    if (avisar) toast.sucesso(avisar)
    if (!existente && !id) navegar(`/orcamentos/${o.id}`, { replace: true })
    return o
  }

  const aprovar = () => {
    const o = persistir('aprovado', null)
    if (!o) { setConfirmar(null); return }
    if (status !== 'aprovado') {
      for (const i of o.itens) if (i.produtoId) movimentar({ produtoId: i.produtoId, tipo: 'saida', quantidade: i.quantidade, origem: `Orçamento ${o.numero}`, valorUnit: i.valorUnit })
    }
    toast.sucesso(`Orçamento ${o.numero} aprovado e estoque atualizado`)
    setConfirmar(null)
  }
  const recusar = () => { persistir('recusado', 'Orçamento marcado como recusado'); setConfirmar(null) }

  const duplicar = () => {
    if (!validar()) return
    const num = useStore.getState().proximoNumero('orcamento')
    const copia: Orcamento = {
      ...montar('rascunho', num), id: novoId('orc'), data: new Date().toISOString(), validade: deInput(paraInput(diasAFrente(15))),
      itens: rasc.itens.map((i) => ({ ...i, id: novoIdItem() })), osId: undefined,
    }
    salvarNaStore('orcamentos', copia)
    toast.sucesso(`Orçamento ${num} criado como cópia`)
    navegar(`/orcamentos/${copia.id}`)
  }

  const mensagemWhats = () => {
    const linhas = rasc.itens.map((i) => `• ${i.quantidade}x ${i.descricao} — ${brl(i.quantidade * i.valorUnit)}`)
    return [
      `Olá, ${cliente?.nome ?? ''}! Segue o orçamento nº ${mostrarNumero} do ${empresa.nome}:`, '', ...linhas, '',
      `Subtotal: ${brl(subtotal)}`, ...(descontoReais > 0 ? [`Desconto: -${brl(descontoReais)}`] : []), ...(rasc.frete > 0 ? [`Frete: ${brl(rasc.frete)}`] : []),
      `*Total: ${brl(total)}*`, '', `Pagamento: ${rasc.formaPagamento}`, `Entrega: ${rasc.prazoEntrega}`, `Válido até ${dataCurta(deInput(rasc.validade))}.`, '',
      'Qualquer dúvida é só responder aqui. Posso enviar o PDF da proposta, se preferir.',
    ].join('\n')
  }
  const enviarWhats = () => {
    if (persistir('enviado', null)) { toast.sucesso('Enviado'); setWhats(null) }
  }

  /* ------------------------------------------------------------ render */
  if (id && !existente) {
    return (
      <>
        <CabecalhoPagina titulo="Orçamento" />
        <Painel><EstadoVazio titulo="Orçamento não encontrado" texto="Ele pode ter sido removido." acao={<Button onClick={() => navegar('/orcamentos')}>Voltar para a lista</Button>} /></Painel>
      </>
    )
  }

  const dadosProposta = {
    numero: mostrarNumero, data: existente?.data ?? dataCriacao.current, validade: deInput(rasc.validade), cliente, itens: rasc.itens,
    subtotal, desconto: descontoReais, frete: rasc.frete || 0, total, formaPagamento: rasc.formaPagamento, prazoEntrega: rasc.prazoEntrega,
    observacoes: rasc.observacoes, vendedor: rasc.vendedor,
  }
  const modeloNome = modeloId ? nomeModelo(modeloId, modelos) : ''
  const pronto = !!cliente && rasc.itens.length > 0

  return (
    <>
      <div className="nao-imprimir pb-24 lg:pb-0">
        <CabecalhoPagina
          titulo={numero ? `Orçamento ${numero}` : 'Novo orçamento'}
          descricao={existente ? undefined : 'Descreva o pedido por texto ou voz, ou monte à mão logo abaixo.'}
          acoes={<>
            {numero && <SeloStatus tipo="orcamento" status={status} />}
            {rasc.criadoPorIA && <SeloIA>Montado com IA</SeloIA>}
            <Link to="/orcamentos" className="inline-flex h-10 items-center gap-1.5 rounded-campo border border-linha bg-papel px-3 text-sm font-medium hover:bg-nevoa"><ArrowLeft size={16} aria-hidden />Orçamentos</Link>
          </>}
        />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* IA */}
            <section aria-label="Descreva o orçamento">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="titulo text-base">Descreva o orçamento</h2><SeloIA />
              </div>
              <AIComposer
                valor={texto} aoMudar={setTexto} aoEnviar={() => gerarCom(texto)} carregando={gerando} rotuloEnviar={rasc.itens.length ? 'Acrescentar ao orçamento' : 'Gerar orçamento'}
                placeholder="Escreva ou fale: cliente, peças, serviços, quantidades, frete..." sugestoes={SUGESTOES} linhas={3} enviarComEnter={false}
              />
              <AIPensando ativa={gerando} etapas={ETAPAS_IA} />
              {!gerando && resumoIA && <p className="anim-entrar mt-2 flex items-center gap-2 text-sm text-mata-suave"><Check size={16} className="text-lavoura-texto" aria-hidden />{resumoIA}</p>}
              {avisos.map((a) => (
                <p key={a} className="mt-1 flex items-start gap-2 rounded-campo bg-ambar-claro px-3 py-2 text-sm text-ambar-texto"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />{a}</p>
              ))}
            </section>

            {/* Cliente */}
            <Painel titulo="Cliente e drone">
              <div className="flex flex-col gap-3">
                {leadSemCadastro && (
                  <div className="flex flex-wrap items-center gap-3 rounded-campo bg-ceu-claro px-3 py-2 text-sm">
                    <span className="flex-1">Este contato do funil ainda não é cliente cadastrado.</span>
                    <Button tamanho="sm" variante="secundario" icone={<UserPlus size={16} />} onClick={cadastrarLead}>Cadastrar como cliente</Button>
                  </div>
                )}
                <SeletorCliente clientes={clientes} valor={rasc.clienteId} aoMudar={(v) => atualizar({ clienteId: v, equipamentoId: '' })} />
                {cliente && (
                  <Campo rotulo="Drone do cliente" ajuda={equipsDoCliente.length ? 'A busca de peças passa a priorizar o que serve nesse modelo.' : 'Este cliente não tem drones cadastrados.'}>
                    <Select value={rasc.equipamentoId} onChange={(e) => atualizar({ equipamentoId: e.target.value })} disabled={!equipsDoCliente.length}>
                      <option value="">Sem drone específico</option>
                      {equipsDoCliente.map((e) => <option key={e.id} value={e.id}>{rotuloEquipamento(e, modelos)}</option>)}
                    </Select>
                  </Campo>
                )}
              </div>
            </Painel>

            {/* Itens */}
            <Painel titulo={`Itens${rasc.itens.length ? ` (${rasc.itens.length})` : ''}`}>
              <BuscaItem modeloId={modeloId} produtos={produtos} servicos={servicos} aoEscolher={escolherOpcao} aoLerQR={lerQR} />

              {rasc.itens.length === 0 && pendentes.length === 0 && (
                <p className="mt-4 text-sm text-mata-suave">Nenhum item ainda. Use a descrição acima ou busque uma peça.</p>
              )}

              <ul className="mt-3">
                {pendentes.map((p) => (
                  <li key={p.id} className="anim-entrar mb-2 rounded-campo bg-ambar-claro p-3">
                    <div className="mb-2 flex items-start gap-2 text-sm">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-ambar-texto" aria-hidden />
                      <p className="min-w-0 flex-1 text-ambar-texto">Não encontrei "{p.texto}" — escolher peça</p>
                      <IconButton aria-label="Descartar" icone={<X size={16} />} onClick={() => setPendentes((l) => l.filter((x) => x.id !== p.id))} />
                    </div>
                    <BuscaItem
                      modeloId={modeloId} produtos={produtos} servicos={servicos} placeholder="Buscar a peça ou serviço certo"
                      aoEscolher={(o) => { escolherOpcao(o); setPendentes((l) => l.filter((x) => x.id !== p.id)) }}
                    />
                  </li>
                ))}
                {rasc.itens.map((i) => {
                  const prod = i.produtoId ? produtos.find((x) => x.id === i.produtoId) : undefined
                  const naoServe = prod && modeloId && compativel(prod, modeloId) === false
                  return (
                    <li key={i.id} className="flex flex-col gap-2 border-b border-linha py-3 last:border-b-0 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{i.descricao}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-mata-suave">
                          {i.tipo === 'servico' ? 'Serviço' : i.tipo === 'drone' ? 'Drone' : prod ? `${prod.sku} · ${peso(prod.pesoG * i.quantidade)}` : 'Peça'}
                          {naoServe && <span className="font-medium text-ambar-texto">Não serve no {modeloNome}</span>}
                          {prod && status !== 'aprovado' && prod.estoque < i.quantidade && <span className="font-medium text-barro-texto">Estoque: {prod.estoque}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" inputMode="numeric" min={1} aria-label={`Quantidade de ${i.descricao}`} className="num w-14 text-right sm:w-20" value={i.quantidade}
                          onChange={(e) => mudarItem(i.id, { quantidade: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                          onBlur={() => i.quantidade < 1 && mudarItem(i.id, { quantidade: 1 })}
                        />
                        <span className="text-mata-suave" aria-hidden>×</span>
                        <Input
                          type="number" inputMode="decimal" min={0} step="0.01" aria-label={`Valor unitário de ${i.descricao}`} className="num w-28 text-right" value={i.valorUnit}
                          onChange={(e) => mudarItem(i.id, { valorUnit: Math.max(0, parseFloat(e.target.value) || 0) })}
                        />
                        <span className="num w-20 text-right text-sm font-medium sm:w-24">{brl(i.quantidade * i.valorUnit)}</span>
                        <IconButton aria-label={`Remover ${i.descricao}`} icone={<Trash2 size={16} />} onClick={() => removerItem(i.id)} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Painel>

            {/* Condições */}
            <Painel titulo="Condições">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Forma de pagamento">
                  <Input list="formas-pgto" value={rasc.formaPagamento} onChange={(e) => atualizar({ formaPagamento: e.target.value })} />
                </Campo>
                <Campo rotulo="Prazo de entrega">
                  <Input list="prazos-entrega" value={rasc.prazoEntrega} onChange={(e) => atualizar({ prazoEntrega: e.target.value })} />
                </Campo>
                <Campo rotulo="Validade da proposta">
                  <Input type="date" value={rasc.validade} onChange={(e) => atualizar({ validade: e.target.value })} />
                </Campo>
                <Campo rotulo="Vendedor">
                  <Select value={rasc.vendedor} onChange={(e) => atualizar({ vendedor: e.target.value })}>
                    {!usuarios.some((u) => u.nome === rasc.vendedor) && <option value={rasc.vendedor}>{rasc.vendedor}</option>}
                    {usuarios.map((u) => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                  </Select>
                </Campo>
                <Campo rotulo="Observações" className="sm:col-span-2">
                  <Textarea rows={3} value={rasc.observacoes} onChange={(e) => atualizar({ observacoes: e.target.value })} />
                </Campo>
              </div>
              <datalist id="formas-pgto">{FORMAS_PAGAMENTO.map((f) => <option key={f} value={f} />)}</datalist>
              <datalist id="prazos-entrega">{PRAZOS_ENTREGA.map((f) => <option key={f} value={f} />)}</datalist>
            </Painel>
          </div>

          {/* Resumo */}
          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <Painel titulo="Resumo">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-mata-suave">Subtotal</dt><dd className="num">{brl(subtotal)}</dd></div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-mata-suave">Desconto</dt>
                  <dd className="flex items-center gap-1.5">
                    <Select aria-label="Tipo de desconto" className="w-16" value={rasc.descontoTipo} onChange={(e) => atualizar({ descontoTipo: e.target.value as 'valor' | 'pct', descontoEntrada: 0 })}>
                      <option value="valor">R$</option><option value="pct">%</option>
                    </Select>
                    <Input type="number" inputMode="decimal" min={0} step="0.01" aria-label="Desconto" className="num w-24 text-right" value={rasc.descontoEntrada}
                      onChange={(e) => atualizar({ descontoEntrada: Math.max(0, parseFloat(e.target.value) || 0) })} />
                  </dd>
                </div>
                {descontoReais > 0 && <div className="flex justify-between text-mata-suave"><dt>Desconto aplicado</dt><dd className="num">- {brl(descontoReais)}</dd></div>}
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-mata-suave">Frete</dt>
                  <dd><Input type="number" inputMode="decimal" min={0} step="0.01" aria-label="Frete" className="num w-28 text-right" value={rasc.frete} onChange={(e) => atualizar({ frete: Math.max(0, parseFloat(e.target.value) || 0) })} /></dd>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-t border-linha pt-3">
                  <dt className="font-medium">Total</dt><dd className="titulo num text-2xl">{brl(total)}</dd>
                </div>
                <div className="flex justify-between text-mata-suave"><dt>Peso estimado das peças</dt><dd className="num">{pesoG > 0 ? peso(pesoG) : '-'}</dd></div>
              </dl>

              {faltas.length > 0 && (
                <div className="mt-3 rounded-campo bg-barro-claro p-3 text-sm text-barro-texto" role="alert">
                  <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={16} aria-hidden />Estoque insuficiente</p>
                  <ul className="mt-1 list-disc pl-5">
                    {faltas.map((f) => <li key={f.item.id}>{f.item.descricao}: pedido {f.item.quantidade}, em estoque {f.disponivel}</li>)}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                <Button bloco icone={<Save size={16} />} onClick={() => persistir(status, 'Orçamento salvo')} className="hidden lg:inline-flex">Salvar</Button>
                <Button bloco variante="secundario" icone={<Save size={16} />} onClick={() => persistir(status, 'Orçamento salvo')} className="lg:hidden">Salvar</Button>
                {status !== 'aprovado' && (
                  <Button bloco variante="secundario" icone={<Check size={16} />} disabled={!pronto} onClick={() => setConfirmar('aprovar')}>Aprovar</Button>
                )}
                {(status === 'rascunho' || status === 'recusado' || status === 'expirado') && (
                  <Button bloco variante="secundario" icone={<Send size={16} />} disabled={!pronto} onClick={() => persistir('enviado', 'Marcado como enviado')}>Marcar como enviado</Button>
                )}
                <Button bloco variante="secundario" icone={<MessageCircle size={16} />} disabled={!pronto} onClick={() => setWhats(mensagemWhats())}>Enviar por WhatsApp</Button>
                <Button bloco variante="secundario" icone={<Printer size={16} />} disabled={!pronto} onClick={() => setPrevia(true)}>Imprimir / PDF</Button>
                <div className="flex gap-2">
                  <Button bloco variante="fantasma" icone={<Copy size={16} />} disabled={!pronto} onClick={duplicar}>Duplicar</Button>
                  {status !== 'recusado' && status !== 'aprovado' && <Button bloco variante="fantasma" icone={<X size={16} />} disabled={!pronto} onClick={() => setConfirmar('recusar')}>Recusar</Button>}
                </div>
              </div>
            </Painel>
          </aside>
        </div>

        {/* Rodapé fixo no celular */}
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 border-t border-linha bg-papel px-4 py-2 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-mata-suave">{rasc.itens.length} {rasc.itens.length === 1 ? 'item' : 'itens'}{pesoG > 0 ? ` · ${peso(pesoG)}` : ''}</p>
            <p className={cx('titulo num truncate text-lg', faltas.length > 0 && 'text-barro-texto')}>{brl(total)}</p>
          </div>
          <Button icone={<Save size={16} />} onClick={() => persistir(status, 'Orçamento salvo')}>Salvar</Button>
        </div>

        <Confirmar
          aberto={confirmar === 'aprovar'} titulo={`Aprovar orçamento ${mostrarNumero}?`} rotuloConfirmar="Aprovar e baixar estoque" aoConfirmar={aprovar} aoCancelar={() => setConfirmar(null)}
          texto={`As peças dos itens saem do estoque (origem "Orçamento ${mostrarNumero}").${faltas.length ? ' Atenção: há itens com estoque insuficiente, o estoque ficará zerado nesses itens.' : ''}`}
        />
        <Confirmar aberto={confirmar === 'recusar'} titulo="Marcar como recusado?" texto="O orçamento continua salvo e pode ser duplicado depois." rotuloConfirmar="Recusar" perigo aoConfirmar={recusar} aoCancelar={() => setConfirmar(null)} />

        <Modal
          aberto={previa} aoFechar={() => setPrevia(false)} titulo="Proposta comercial" largura="xl"
          rodape={<><Button variante="secundario" onClick={() => setPrevia(false)}>Fechar</Button><Button icone={<Printer size={16} />} onClick={() => window.print()}>Imprimir / salvar PDF</Button></>}
        >
          <div className="overflow-x-auto rounded-campo border border-linha"><Proposta d={dadosProposta} empresa={empresa} /></div>
        </Modal>

        <Modal
          aberto={whats !== null} aoFechar={() => setWhats(null)} titulo="Enviar por WhatsApp"
          rodape={<><Button variante="secundario" onClick={() => setWhats(null)}>Cancelar</Button><Button icone={<Send size={16} />} onClick={enviarWhats}>Enviar</Button></>}
        >
          <p className="mb-2 text-sm text-mata-suave">Para {cliente?.nome} · {cliente?.fone}. Edite a mensagem se quiser.</p>
          <Textarea rows={14} value={whats ?? ''} onChange={(e) => setWhats(e.target.value)} aria-label="Mensagem" />
        </Modal>
      </div>

      {/* Documento de impressão (só aparece no papel) */}
      <div className="folha-impressao hidden"><Proposta d={dadosProposta} empresa={empresa} /></div>
    </>
  )
}
