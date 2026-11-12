// Assistente IA: responde perguntas do dono sobre estoque, oficina, vendas, financeiro e manutenção.
// Caminho simulado: lógica local real sobre os dados da store (sempre funciona). Caminho Gemini: usa o
// mesmo cálculo como contexto verificado e deixa o modelo redigir; em erro cai no simulado.
import type { Cliente, Dados, Equipamento, OrdemServico, Produto, Usuario } from '@/types'
import { brl, dataCurta, normalizar, numero, peso, relativo } from '../format'
import { saidasPorProduto, totalItens, totalOrcamento } from '@/store/selectors'
import { chamarGemini, esperar, iaReal } from './index'
import { ASSUNTOS_IA, podeAcessar, type Assunto, type Papel } from '../acesso'

export interface LinkResposta { rotulo: string; rota: string }
export interface RespostaAssistente { texto: string; links: LinkResposta[]; fonte: string; continuacoes: string[]; bloqueada?: boolean }
/** Quem está perguntando: define o que o assistente pode responder. Sem contexto, vale o perfil Gestor. */
export interface ContextoIA { papel: Papel; usuario?: Usuario }

let CTX: ContextoIA = { papel: 'Gestor' }
const pode = (a: Assunto) => ASSUNTOS_IA[CTX.papel].has(a)
function comCtx<T>(ctx: ContextoIA | undefined, fn: () => T): T {
  const ant = CTX
  CTX = ctx ?? { papel: 'Gestor' }
  try { return fn() } finally { CTX = ant }
}
export interface MensagemHistorico { papel: 'usuario' | 'ia'; texto: string }

type Intencao =
  | 'saudacao' | 'tecnica' | 'peso' | 'compat_peca' | 'compat_modelo' | 'os_detalhe' | 'orcamento_detalhe'
  | 'mais_vendidas' | 'paradas' | 'estoque_baixo' | 'faturamento' | 'contas' | 'orcamentos' | 'os_abertas'
  | 'servico_mais' | 'modelo_mais' | 'funil' | 'cliente' | 'peca' | 'agenda' | 'notas' | 'fallback'

interface Periodo { ini: Date; fim: Date; rotulo: string; frase: string; tipo: 'mes' | 'dias' | 'ano' | 'semana' | 'dia' }

interface Consulta {
  intencao: Intencao
  q: string
  orig: string
  palavras: string[]
  modelos: string[]
  produtos: Produto[]
  cliente?: Cliente
  equipamento?: Equipamento
  usuario?: Usuario
  periodo?: Periodo
  numero?: number
  topico?: string
}

// ---------------------------------------------------------------- utilidades

const DIA = 86400000
const ts = (iso: string) => new Date(iso).getTime()
const inicioHoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const tokens = (t: string) => normalizar(t).split(/[^a-z0-9]+/).filter(Boolean)
const tem = (q: string, re: RegExp) => re.test(q)
const nomeMod = (id: string, d: Dados) => d.modelos.find((m) => m.id === id)?.nome ?? id.toUpperCase()
const nomesMod = (ids: string[], d: Dados) => (ids.length ? ids.map((i) => nomeMod(i, d)).join(', ') : 'Universal')
const lp = (p: Produto) => `[${p.nome}](/estoque/${p.id})`
const lc = (c: Cliente) => `[${c.nome}](/clientes/${c.id})`
const lo = (o: OrdemServico) => `[OS ${o.numero}](/os/${o.id})`
const un = (n: number) => `${numero(n)} un.`
const plural = (n: number, s: string, p: string) => `${numero(n)} ${n === 1 ? s : p}`
const limparCelula = (s: string) => s.replace(/\|/g, '/')

function tabela(cab: string[], linhas: string[][], direita: number[] = []): string {
  const alin = cab.map((_, i) => (direita.includes(i) ? '---:' : '---'))
  return [`| ${cab.join(' | ')} |`, `| ${alin.join(' | ')} |`, ...linhas.map((l) => `| ${l.map(limparCelula).join(' | ')} |`)].join('\n')
}

function resp(texto: string, extra: Partial<RespostaAssistente> & { fonte: string }): RespostaAssistente {
  return { texto, links: extra.links ?? [], fonte: extra.fonte, continuacoes: (extra.continuacoes ?? []).slice(0, 3) }
}

const ROTULO_OS: Record<string, string> = {
  recebido: 'Recebido', diagnostico: 'Em diagnóstico', aguardando_aprovacao: 'Aguardando aprovação',
  em_manutencao: 'Em manutenção', testes: 'Em testes', pronto: 'Pronto para retirada', entregue: 'Entregue',
}
const ROTULO_ORC: Record<string, string> = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', recusado: 'Recusado', expirado: 'Expirado' }
const ROTULO_ETAPA: Record<string, string> = {
  novo: 'Novo', contato: 'Em contato', demonstracao: 'Demonstração', proposta: 'Proposta', fechado: 'Fechado', perdido: 'Perdido',
}

// ---------------------------------------------------------------- períodos

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function mesInteiro(ano: number, mes: number): Periodo {
  const ini = new Date(ano, mes, 1, 0, 0, 0, 0)
  const fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999)
  const nome = ini.toLocaleDateString('pt-BR', { month: 'long' })
  return { ini, fim, rotulo: nome, frase: `em ${nome}`, tipo: 'mes' }
}

function lerPeriodo(q: string): Periodo | undefined {
  const agora = new Date()
  const h0 = inicioHoje()
  if (tem(q, /\bhoje\b/)) return { ini: h0, fim: agora, rotulo: 'hoje', frase: 'hoje', tipo: 'dia' }
  if (tem(q, /\bontem\b/)) return { ini: new Date(h0.getTime() - DIA), fim: new Date(h0.getTime() - 1), rotulo: 'ontem', frase: 'ontem', tipo: 'dia' }
  if (tem(q, /semana passada|ultima semana/)) {
    const seg = new Date(h0); seg.setDate(h0.getDate() - ((h0.getDay() + 6) % 7) - 7)
    return { ini: seg, fim: new Date(seg.getTime() + 7 * DIA - 1), rotulo: 'semana passada', frase: 'na semana passada', tipo: 'semana' }
  }
  if (tem(q, /\bsemana\b/)) {
    const seg = new Date(h0); seg.setDate(h0.getDate() - ((h0.getDay() + 6) % 7))
    return { ini: seg, fim: agora, rotulo: 'esta semana', frase: 'nesta semana', tipo: 'semana' }
  }
  if (tem(q, /mes passado|mes anterior|ultimo mes/)) return mesInteiro(agora.getFullYear(), agora.getMonth() - 1)
  const dias = /ultimos?\s+(\d{1,3})\s+dias|(\d{1,3})\s+dias/.exec(q)
  if (dias) {
    const n = Number(dias[1] ?? dias[2])
    if (n > 0) return { ini: new Date(h0.getTime() - (n - 1) * DIA), fim: agora, rotulo: `últimos ${n} dias`, frase: `nos últimos ${n} dias`, tipo: 'dias' }
  }
  for (let i = 0; i < 12; i++) {
    if (new RegExp(`\\b${MESES[i]}\\b`).test(q)) {
      const ano = i > agora.getMonth() ? agora.getFullYear() - 1 : agora.getFullYear()
      return mesInteiro(ano, i)
    }
  }
  if (tem(q, /trimestre/)) {
    const m0 = Math.floor(agora.getMonth() / 3) * 3
    return { ini: new Date(agora.getFullYear(), m0, 1), fim: agora, rotulo: 'este trimestre', frase: 'neste trimestre', tipo: 'dias' }
  }
  if (tem(q, /\b(este|esse|neste|nesse|no|do|deste|desse) ano\b|\banual\b|\bno ano\b/)) {
    return { ini: new Date(agora.getFullYear(), 0, 1), fim: agora, rotulo: 'este ano', frase: 'neste ano', tipo: 'ano' }
  }
  if (tem(q, /\bmes\b|\bmensal\b|\bmeses\b/)) {
    const p = mesInteiro(agora.getFullYear(), agora.getMonth())
    return { ...p, frase: `neste mês (${p.rotulo})` }
  }
  return undefined
}

function periodoAnterior(p: Periodo): Periodo {
  if (p.tipo === 'mes') return mesInteiro(p.ini.getFullYear(), p.ini.getMonth() - 1)
  const len = p.fim.getTime() - p.ini.getTime()
  return { ...p, ini: new Date(p.ini.getTime() - len - 1), fim: new Date(p.ini.getTime() - 1), rotulo: 'período anterior', frase: 'no período anterior' }
}

const dentro = (iso: string, p: Periodo) => { const t = ts(iso); return t >= p.ini.getTime() && t <= p.fim.getTime() }

// ---------------------------------------------------------------- entidades

const STOP = new Set(`quanto quantos quantas qual quais que como onde quando tem temos tenho estoque estoques preco precos custa custam valor valores
disponivel disponiveis pecas peca produto produtos item itens mais menos saem sai saida saidas vendem vende vendida vendidas vendido vendidos giro serve servem
compativel compativeis drones pesa pesam peso pesos kg frete uma um uns umas o a os as de do da dos das no na nos nas em para pra pro por pelo pela com sem e ou se
me eu voce ja ainda hoje agora preciso quero queria gostaria saber ver mostre mostra mostrar fale diga lista liste listar sobre ha esta estao tinha restam
sobrou unidades unidade par pares pacote pacotes meu minha meus minhas nosso nossa tudo todos todas esse essa isso este cada pode podem poderia dele dela
deles delas ele ela pois mas ao aos aquela aquele seu sua sao ser foi era vai vao ter fazer faz tenha total somar soma quantidade preciso temos
ficha detalhe detalhes informacao informacoes info qualquer alguma algum ate quase muito pouco tambem so apenas mesmo mes ano dia dias semana`.split(/\s+/))

const SINONIMOS: Record<string, string> = {
  bocal: 'bico', bocais: 'bico', pulverizador: 'bico', aspersor: 'bico', pa: 'helice', pas: 'helice',
  controladora: 'placa', propulsor: 'motor', motores: 'motor', helices: 'helice',
}

const casa = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)))

function palavrasDe(q: string): string[] {
  return tokens(q)
    .filter((t) => !STOP.has(t) && !/^\d+$/.test(t) && !/^t\d+p?$/.test(t) && t.length > 1)
    .map((t) => SINONIMOS[t] ?? t)
}

function acharProdutos(palavras: string[], modelos: string[], q: string, d: Dados): Produto[] {
  const pecas = d.produtos
  // código/SKU citado
  const porCodigo = pecas.filter((p) => {
    const sku = normalizar(p.sku); const cod = normalizar(p.codigoFabricante)
    return (sku.length >= 5 && q.includes(sku)) || (cod.length >= 5 && q.includes(cod))
  })
  if (porCodigo.length) return porCodigo.slice(0, 4)
  if (!palavras.length) return []
  const pontuados = pecas.map((p) => {
    const tk = tokens(p.nome)
    let acertos = 0
    for (const w of palavras) if (tk.some((t) => casa(w, t))) acertos += 1
    return { p, s: acertos / palavras.length, acertos }
  })
  let sel = pontuados.filter((x) => x.s >= 1)
  if (!sel.length && palavras.length >= 2) sel = pontuados.filter((x) => x.s >= 0.5 && x.acertos >= 1)
  if (!sel.length) return []
  const compatM = (p: Produto) => p.modelosCompativeis.some((m) => modelos.includes(m))
  if (modelos.length && !sel.some((x) => compatM(x.p)) && palavras.length >= 2) {
    const parcial = pontuados.filter((x) => x.s >= 0.5 && x.acertos >= 1 && compatM(x.p)).sort((a, b) => b.s - a.s)
    if (parcial.length) sel = parcial
  }
  let lista = sel.map((x) => x.p)
  if (modelos.length) {
    const compat = lista.filter((p) => p.modelosCompativeis.some((m) => modelos.includes(m)))
    if (compat.length) lista = compat
  }
  // palavra que abre o nome da peça tem prioridade ("motor" antes de "ESC do motor")
  const primeiros = lista.filter((p) => palavras.some((w) => casa(w, tokens(p.nome)[0] ?? '')))
  if (primeiros.length) lista = primeiros
  // peças ficam antes dos kits de drone, a menos que a pergunta fale de drone
  lista.sort((a, b) => Number(a.tipo === 'drone') - Number(b.tipo === 'drone'))
  return lista.slice(0, 8)
}

function detectarModelos(q: string, d: Dados): string[] {
  const achados: { id: string; pos: number }[] = []
  for (const m of d.modelos) {
    const nome = normalizar(m.nome)
    const base = nome.endsWith('p') ? `${nome}?` : nome
    const r = new RegExp(`(?:^|[^a-z0-9])${base}(?=$|[^a-z0-9])`).exec(q)
    if (r) achados.push({ id: m.id, pos: r.index })
  }
  return achados.sort((a, b) => a.pos - b.pos).map((a) => a.id)
}

const GENERICAS = new Set(['fazenda', 'granja', 'cooperativa', 'agricola', 'agropecuaria', 'servicos', 'aereos', 'pulverizacao', 'cafes', 'sitio'])
const COMUNS = new Set(['vale', 'serra', 'monte', 'verde', 'santa', 'campos', 'azul', 'prado'])

function detectarCliente(q: string, d: Dados): Cliente | undefined {
  const tk = new Set(tokens(q))
  let melhor: { c: Cliente; s: number } | undefined
  for (const c of d.clientes) {
    const dist = tokens(c.nome).filter((t) => t.length >= 4 && !GENERICAS.has(t))
    const achou = dist.filter((t) => tk.has(t))
    if (!achou.length) continue
    const ok = achou.length >= 2 || dist.length === 1 || achou.some((t) => t.length >= 5 && !COMUNS.has(t))
    if (!ok) continue
    if (!melhor || achou.length > melhor.s) melhor = { c, s: achou.length }
  }
  return melhor?.c
}

function detectarEquipamento(q: string, d: Dados): Equipamento | undefined {
  const toks = tokens(q)
  const modelosNome = new Set(d.modelos.map((m) => normalizar(m.nome)))
  for (const e of d.equipamentos) {
    const serial = normalizar(e.serial)
    if (toks.some((t) => t.length >= 6 && /\d/.test(t) && serial.includes(t))) return e
    const ap = e.apelido ? normalizar(e.apelido) : ''
    if (ap.length >= 5 && !modelosNome.has(ap) && q.includes(ap)) return e
  }
  return undefined
}

function detectarUsuario(q: string, d: Dados): Usuario | undefined {
  const tk = new Set(tokens(q))
  return d.usuarios.find((u) => tk.has(normalizar(u.nome.split(' ')[0])))
}

// ---------------------------------------------------------------- pedido em texto livre (também usado em Conversas)

const NUM_EXTENSO: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, duzia: 12, meia: 6,
}

export interface ItemPedido { produto: Produto; quantidade: number; pacotes?: number; trecho: string }

function lerQuantidade(t: string): number | undefined {
  const m = /^\s*(\d+)\b(?!\s*pol)/.exec(t) ?? /(\d+)\s*(?:un|unid\w*|pares?|pacotes?|pecas?|x)\b/.exec(t) ?? /\bx\s*(\d+)/.exec(t)
  if (m) return Math.max(1, Number(m[1]))
  const w = tokens(t).find((x) => NUM_EXTENSO[x])
  return w ? NUM_EXTENSO[w] : undefined
}

/** Lê um pedido livre ("2 pares de hélice do T40 e 4 bicos") e devolve as peças reconhecidas. */
export function interpretarPedido(texto: string, d: Dados): { itens: ItemPedido[]; naoReconhecidos: string[] } {
  const q = normalizar(texto)
  const globais = detectarModelos(q, d)
  const trechos = q.split(/\s*(?:,|;|\+|\be\b|\bmais\b|\balem de\b|\btambem\b|\?|!|\.\s)\s*/).map((t) => t.trim()).filter(Boolean)
  const brutos: { produto: Produto; qtd: number; explicito: boolean; trecho: string }[] = []
  const naoReconhecidos: string[] = []
  for (const t of trechos) {
    const modelos = detectarModelos(t, d)
    const usar = modelos.length ? modelos : globais
    const palavras = palavrasDe(t)
    if (!palavras.length) {
      // "bico centrífugo, 4 unidades": a quantidade vem no trecho seguinte
      const ult = brutos[brutos.length - 1]
      const n = /^\s*(\d+)\s*(?:un|unid\w*|pecas?|pares?|pacotes?)?\s*$/.exec(t)
      if (ult && !ult.explicito && n) { ult.qtd = Math.max(1, Number(n[1])); ult.explicito = true }
      continue
    }
    const achados = acharProdutos(palavras, usar, t, d).filter((p) => p.tipo !== 'drone' || /drone|kit/.test(t))
    if (!achados.length) { if (/[a-z]{4,}/.test(t)) naoReconhecidos.push(t); continue }
    const qtd = lerQuantidade(t)
    brutos.push({ produto: achados[0], qtd: qtd ?? 1, explicito: qtd !== undefined, trecho: t })
  }
  const itens: ItemPedido[] = brutos.map((b) => {
    const pac = /pacote com (\d+)/.exec(normalizar(b.produto.nome))
    if (pac && !/pacote/.test(b.trecho)) {
      const pacotes = Math.max(1, Math.ceil(b.qtd / Number(pac[1])))
      return { produto: b.produto, quantidade: pacotes, pacotes, trecho: b.trecho }
    }
    return { produto: b.produto, quantidade: b.qtd, trecho: b.trecho }
  })
  return { itens, naoReconhecidos }
}

// ---------------------------------------------------------------- detecção da intenção

function detectar(orig: string, d: Dados): Consulta {
  const q = normalizar(orig)
  const modelos = detectarModelos(q, d)
  const palavras = palavrasDe(q)
  const equipamento = detectarEquipamento(q, d)
  const cliente = equipamento ? d.clientes.find((c) => c.id === equipamento.clienteId) : detectarCliente(q, d)
  const periodo = lerPeriodo(q)
  let usuario = detectarUsuario(q, d)
  if (!usuario && CTX.usuario && tem(q, /\b(minhas?|meus?)\b/)) {
    if (CTX.papel === 'Técnico' && tem(q, /\bos\b|ordens|servic|fila|trabalho|atrasad|abert|manuten/)) usuario = CTX.usuario
    if (CTX.papel === 'Vendas' && tem(q, /orcament|funil|lead|negoc/)) usuario = CTX.usuario
  }
  const produtos = acharProdutos(palavras, modelos, q, d)
  const c: Consulta = { intencao: 'fallback', q, orig, palavras, modelos, produtos, cliente, equipamento, periodo, usuario }
  const nTokens = tokens(q).length
  const ehOS = /\bOS\b/.test(orig) || tem(q, /ordens? de servico|\bordens\b|oficina|manutencoes?\b/)

  // 1. técnica
  const cueTec = /cuidado|cuidar|conserv|armazen|guard|vida util|duracao|durabilidade|checklist|check list|procedimento|passo a passo|o que fazer|como (fazer|faco|proceder|limpar|calibrar|carregar|lavar)|intervalo|periodicidade|a cada quant|quando (fazer|devo|preciso|e )|boas praticas|dica|apos (a |o |cada )?(aplicacao|uso|voo)|depois (de|da|do) (uma |a |o )?(queda|aplicacao|uso|voo)/
  if (tem(q, cueTec)) {
    const t = tem(q, /queda|caiu|bateu|acidente|colisao/) ? 'queda'
      : tem(q, /calibr|bussola|\bimu\b/) ? 'calibracao'
      : tem(q, /bateria|carregar|carga\b/) ? 'bateria'
      : tem(q, /limpeza|limpar|lavar|entupi|pulveriz|bico|tanque|aplicacao/) ? 'limpeza'
      : tem(q, /revisao|revisar|manutencao preventiva|preventiva/) ? 'revisao' : ''
    if (t) return { ...c, intencao: 'tecnica', topico: t }
  }
  // 2. saudação
  if (nTokens <= 7 && (tem(q, /^(oi|ola|opa|bom dia|boa tarde|boa noite|e ai|eai|hey|ajuda|help|menu)\b/) || tem(q, /o que (voce )?(sabe|pode|faz)|como (voce )?(pode )?(me )?(ajudar|funciona)|quem (e )?voce|^ajuda/))) {
    return { ...c, intencao: 'saudacao' }
  }
  // 2b. agenda
  if (tem(q, /\bagenda\b|compromisso|meu dia\b|o que (eu )?tenho (para |pra )?(hoje|amanha)|visitas?\b|atendimentos? de campo/)) return { ...c, intencao: 'agenda' }
  // 3. número de OS / orçamento
  const nOS = /\bos\s*#?\s*(\d{3,4})\b|ordem( de servico)?\s*#?\s*(\d{3,4})\b/.exec(q)
  if (nOS && tem(q, /\b(serve|servem|compativel|compativeis|compatibilidade)\b|pecas/) && !produtos.length) {
    const os = d.ordens.find((o) => o.numero === Number(nOS[1] ?? nOS[3]))
    const eq = os && d.equipamentos.find((e) => e.id === os.equipamentoId)
    if (eq) return { ...c, intencao: 'compat_modelo', modelos: [eq.modeloId], palavras: [], numero: os.numero }
  }
  if (nOS) return { ...c, intencao: 'os_detalhe', numero: Number(nOS[1] ?? nOS[3]) }
  const nOrc = /orcamento\s*(?:n[o]?\.?\s*)?#?(\d{4})\b/.exec(q)
  if (nOrc) return { ...c, intencao: 'orcamento_detalhe', numero: Number(nOrc[1]) }
  // 4. peso / frete
  if (tem(q, /\b(pesa|pesam|peso|pesos|kg|quilos?|frete|cubagem)\b/)) return { ...c, intencao: 'peso' }
  // 5. compatibilidade
  const cueCompat = /\b(serve|servem|servir|compativel|compativeis|compatibilidade|encaixa|encaixam|cabe|cabem|aplica|aplicavel)\b|funciona (no|na|em)|usa(r)? (no|na|em)|(em|para|pra) quais? (drones?|modelos?|equipamentos?)|quais (drones|modelos)/
  if (tem(q, cueCompat)) {
    if (produtos.length) return { ...c, intencao: 'compat_peca' }
    if (modelos.length) return { ...c, intencao: 'compat_modelo' }
  }
  // 6. estoque: ranking, parados, baixo
  const cueMais = /mais (sai|saem|vend|giram?|sa[ií]da|procurad|pedid|popular)|campea|ranking|maior giro|vendem mais|saem mais|top \d|mais vendid|mais sai/
  if (tem(q, cueMais) && !tem(q, /servico|modelo|cliente|drone que/)) return { ...c, intencao: 'mais_vendidas' }
  if (tem(q, /parad|encalhad|sem giro|sem saida|menos (sai|saem|vend|giram|vendid)|nao (sai|saem|vend|giram)|baixo giro|sem movimento|obsolet|dinheiro parado|capital parado/)) {
    return { ...c, intencao: 'paradas' }
  }
  if (tem(q, /estoque (baixo|minimo|critico|acabando|zerad)|abaixo do minimo|o que (eu )?(preciso |devo |tenho que )?(comprar|repor|pedir)|\brepor\b|reposicao|em falta|\bfalta(ndo)?\b|acabou|acabando|zerad|precisa(m)? (de )?(compra|reposicao)|lista de compras?|\bcomprar\b/)) {
    return { ...c, intencao: produtos.length ? 'peca' : 'estoque_baixo' }
  }
  // 7. negócio
  if (tem(q, /notas? (fiscal|fiscais|de entrada)|nota fiscal|\bnfs?(-?e)?\b|\bxml\b|entrada (de|por) nota|recebimento de mercadoria/)) return { ...c, intencao: 'notas' }
  if (tem(q, /orcament|cotac|proposta/) && !tem(q, /lead|funil/)) return { ...c, intencao: 'orcamentos' }
  if (tem(q, /(servico|manutencao|reparo|conserto)s?.*(mais|que mais)|mais (feito|comum|frequente|realizad|executad)|defeito mais|problema mais/)) return { ...c, intencao: 'servico_mais' }
  if (tem(q, /(modelo|drone)s?.*(mais (atendid|aparec|entra|vem|quebr|manutenc|frequent|comum|vend)|que mais)/) || tem(q, /qual (modelo|drone).*mais/)) return { ...c, intencao: 'modelo_mais' }
  if (tem(q, /fatur|receita|\bvendi\b|vendemos|quanto (eu )?(vendi|ganhei|entrou|faturei)|resultado do mes|\brecebi\b|\brecebemos\b|entrada de dinheiro/)) return { ...c, intencao: 'faturamento' }
  if (tem(q, /a receber|a pagar|\bcontas?\b|inadimpl|devendo|me devem|boleto|vencid|vencem|vencendo|pagamento|\breceber\b|\bpagar\b|financeiro|contas/)) return { ...c, intencao: 'contas' }
  if (tem(q, /funil|\bleads?\b|prospect|pipeline|oportunidade|negociac|clientes? em potencial|novos clientes/)) return { ...c, intencao: 'funil' }
  if (ehOS && tem(q, /aberta|andamento|atrasad|pendente|fila|quantas|quais|tecnico|esperando|parad|em manutencao|pronto|prontas|aguardando|status|lista|situacao|abertas/)) return { ...c, intencao: 'os_abertas' }
  if (tem(q, /atrasad/) && !tem(q, /conta|pagar|receber|boleto/)) return { ...c, intencao: 'os_abertas' }
  if (usuario && usuario.papel === 'Técnico') return { ...c, intencao: 'os_abertas' }
  if (modelos.length && tem(q, /drone|kit completo|equipamento novo/) && tem(q, /preco|custa|valor|quanto|vend|estoque/)) {
    const kits = d.produtos.filter((p) => p.tipo === 'drone' && p.modelosCompativeis.some((m) => modelos.includes(m)))
    if (kits.length) return { ...c, intencao: 'peca', produtos: kits }
  }
  // 8. cliente / drone
  if (cliente || equipamento) return { ...c, intencao: 'cliente' }
  // 9. peça
  if (produtos.length) return { ...c, intencao: 'peca' }
  // 10. peças de um modelo
  if (modelos.length && tem(q, /pecas|produtos|itens|catalogo|o que (tem|serve)|compat/)) return { ...c, intencao: 'compat_modelo' }
  return c
}

function ehContinuacao(c: Consulta): boolean {
  const n = tokens(c.q).length
  if (n > 9) return false
  if (tem(c.q, /^(e|e se|e quanto|e o|e a|e do|e da|e no|e na|mas|entao|tambem|agora|e para)\b/)) return true
  if (tem(c.q, /\b(dela|dele|desse|dessa|disso|isso|esse|essa|deles|delas|mesmo|mesma)\b/)) return true
  return c.modelos.length > 0 || !!c.periodo || !!c.cliente || !!c.usuario
}

function mesclar(prev: Consulta, nova: Consulta, d: Dados): Consulta {
  const modelos = nova.modelos.length ? nova.modelos : prev.modelos
  let produtos = nova.produtos.length ? nova.produtos : prev.produtos
  let palavras = nova.palavras.length ? nova.palavras : prev.palavras
  if (!nova.produtos.length && nova.modelos.length && prev.palavras.length) {
    produtos = acharProdutos(prev.palavras, nova.modelos, prev.q, d)
    palavras = prev.palavras
  }
  let intencao = prev.intencao
  // "e o preço dela?" depois de uma lista de peças vira ficha da peça
  if (!nova.produtos.length && tem(nova.q, /preco|custa|valor|estoque|quantos|tem\b/) && prev.produtos.length) intencao = 'peca'
  if (tem(nova.q, /\b(frete|peso|pesa)\b/) && prev.produtos.length) intencao = 'peso'
  return {
    ...prev, intencao, orig: nova.orig, q: nova.q, modelos, produtos, palavras,
    periodo: nova.periodo ?? prev.periodo, cliente: nova.cliente ?? prev.cliente,
    equipamento: nova.equipamento ?? prev.equipamento, usuario: nova.usuario ?? prev.usuario,
  }
}

function resolver(pergunta: string, historico: MensagemHistorico[], d: Dados): Consulta {
  let estado: Consulta | undefined
  const anteriores = historico.filter((m) => m.papel === 'usuario').map((m) => m.texto)
  if (anteriores.length && anteriores[anteriores.length - 1] === pergunta) anteriores.pop()
  for (const t of anteriores.slice(-8)) {
    let c = detectar(t, d)
    if ((c.intencao === 'fallback') && estado && ehContinuacao(c)) c = mesclar(estado, c, d)
    if (c.intencao !== 'fallback' && c.intencao !== 'saudacao') estado = c
  }
  let atual = detectar(pergunta, d)
  if (atual.intencao === 'fallback' && estado && ehContinuacao(atual)) atual = mesclar(estado, atual, d)
  return atual
}

// ---------------------------------------------------------------- respostas

const SUGESTOES_GERAIS = [
  'Quais peças mais saem?', 'O que preciso comprar?', 'Quais OS estão atrasadas?', 'Quanto faturamos este mês?', 'Quais orçamentos aguardam resposta?',
]

function saidasNoPeriodo(d: Dados, ini: Date, fim: Date): Record<string, { qtd: number; valor: number }> {
  const out: Record<string, { qtd: number; valor: number }> = {}
  for (const m of d.movimentacoes) {
    if (m.tipo !== 'saida') continue
    const t = ts(m.data)
    if (t < ini.getTime() || t > fim.getTime()) continue
    const o = out[m.produtoId] ?? { qtd: 0, valor: 0 }
    o.qtd += m.quantidade; o.valor += m.quantidade * m.valorUnit
    out[m.produtoId] = o
  }
  return out
}

const periodoPadrao = (c: Consulta, dias = 90): Periodo => c.periodo
  ?? { ini: new Date(Date.now() - dias * DIA), fim: new Date(), rotulo: `últimos ${dias} dias`, frase: `nos últimos ${dias} dias`, tipo: 'dias' }

function rMaisVendidas(c: Consulta, d: Dados): RespostaAssistente {
  const per = periodoPadrao(c)
  const s = saidasNoPeriodo(d, per.ini, per.fim)
  let lista = d.produtos.filter((p) => p.tipo !== 'drone' && (s[p.id]?.qtd ?? 0) > 0)
  if (c.modelos.length) lista = lista.filter((p) => p.modelosCompativeis.some((m) => c.modelos.includes(m)))
  lista.sort((a, b) => (s[b.id]?.qtd ?? 0) - (s[a.id]?.qtd ?? 0))
  const topo = lista.slice(0, 8)
  const escopo = c.modelos.length ? ` do ${nomesMod(c.modelos, d)}` : ''
  if (!topo.length) {
    return resp(`Não encontrei saídas de peças${escopo} **${per.frase}**.`, { fonte: 'Movimentações de estoque', continuacoes: ['Quais peças estão paradas?', 'O que preciso comprar?'] })
  }
  const total = lista.reduce((a, p) => a + (s[p.id]?.qtd ?? 0), 0)
  const top3 = topo.slice(0, 3).reduce((a, p) => a + (s[p.id]?.qtd ?? 0), 0)
  const vv = pode('faturamento')
  const linhas = topo.map((p, i) => [String(i + 1), lp(p), numero(s[p.id].qtd), ...(vv ? [brl(s[p.id].valor)] : []), un(p.estoque)])
  const texto = `${per.frase[0].toUpperCase()}${per.frase.slice(1)}, as peças${escopo} que mais saíram foram:\n\n${tabela(['#', 'Peça', 'Saídas', ...(vv ? ['Valor vendido'] : []), 'Estoque hoje'], linhas, vv ? [2, 3, 4] : [2, 3])}\n\n`
    + `A líder é **${topo[0].nome}**, com ${plural(s[topo[0].id].qtd, 'unidade', 'unidades')}. As três primeiras somam **${numero(Math.round((top3 / total) * 100))}%** das unidades que saíram.`
  const baixa = topo.filter((p) => p.estoque <= p.estoqueMinimo)
  const alerta = baixa.length ? `\n\nAtenção: ${baixa.map((p) => `**${p.nome}**`).join(', ')} ${baixa.length === 1 ? 'está' : 'estão'} no mínimo ou abaixo dele, apesar do giro alto.` : ''
  const mod = c.modelos.length ? [] : ['E do T50?']
  return resp(texto + alerta, {
    fonte: `Movimentações de estoque (saídas ${per.frase}) e cadastro de peças`,
    links: topo.slice(0, 3).map((p) => ({ rotulo: p.nome, rota: `/estoque/${p.id}` })),
    continuacoes: ['Quais peças estão paradas?', 'O que preciso comprar?', ...mod],
  })
}

function rParadas(c: Consulta, d: Dados): RespostaAssistente {
  const per = periodoPadrao(c)
  const s = saidasNoPeriodo(d, per.ini, per.fim)
  const ultima: Record<string, string> = {}
  for (const m of d.movimentacoes) if (m.tipo === 'saida' && (!ultima[m.produtoId] || m.data > ultima[m.produtoId])) ultima[m.produtoId] = m.data
  let lista = d.produtos.filter((p) => p.tipo !== 'drone' && p.estoque > 0 && !(s[p.id]?.qtd))
  if (c.modelos.length) lista = lista.filter((p) => p.modelosCompativeis.some((m) => c.modelos.includes(m)))
  lista.sort((a, b) => b.estoque * b.custo - a.estoque * a.custo)
  if (!lista.length) return resp(`Nenhuma peça com estoque ficou sem saída **${per.frase}**. O giro está saudável.`, { fonte: 'Movimentações de estoque', continuacoes: ['Quais peças mais saem?'] })
  const capital = lista.reduce((a, p) => a + p.estoque * p.custo, 0)
  const vc = pode('custo_margem')
  const linhas = lista.slice(0, 10).map((p) => [lp(p), un(p.estoque), ultima[p.id] ? relativo(ultima[p.id]) : 'sem saída registrada', ...(vc ? [brl(p.estoque * p.custo)] : [])])
  const texto = `**${plural(lista.length, 'peça sem saída', 'peças sem saída')}** ${per.frase}${vc ? `, com **${brl(capital)}** em estoque parado (a preço de custo)` : ''}:\n\n`
    + `${tabela(['Peça', 'Estoque', 'Última saída', ...(vc ? ['Capital parado'] : [])], linhas, vc ? [1, 3] : [1])}`
    + `${lista.length > 10 ? `\n\nMostrando as 10 de maior valor parado.` : ''}\n\nSugestão: evite repor essas peças e avalie uma condição especial para girar o estoque.`
  return resp(texto, {
    fonte: 'Movimentações de estoque e custo das peças',
    links: lista.slice(0, 3).map((p) => ({ rotulo: p.nome, rota: `/estoque/${p.id}` })),
    continuacoes: ['Quais peças mais saem?', 'O que preciso comprar?'],
  })
}

function rEstoqueBaixo(c: Consulta, d: Dados): RespostaAssistente {
  const s90 = saidasPorProduto(d.movimentacoes, 90)
  let lista = d.produtos.filter((p) => p.tipo !== 'drone' && p.estoque <= p.estoqueMinimo)
  if (c.modelos.length) lista = lista.filter((p) => p.modelosCompativeis.some((m) => c.modelos.includes(m)))
  lista.sort((a, b) => (a.estoque === 0 ? -1 : 0) - (b.estoque === 0 ? -1 : 0) || (s90[b.id] ?? 0) - (s90[a.id] ?? 0))
  const escopo = c.modelos.length ? ` do ${nomesMod(c.modelos, d)}` : ''
  if (!lista.length) return resp(`Nenhuma peça${escopo} está no mínimo ou abaixo dele. Estoque em dia.`, { fonte: 'Cadastro de peças', continuacoes: ['Quais peças mais saem?', 'Quais peças estão paradas?'] })
  let total = 0
  const linhas = lista.map((p) => {
    const giro = (s90[p.id] ?? 0) / 3
    const alvo = Math.max(p.estoqueMinimo * 2, Math.ceil(giro * 2))
    const semGiro = giro === 0 && p.estoque > 0
    const comprar = semGiro ? 0 : Math.max(1, alvo - p.estoque)
    total += comprar * p.custo
    const sit = p.estoque === 0 ? 'Zerado' : p.estoque < p.estoqueMinimo ? 'Abaixo do mínimo' : 'No mínimo'
    return [lp(p), `${numero(p.estoque)} (${sit})`, numero(p.estoqueMinimo), numero(giro, 1), semGiro ? 'sem giro, não repor' : `**${numero(comprar)}**`]
  })
  const zerados = lista.filter((p) => p.estoque === 0).length
  const texto = `${plural(lista.length, 'peça', 'peças')}${escopo} ${lista.length === 1 ? 'está' : 'estão'} no mínimo ou abaixo${zerados ? `, sendo **${zerados} zerada${zerados > 1 ? 's' : ''}**` : ''}. Sugestão de compra, cobrindo cerca de 2 meses de giro:\n\n`
    + `${tabela(['Peça', 'Estoque', 'Mínimo', 'Giro/mês', 'Comprar'], linhas, [2, 3, 4])}\n\n`
    + `${pode('custo_margem') ? `Investimento estimado a preço de custo: **${brl(total)}**. ` : ''}O giro considera as saídas dos últimos 90 dias.`
  return resp(texto, {
    fonte: 'Cadastro de peças (mínimos) e movimentações dos últimos 90 dias',
    links: lista.slice(0, 3).map((p) => ({ rotulo: p.nome, rota: `/estoque/${p.id}` })),
    continuacoes: ['Quais peças mais saem?', 'Quais peças estão paradas?', 'Qual o fornecedor de cada peça?'].slice(0, 2),
  })
}

function fichaPeca(p: Produto, d: Dados, s90: Record<string, number>): string {
  const sit = p.estoque === 0 ? 'zerado' : p.estoque < p.estoqueMinimo ? 'abaixo do mínimo' : p.estoque === p.estoqueMinimo ? 'no mínimo' : 'em dia'
  const dinheiro = pode('preco_venda') || pode('custo_margem')
    ? `- ${[pode('preco_venda') ? `Preço de venda: **${brl(p.preco)}**` : '', pode('custo_margem') ? `custo ${brl(p.custo)}` : ''].filter(Boolean).join(' · ')}\n` : ''
  return `**${lp(p)}** (SKU ${p.sku})\n`
    + `- Estoque: **${un(p.estoque)}**, mínimo ${numero(p.estoqueMinimo)} (${sit})\n`
    + dinheiro
    + `- Localização: ${p.localizacao}${pode('compras_giro') ? ` · fornecedor ${p.fornecedor}` : ''}\n`
    + `- Serve em: ${nomesMod(p.modelosCompativeis, d)}\n`
    + (pode('compras_giro') ? `- Saídas nos últimos 90 dias: ${numero(s90[p.id] ?? 0)}` : `- Peso: ${peso(p.pesoG)}`)
}

function rPeca(c: Consulta, d: Dados): RespostaAssistente {
  const s90 = saidasPorProduto(d.movimentacoes, 90)
  const ps = c.produtos.slice(0, 6)
  const links = ps.slice(0, 3).map((p) => ({ rotulo: p.nome, rota: `/estoque/${p.id}` }))
  const fonte = 'Cadastro de peças e movimentações de estoque'
  const qtdPedida = /\b(\d{1,4})\b/.exec(c.q)
  if (ps.length === 1) {
    const p = ps[0]
    let extra = ''
    if (qtdPedida && Number(qtdPedida[1]) > 0 && !/t\d/.test(qtdPedida[0])) {
      const n = Number(qtdPedida[1])
      extra = p.estoque >= n ? `\n\nPara **${un(n)}**: atende, e ainda sobram ${plural(p.estoque - n, 'unidade', 'unidades')}.` : `\n\nPara **${un(n)}**: **não atende**, faltam ${plural(n - p.estoque, 'unidade', 'unidades')}.`
    }
    return resp(`${fichaPeca(p, d, s90)}${extra}`, { fonte, links, continuacoes: ['Em quais drones serve?', 'Quanto pesa essa peça?', 'O que preciso comprar?'] })
  }
  const verPreco = pode('preco_venda')
  const linhas = ps.map((p) => [lp(p), un(p.estoque), ...(verPreco ? [brl(p.preco)] : []), nomesMod(p.modelosCompativeis, d), p.localizacao])
  const texto = `Encontrei **${plural(c.produtos.length, 'item', 'itens')}** no catálogo:\n\n${tabela(['Peça', 'Estoque', ...(verPreco ? ['Preço'] : []), 'Serve em', 'Local'], linhas, verPreco ? [1, 2] : [1])}`
    + `${c.produtos.length > ps.length ? `\n\nMostrando os ${ps.length} primeiros.` : ''}\n\nDiga o modelo do drone, por exemplo "do T40", para eu filtrar.`
  return resp(texto, { fonte, links, continuacoes: ['Quais peças mais saem?', 'O que preciso comprar?'] })
}

function rCompatPeca(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Catálogo de peças por modelo (compatibilidade)'
  // "o motor do T40 serve no T50?"
  if (c.modelos.length >= 2) {
    const origem = c.modelos[0]; const destino = c.modelos[c.modelos.length - 1]
    const todos = d.produtos.filter((p) => { const t = tokens(p.nome); return c.palavras.every((w) => t.some((x) => casa(w, x))) })
    const doOrigem = todos.filter((p) => p.modelosCompativeis.includes(origem))
    if (doOrigem.length) {
      const p = doOrigem[0]
      const serve = p.modelosCompativeis.includes(destino)
      if (serve) {
        return resp(`**Sim.** ${lp(p)} serve no ${nomeMod(origem, d)} e também no **${nomeMod(destino, d)}**. Compatível com: ${nomesMod(p.modelosCompativeis, d)}.\n\nEstoque: ${un(p.estoque)}${pode('preco_venda') ? ` por ${brl(p.preco)}` : ''}.`, { fonte, links: [{ rotulo: p.nome, rota: `/estoque/${p.id}` }], continuacoes: ['Quanto pesa?', 'Quais peças servem no T50?'] })
      }
      const alt = todos.filter((x) => x.modelosCompativeis.includes(destino))
      const sugest = alt.length ? `\n\nPara o ${nomeMod(destino, d)} use ${alt.slice(0, 2).map((x) => `${lp(x)} (${un(x.estoque)} em estoque${pode('preco_venda') ? `, ${brl(x.preco)}` : ''})`).join(' ou ')}.` : ''
      return resp(`**Não.** ${lp(p)} serve apenas em: ${nomesMod(p.modelosCompativeis, d)}. Ela não é compatível com o ${nomeMod(destino, d)}.${sugest}`, { fonte, links: [{ rotulo: p.nome, rota: `/estoque/${p.id}` }, ...alt.slice(0, 1).map((x) => ({ rotulo: x.nome, rota: `/estoque/${x.id}` }))], continuacoes: [`Quais peças servem no ${nomeMod(destino, d)}?`, 'Qual o estoque dela?'] })
    }
  }
  // um modelo: serve ou não
  if (c.modelos.length === 1) {
    const m = c.modelos[0]
    const ok = c.produtos.filter((p) => p.modelosCompativeis.includes(m) || !p.modelosCompativeis.length)
    if (ok.length) {
      const vp = pode('preco_venda')
      const linhas = ok.slice(0, 6).map((p) => [lp(p), un(p.estoque), ...(vp ? [brl(p.preco)] : [])])
      return resp(`**Sim**, estas peças servem no **${nomeMod(m, d)}**:\n\n${tabela(['Peça', 'Estoque', ...(vp ? ['Preço'] : [])], linhas, vp ? [1, 2] : [1])}`, { fonte, links: ok.slice(0, 3).map((p) => ({ rotulo: p.nome, rota: `/estoque/${p.id}` })), continuacoes: ['Quanto pesa?', `Quais peças mais saem do ${nomeMod(m, d)}?`] })
    }
    const lista = c.produtos.slice(0, 4)
    return resp(`**Não** encontrei essa peça compatível com o ${nomeMod(m, d)}. O que existe no catálogo:\n\n${lista.map((p) => `- ${lp(p)}: serve em ${nomesMod(p.modelosCompativeis, d)}`).join('\n')}`, { fonte, links: lista.slice(0, 2).map((p) => ({ rotulo: p.nome, rota: `/estoque/${p.id}` })), continuacoes: [`Quais peças servem no ${nomeMod(m, d)}?`] })
  }
  // peça -> modelos
  const ps = c.produtos.slice(0, 6)
  const linhas = ps.map((p) => [lp(p), `**${nomesMod(p.modelosCompativeis, d)}**`])
  const universal = ps.some((p) => !p.modelosCompativeis.length)
  return resp(`Compatibilidade encontrada:\n\n${tabela(['Peça', 'Serve em'], linhas)}${universal ? '\n\nItens "Universal" não dependem do modelo do drone.' : ''}`, {
    fonte, links: ps.slice(0, 3).map((p) => ({ rotulo: p.nome, rota: `/estoque/${p.id}` })), continuacoes: ['Qual o estoque dessas peças?', 'Quais peças servem no T40?'],
  })
}

function rCompatModelo(c: Consulta, d: Dados): RespostaAssistente {
  const ids = c.modelos
  const m = ids[0]
  let lista = d.produtos.filter((p) => p.tipo !== 'drone' && p.modelosCompativeis.includes(m))
  if (c.palavras.length) {
    const f = lista.filter((p) => { const t = tokens(p.nome); return c.palavras.every((w) => t.some((x) => casa(w, x))) })
    if (f.length) lista = f
  }
  if (!lista.length) return resp(`Não encontrei peças específicas do **${nomeMod(m, d)}** no catálogo.`, { fonte: 'Catálogo de peças por modelo', continuacoes: SUGESTOES_GERAIS.slice(0, 2) })
  const grupos = new Map<string, Produto[]>()
  for (const p of lista) grupos.set(p.categoria, [...(grupos.get(p.categoria) ?? []), p])
  const blocos = [...grupos.entries()].map(([cat, ps]) => `**${cat}**\n${ps.map((p) => `- ${lp(p)} · ${un(p.estoque)}${pode('preco_venda') ? ` · ${brl(p.preco)}` : ''}`).join('\n')}`)
  const modelo = d.modelos.find((x) => x.id === m)
  const cab = modelo ? ` (${modelo.rotores} rotores, tanque de ${modelo.tanqueL} L)` : ''
  return resp(`O catálogo tem **${plural(lista.length, 'peça', 'peças')}** compatíveis com o **${nomeMod(m, d)}**${cab}:\n\n${blocos.join('\n\n')}`, {
    fonte: 'Catálogo de peças por modelo e estoque',
    links: [{ rotulo: `Catálogo do ${nomeMod(m, d)}`, rota: `/catalogo/${m}` }],
    continuacoes: [`Quais peças mais saem do ${nomeMod(m, d)}?`, `Estoque baixo do ${nomeMod(m, d)}`],
  })
}

function rPeso(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Cadastro de peças (peso e dimensões de embalagem)'
  const { itens } = interpretarPedido(c.orig, d)
  let linhasItens = itens
  if (!linhasItens.length && c.produtos.length) linhasItens = c.produtos.slice(0, 1).map((p) => ({ produto: p, quantidade: 1, trecho: '' }))
  if (!linhasItens.length) {
    return resp('Me diga qual peça (ou lista de peças) e eu calculo o peso, por exemplo: "quanto pesa 2 pares de hélice e 1 bomba do T40?".', { fonte, continuacoes: ['Quanto pesa o tanque do T40?', 'Peso de 2 hélices do T40 e 4 bicos'] })
  }
  const links = linhasItens.slice(0, 3).map((i) => ({ rotulo: i.produto.nome, rota: `/estoque/${i.produto.id}` }))
  if (linhasItens.length === 1 && linhasItens[0].quantidade === 1 && !linhasItens[0].pacotes) {
    const p = linhasItens[0].produto
    const cubado = (p.dimensoesCm.c * p.dimensoesCm.l * p.dimensoesCm.a) / 6000
    return resp(`${lp(p)} pesa **${peso(p.pesoG)}**.\n\nEmbalagem: ${p.dimensoesCm.c} × ${p.dimensoesCm.l} × ${p.dimensoesCm.a} cm. Peso cubado de referência (fator 6.000): ${numero(cubado, cubado < 1 ? 2 : 1)} kg. Para o frete, vale o maior entre peso real e cubado.`, { fonte, links, continuacoes: ['Peso de 2 hélices e 1 bomba do T40', 'Em quais drones serve?'] })
  }
  let total = 0
  const linhas = linhasItens.map((i) => {
    const t = i.produto.pesoG * i.quantidade
    total += t
    const nota = i.pacotes ? `${numero(i.pacotes)} pac.` : numero(i.quantidade)
    return [lp(i.produto), nota, peso(i.produto.pesoG), peso(t)]
  })
  const vol = linhasItens.reduce((a, i) => a + (i.produto.dimensoesCm.c * i.produto.dimensoesCm.l * i.produto.dimensoesCm.a * i.quantidade) / 6000, 0)
  return resp(`Peso do pedido para frete:\n\n${tabela(['Peça', 'Qtd', 'Peso unitário', 'Peso total'], linhas, [1, 2, 3])}\n\nTotal: **${peso(total)}** (peso cubado somado de referência: ${numero(vol, vol < 1 ? 2 : 1)} kg). Para frete, vale o maior entre peso real e cubado.`, {
    fonte, links, continuacoes: ['Quais peças mais saem?', 'O que preciso comprar?'],
  })
}

const emAberto = (o: OrdemServico) => o.status !== 'entregue'
const atrasada = (o: OrdemServico) => emAberto(o) && o.status !== 'pronto' && ts(o.previsao) < inicioHoje().getTime()
const descEquip = (id: string, d: Dados) => {
  const e = d.equipamentos.find((x) => x.id === id)
  return e ? `${nomeMod(e.modeloId, d)}${e.apelido ? ` "${e.apelido}"` : ''}` : '-'
}
const nomeCli = (id: string | undefined, d: Dados) => d.clientes.find((x) => x.id === id)?.nome ?? '-'

function rOSAbertas(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Ordens de serviço'
  let abertas = d.ordens.filter(emAberto)
  const minhas = CTX.papel === 'Técnico' && !c.usuario && !c.cliente && !!CTX.usuario && !tem(c.q, /todas|todos|geral|oficina toda|cada tecnico|por tecnico/)
  const alvo = c.usuario ?? (minhas ? CTX.usuario : undefined)
  if (alvo) abertas = abertas.filter((o) => o.tecnico === alvo.nome)
  if (c.cliente) abertas = abertas.filter((o) => o.clienteId === c.cliente!.id)
  const soAtrasadas = tem(c.q, /atrasad/)
  const base = soAtrasadas ? abertas.filter(atrasada) : abertas
  const escopo = minhas ? ' sob sua responsabilidade' : c.usuario ? ` de ${c.usuario.nome}` : c.cliente ? ` de ${c.cliente.nome}` : ''
  if (!base.length) {
    return resp(soAtrasadas ? `Nenhuma OS${escopo} está atrasada. Todas dentro do prazo.` : `Não há OS em aberto${escopo}.`, { fonte, continuacoes: ['Quais OS estão em aberto?', 'Qual serviço mais feito?'] })
  }
  base.sort((a, b) => ts(a.previsao) - ts(b.previsao))
  const linhas = base.map((o) => {
    const dias = Math.round((inicioHoje().getTime() - ts(o.previsao)) / DIA)
    const prazo = atrasada(o) ? `**atrasada ${dias <= 0 ? 'hoje' : `${plural(dias, 'dia', 'dias')}`}**` : dataCurta(o.previsao)
    return [lo(o), nomeCli(o.clienteId, d), descEquip(o.equipamentoId, d), ROTULO_OS[o.status], prazo, o.tecnico]
  })
  const nAtr = abertas.filter(atrasada).length
  const porTec = new Map<string, number>()
  for (const o of abertas) porTec.set(o.tecnico, (porTec.get(o.tecnico) ?? 0) + 1)
  const resumoTec = [...porTec.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`).join(' · ')
  const intro = soAtrasadas
    ? `**${plural(base.length, 'OS atrasada', 'OS atrasadas')}**${escopo}:`
    : `**${plural(abertas.length, 'OS em aberto', 'OS em aberto')}**${escopo}, ${nAtr ? `sendo **${nAtr}** atrasada${nAtr === 1 ? '' : 's'}` : 'nenhuma atrasada'}:`
  const texto = `${intro}\n\n${tabela(['OS', 'Cliente', 'Drone', 'Etapa', 'Previsão', 'Técnico'], linhas)}\n\n${minhas ? 'Mostrando as suas OS. Pergunte por "todas as OS" para ver a oficina inteira.' : `Por técnico: ${resumoTec || '-'}.`}`
  return resp(texto, {
    fonte, links: base.slice(0, 3).map((o) => ({ rotulo: `OS ${o.numero}`, rota: `/os/${o.id}` })),
    continuacoes: soAtrasadas ? ['Quais OS estão em aberto?', 'Qual modelo mais passa pela oficina?'] : ['Quais OS estão atrasadas?', 'Qual serviço mais feito?', 'Qual modelo mais passa pela oficina?'],
  })
}

function rOSDetalhe(c: Consulta, d: Dados): RespostaAssistente {
  const o = d.ordens.find((x) => x.numero === c.numero)
  if (!o) return resp(`Não encontrei a OS ${c.numero}. Confira o número ou veja a lista em [Ordens de serviço](/os).`, { fonte: 'Ordens de serviço', continuacoes: ['Quais OS estão em aberto?'] })
  const cli = d.clientes.find((x) => x.id === o.clienteId)
  const total = totalItens(o.itens)
  const atr = atrasada(o)
  const texto = `**${lo(o)}**, ${cli ? lc(cli) : '-'}\n`
    + `- Drone: ${descEquip(o.equipamentoId, d)}\n`
    + `- Etapa: **${ROTULO_OS[o.status]}**${atr ? ' (**atrasada**)' : ''}\n`
    + `- Aberta em ${dataCurta(o.abertura)} · previsão ${dataCurta(o.previsao)} · técnico ${o.tecnico}\n`
    + `- Relato do cliente: ${o.relatoCliente}\n`
    + `${o.diagnostico ? `- Diagnóstico: ${o.diagnostico}\n` : ''}`
    + `- Itens: ${numero(o.itens.length)}${pode('orcamentos') ? ` (total ${brl(total)})${o.orcamentoId ? ` · [orçamento vinculado](/orcamentos/${o.orcamentoId})` : ''}` : ''}`
  return resp(texto, { fonte: 'Ordens de serviço', links: [{ rotulo: `Abrir OS ${o.numero}`, rota: `/os/${o.id}` }, ...(cli ? [{ rotulo: cli.nome, rota: `/clientes/${cli.id}` }] : [])], continuacoes: ['Quais OS estão atrasadas?', cli ? `Histórico de ${cli.nome}` : 'Quais OS estão em aberto?'] })
}

function rOrcamentos(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Orçamentos'
  let env = d.orcamentos.filter((o) => o.status === 'enviado')
  if (c.cliente) env = env.filter((o) => o.clienteId === c.cliente!.id)
  if (c.usuario) env = env.filter((o) => o.vendedor === c.usuario!.nome)
  if (!env.length) return resp('Nenhum orçamento aguardando resposta no momento.', { fonte, continuacoes: ['Quanto faturamos este mês?', 'Como está o funil de vendas?'] })
  env.sort((a, b) => ts(a.validade) - ts(b.validade))
  const hoje = inicioHoje().getTime()
  const total = env.reduce((a, o) => a + totalOrcamento(o), 0)
  const linhas = env.map((o) => {
    const dias = Math.round((ts(o.validade) - hoje) / DIA)
    const val = dias < 0 ? `**vencido ${relativo(o.validade)}**` : dias <= 3 ? `**vence ${relativo(o.validade)}**` : dataCurta(o.validade)
    return [`[#${o.numero}](/orcamentos/${o.id})`, nomeCli(o.clienteId, d), dataCurta(o.data), val, brl(totalOrcamento(o)), o.vendedor]
  })
  const venc = env.filter((o) => ts(o.validade) < hoje).length
  const rasc = d.orcamentos.filter((o) => o.status === 'rascunho').length
  const texto = `**${plural(env.length, 'orçamento aguarda', 'orçamentos aguardam')}** resposta, somando **${brl(total)}**:\n\n${tabela(['Nº', 'Cliente', 'Enviado em', 'Validade', 'Valor', 'Vendedor'], linhas, [4])}`
    + `${venc ? `\n\nAtenção: ${plural(venc, 'orçamento está', 'orçamentos estão')} com a validade vencida. Vale cobrar o retorno ou renovar.` : ''}`
    + `${rasc ? `\n\nHá também ${plural(rasc, 'rascunho', 'rascunhos')} ${rasc === 1 ? 'que ainda não foi enviado' : 'que ainda não foram enviados'}.` : ''}`
  return resp(texto, { fonte, links: env.slice(0, 3).map((o) => ({ rotulo: `Orçamento ${o.numero}`, rota: `/orcamentos/${o.id}` })), continuacoes: ['Quanto faturamos este mês?', 'Como está o funil de vendas?'] })
}

function rOrcDetalhe(c: Consulta, d: Dados): RespostaAssistente {
  const o = d.orcamentos.find((x) => x.numero === c.numero)
  if (!o) return resp(`Não encontrei o orçamento ${c.numero}.`, { fonte: 'Orçamentos', continuacoes: ['Quais orçamentos aguardam resposta?'] })
  const cli = d.clientes.find((x) => x.id === o.clienteId)
  const itens = o.itens.map((i) => `- ${numero(i.quantidade)} × ${i.descricao}: ${brl(i.quantidade * i.valorUnit)}`).join('\n')
  const texto = `**[Orçamento ${o.numero}](/orcamentos/${o.id})**, ${cli ? lc(cli) : '-'}\n- Situação: **${ROTULO_ORC[o.status]}** · emitido em ${dataCurta(o.data)} · validade ${dataCurta(o.validade)}\n- Vendedor: ${o.vendedor} · pagamento: ${o.formaPagamento}\n\n${itens}\n\nTotal: **${brl(totalOrcamento(o))}**${o.desconto ? ` (com desconto de ${brl(o.desconto)})` : ''}.`
  return resp(texto, { fonte: 'Orçamentos', links: [{ rotulo: `Abrir orçamento ${o.numero}`, rota: `/orcamentos/${o.id}` }], continuacoes: ['Quais orçamentos aguardam resposta?', cli ? `Histórico de ${cli.nome}` : 'Quanto faturamos este mês?'] })
}

function rContas(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Financeiro (contas a receber e a pagar)'
  const hoje = inicioHoje().getTime()
  const aberto = d.lancamentos.filter((l) => !l.pagoEm && (!c.cliente || l.clienteId === c.cliente.id))
  const venc = (l: { vencimento: string }) => ts(l.vencimento) < hoje
  const queroReceber = tem(c.q, /receber|inadimpl|devendo|me devem|cobrar|cobranca/)
  const queroPagar = tem(c.q, /pagar|fornecedor|despesa/)
  const soVencidas = tem(c.q, /vencid|atrasad/)
  const montar = (tipo: 'receber' | 'pagar') => {
    let l = aberto.filter((x) => x.tipo === tipo)
    const todas = l
    if (soVencidas) l = l.filter(venc)
    l.sort((a, b) => ts(a.vencimento) - ts(b.vencimento))
    return { l, todas }
  }
  const blocos: string[] = []
  const links: LinkResposta[] = []
  for (const tipo of ['receber', 'pagar'] as const) {
    if ((tipo === 'receber' && queroPagar && !queroReceber) || (tipo === 'pagar' && queroReceber && !queroPagar)) continue
    const { l, todas } = montar(tipo)
    const vencidas = todas.filter(venc)
    const somaV = vencidas.reduce((a, x) => a + x.valor, 0)
    const soma = todas.reduce((a, x) => a + x.valor, 0)
    const titulo = tipo === 'receber' ? 'A receber' : 'A pagar'
    if (!l.length) { blocos.push(`**${titulo}:** nada ${soVencidas ? 'vencido' : 'em aberto'}.`); continue }
    const linhas = l.slice(0, 8).map((x) => {
      const v = venc(x) ? `**${relativo(x.vencimento).replace('há ', 'venceu há ')}**` : `vence ${relativo(x.vencimento)}`
      return [x.descricao, brl(x.valor), v]
    })
    blocos.push(`**${titulo}:** ${brl(soma)} em aberto, dos quais **${brl(somaV)}** vencidos (${plural(vencidas.length, 'lançamento', 'lançamentos')}).\n\n${tabela(['Descrição', 'Valor', 'Vencimento'], linhas, [1])}`)
  }
  links.push({ rotulo: 'Abrir financeiro', rota: '/financeiro' })
  if (c.cliente) links.unshift({ rotulo: c.cliente.nome, rota: `/clientes/${c.cliente.id}` })
  const esc = c.cliente ? ` de ${c.cliente.nome}` : ''
  return resp(`Contas${esc}${soVencidas ? ' vencidas' : ''}:\n\n${blocos.join('\n\n')}`, { fonte, links, continuacoes: ['Quanto faturamos este mês?', 'Quais orçamentos aguardam resposta?', 'Qual o faturamento do mês passado?'] })
}

function rFaturamento(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Financeiro (receitas por vencimento) e recebimentos'
  const mesAtual = mesInteiro(new Date().getFullYear(), new Date().getMonth())
  const comparando = tem(c.q, /compar/) && c.periodo?.tipo === 'mes'
  const per: Periodo = c.periodo && !comparando ? c.periodo : { ...mesAtual, frase: 'neste mês' }
  const ant = periodoAnterior(per)
  const soma = (p: Periodo) => {
    const ls = d.lancamentos.filter((l) => l.tipo === 'receber' && dentro(l.vencimento, p))
    const por: Record<string, number> = {}
    for (const l of ls) por[l.categoria] = (por[l.categoria] ?? 0) + l.valor
    const total = ls.reduce((a, l) => a + l.valor, 0)
    const recebido = ls.filter((l) => l.pagoEm).reduce((a, l) => a + l.valor, 0)
    return { total, recebido, por }
  }
  const a = soma(per); const b = soma(ant)
  if (!a.total && !b.total) return resp(`Não há receitas lançadas **${per.frase}** nem no período anterior.`, { fonte, continuacoes: ['Quanto faturamos este mês?', 'Quais contas estão vencidas?'] })
  const delta = b.total ? ((a.total - b.total) / b.total) * 100 : 0
  const nomeAnt = per.tipo === 'mes' ? ant.rotulo : 'período anterior'
  const cats = [...new Set([...Object.keys(a.por), ...Object.keys(b.por)])]
  const linhas = cats.map((k) => [k, brl(a.por[k] ?? 0), brl(b.por[k] ?? 0)])
  linhas.push(['**Total**', `**${brl(a.total)}**`, `**${brl(b.total)}**`])
  const futuro = per.fim.getTime() > Date.now()
  const texto = `O faturamento de **${per.rotulo}** é **${brl(a.total)}**${futuro ? ' (considerando também o que vence até o fim do período)' : ''}: ${brl(a.recebido)} já recebido e ${brl(a.total - a.recebido)} a receber.\n\n`
    + (b.total ? `Contra **${nomeAnt}** (${brl(b.total)}), isso é ${delta >= 0 ? 'um aumento' : 'uma queda'} de **${numero(Math.abs(delta), 1)}%**.${futuro && delta < 0 ? ' Como o período ainda não terminou, a comparação tende a ficar abaixo do final real.' : ''}\n\n` : '')
    + `${tabela(['Origem', per.rotulo, nomeAnt], linhas, [1, 2])}`
  return resp(texto, { fonte, links: [{ rotulo: 'Abrir financeiro', rota: '/financeiro' }], continuacoes: ['Quais contas estão vencidas?', 'Quais orçamentos aguardam resposta?', 'Qual serviço mais feito?'] })
}

function rServicoMais(_c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Ordens de serviço (itens de serviço executados)'
  const mapa = new Map<string, { nome: string; qtd: number; valor: number }>()
  for (const o of d.ordens) for (const i of o.itens) {
    if (i.tipo !== 'servico') continue
    const k = i.servicoId ?? i.descricao
    const cur = mapa.get(k) ?? { nome: i.descricao, qtd: 0, valor: 0 }
    cur.qtd += i.quantidade; cur.valor += i.quantidade * i.valorUnit
    mapa.set(k, cur)
  }
  const lista = [...mapa.values()].sort((a, b) => b.qtd - a.qtd || b.valor - a.valor).slice(0, 6)
  if (!lista.length) return resp('Ainda não há serviços lançados nas ordens de serviço.', { fonte, continuacoes: ['Quais OS estão em aberto?'] })
  const maior = [...mapa.values()].sort((a, b) => b.valor - a.valor)[0]
  const vr = pode('faturamento')
  const texto = `O serviço mais feito na oficina é **${lista[0].nome}**, com ${plural(lista[0].qtd, 'execução', 'execuções')}.\n\n${tabela(['Serviço', 'Vezes', ...(vr ? ['Receita'] : [])], lista.map((s) => [s.nome, numero(s.qtd), ...(vr ? [brl(s.valor)] : [])]), vr ? [1, 2] : [1])}${vr ? `\n\nEm receita, o destaque é **${maior.nome}** (${brl(maior.valor)}).` : ''}`
  return resp(texto, { fonte, links: [{ rotulo: 'Ordens de serviço', rota: '/os' }], continuacoes: ['Qual modelo mais passa pela oficina?', 'Quais OS estão atrasadas?'] })
}

function rModeloMais(c: Consulta, d: Dados): RespostaAssistente {
  const venda = tem(c.q, /vend/)
  const cont = new Map<string, number>()
  if (venda) {
    for (const e of d.equipamentos) if (e.compradoConosco) cont.set(e.modeloId, (cont.get(e.modeloId) ?? 0) + 1)
  } else {
    for (const o of d.ordens) {
      const e = d.equipamentos.find((x) => x.id === o.equipamentoId)
      if (e) cont.set(e.modeloId, (cont.get(e.modeloId) ?? 0) + 1)
    }
  }
  const lista = [...cont.entries()].sort((a, b) => b[1] - a[1])
  if (!lista.length) return resp('Não há dados suficientes para esse comparativo.', { fonte: 'Ordens de serviço e equipamentos', continuacoes: SUGESTOES_GERAIS.slice(0, 2) })
  const total = lista.reduce((a, [, n]) => a + n, 0)
  const rotulo = venda ? 'Drones vendidos por nós' : 'Ordens de serviço'
  const linhas = lista.map(([m, n]) => [nomeMod(m, d), numero(n), `${numero(Math.round((n / total) * 100))}%`, numero(d.equipamentos.filter((e) => e.modeloId === m).length)])
  const texto = `${venda ? 'O modelo que mais vendemos' : 'O modelo mais atendido na oficina'} é o **${nomeMod(lista[0][0], d)}** (${plural(lista[0][1], venda ? 'drone' : 'OS', venda ? 'drones' : 'OS')}, ${numero(Math.round((lista[0][1] / total) * 100))}% do total).\n\n${tabela(['Modelo', rotulo, 'Participação', 'Na base de clientes'], linhas, [1, 2, 3])}`
  return resp(texto, { fonte: venda ? 'Equipamentos cadastrados (comprados conosco)' : 'Ordens de serviço e equipamentos dos clientes', links: [{ rotulo: 'Ordens de serviço', rota: '/os' }], continuacoes: ['Qual serviço mais feito?', 'Quais peças do T40 mais saem?'] })
}

function rFunil(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Funil de vendas'
  let leads = d.leads
  if (c.usuario) leads = leads.filter((l) => l.responsavel === c.usuario!.nome)
  if (!leads.length) return resp('Nenhum lead encontrado.', { fonte, continuacoes: SUGESTOES_GERAIS.slice(0, 2) })
  const etapas = ['novo', 'contato', 'demonstracao', 'proposta', 'fechado', 'perdido'] as const
  const linhas = etapas.map((e) => {
    const ls = leads.filter((l) => l.etapa === e)
    return [ROTULO_ETAPA[e], numero(ls.length), brl(ls.reduce((a, l) => a + l.valorEstimado, 0))]
  })
  const ativos = leads.filter((l) => l.etapa !== 'fechado' && l.etapa !== 'perdido')
  const valorAtivo = ativos.reduce((a, l) => a + l.valorEstimado, 0)
  const hoje = inicioHoje().getTime()
  const atras = ativos.filter((l) => ts(l.proximaData) < hoje)
  const top = [...ativos].sort((a, b) => b.valorEstimado - a.valorEstimado).slice(0, 3)
  const texto = `Há **${plural(ativos.length, 'lead ativo', 'leads ativos')}** no funil${c.usuario ? ` de ${c.usuario.nome}` : ''}, com **${brl(valorAtivo)}** em negociação.\n\n${tabela(['Etapa', 'Leads', 'Valor estimado'], linhas, [1, 2])}\n\n`
    + `Maiores oportunidades: ${top.map((l) => `**${l.nome}** (${brl(l.valorEstimado)}, ${ROTULO_ETAPA[l.etapa].toLowerCase()})`).join('; ')}.`
    + `${atras.length ? `\n\nAtenção: ${plural(atras.length, 'lead está', 'leads estão')} com a próxima ação atrasada.` : ''}`
  return resp(texto, { fonte, links: [{ rotulo: 'Abrir funil', rota: '/funil' }], continuacoes: ['Quais orçamentos aguardam resposta?', 'Quanto faturamos este mês?'] })
}

function rCliente(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Clientes, equipamentos, ordens de serviço, orçamentos e financeiro'
  const cli = c.cliente!
  const eqps = d.equipamentos.filter((e) => e.clienteId === cli.id)
  const hoje = inicioHoje().getTime()
  // ficha de um drone específico
  if (c.equipamento) {
    const e = c.equipamento
    const oss = d.ordens.filter((o) => o.equipamentoId === e.id).sort((a, b) => ts(b.abertura) - ts(a.abertura))
    const gar = e.garantiaAte ? (ts(e.garantiaAte) >= hoje ? `em garantia até ${dataCurta(e.garantiaAte)}` : `garantia vencida em ${dataCurta(e.garantiaAte)}`) : 'sem garantia registrada'
    const hist = oss.length ? oss.map((o) => `- ${lo(o)} (${dataCurta(o.abertura)}): ${o.relatoCliente} · ${ROTULO_OS[o.status].toLowerCase()}`).join('\n') : '- Nenhuma ordem de serviço registrada.'
    const texto = `**${descEquip(e.id, d)}** de ${lc(cli)}\n- Serial: \`${e.serial}\`\n- ${numero(e.horasVoo)} h de voo · ${numero(e.hectares)} ha aplicados\n- ${e.compradoConosco ? `Comprado conosco em ${dataCurta(e.dataCompra)}, ${gar}` : 'Não foi comprado conosco'}\n\nHistórico na oficina:\n${hist}`
    return resp(texto, { fonte, links: [{ rotulo: cli.nome, rota: `/clientes/${cli.id}` }, ...oss.slice(0, 2).map((o) => ({ rotulo: `OS ${o.numero}`, rota: `/os/${o.id}` }))], continuacoes: [`Histórico de ${cli.nome}`, 'Quais OS estão em aberto?'] })
  }
  const oss = d.ordens.filter((o) => o.clienteId === cli.id).sort((a, b) => ts(b.abertura) - ts(a.abertura))
  const orcs = d.orcamentos.filter((o) => o.clienteId === cli.id).sort((a, b) => ts(b.data) - ts(a.data))
  const devido = d.lancamentos.filter((l) => l.tipo === 'receber' && l.clienteId === cli.id && !l.pagoEm)
  const vencido = devido.filter((l) => ts(l.vencimento) < hoje).reduce((a, l) => a + l.valor, 0)
  const abertas = oss.filter(emAberto)
  const linhasE = eqps.map((e) => `- ${descEquip(e.id, d)}, ${numero(e.horasVoo)} h de voo`).join('\n') || '- Nenhum drone cadastrado.'
  const ult = orcs[0]
  const texto = `**${lc(cli)}**, ${cli.cidade}/${cli.uf}, cliente desde ${dataCurta(cli.desde)}.\n\n**Drones**\n${linhasE}\n\n`
    + `**Oficina:** ${plural(oss.length, 'ordem de serviço', 'ordens de serviço')} no histórico${abertas.length ? `, ${plural(abertas.length, 'em aberto', 'em aberto')}: ${abertas.map((o) => `${lo(o)} (${ROTULO_OS[o.status].toLowerCase()})`).join(', ')}` : ', nenhuma em aberto'}.\n`
    + (pode('orcamentos') ? `**Orçamentos:** ${ult ? `o último é o [#${ult.numero}](/orcamentos/${ult.id}), ${ROTULO_ORC[ult.status].toLowerCase()}, ${brl(totalOrcamento(ult))}` : 'nenhum até agora'}.\n` : '')
    + (pode('contas_financeiro') ? `**Financeiro:** ${devido.length ? `${brl(devido.reduce((a, l) => a + l.valor, 0))} em aberto${vencido ? `, dos quais **${brl(vencido)}** vencidos` : ''}` : 'sem pendências'}.` : '')
    + `${cli.observacao ? `\n\nObservação: ${cli.observacao}` : ''}`
  return resp(texto, {
    fonte, links: [{ rotulo: cli.nome, rota: `/clientes/${cli.id}` }, ...abertas.slice(0, 2).map((o) => ({ rotulo: `OS ${o.numero}`, rota: `/os/${o.id}` }))],
    continuacoes: [`Contas a receber de ${cli.nome}`, 'Quais OS estão em aberto?'],
  })
}

// ---------------------------------------------------------------- base técnica

function rTecnica(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Manuais de manutenção e procedimentos da oficina (base de conhecimento)'
  const srv = (id: string) => d.servicos.find((s) => s.id === id)
  const linhaSrv = (id: string) => { const s = srv(id); return s ? `\n\nNa oficina: **${s.nome}**${pode('preco_venda') ? `, ${brl(s.preco)}` : ''} (cerca de ${numero(s.horas, s.horas % 1 ? 1 : 0)} h).` : '' }
  const prod = (slug: string) => d.produtos.find((p) => p.id === `prd-${slug}`)
  const nota = '\n\nConfirme sempre no manual do modelo específico.'
  let texto = ''
  let cont: string[] = []
  const links: LinkResposta[] = []
  switch (c.topico) {
    case 'revisao':
      texto = '**Intervalo de revisão**\n- Revisão geral a cada **100 horas de voo** ou pelo menos uma vez por temporada, o que vier primeiro.\n- Antecipe se houver vibração, queda, ruído diferente nos motores ou aviso de erro recorrente.\n- Itens verificados: motores e hélices, braços e dobradiças, ESCs, bombas e bicos, vedações, radares, conectores e baterias.\n- Depois da revisão, faça calibração e teste de voo com verificação de vazão.'
        + linhaSrv('srv-revisao') + nota
      cont = ['Como calibrar a bússola e o IMU?', 'Quais drones estão perto das 100 horas?']
      links.push({ rotulo: 'Ordens de serviço', rota: '/os' })
      break
    case 'calibracao':
      texto = '**Calibração de bússola e IMU**\n1. Faça em área aberta, longe de estruturas metálicas, cercas, fios e veículos.\n2. **Bússola:** com o drone ligado, siga o roteiro do app (giros horizontal e vertical) até a confirmação.\n3. **IMU:** com o drone em superfície plana, nivelada e parado, execute a calibração e não toque até terminar.\n4. Refaça sempre que o app pedir, depois de trocar motor, braço ou placa, após uma queda e quando mudar de região.\n5. Confirme o resultado e faça um voo curto de teste antes de aplicar.'
        + linhaSrv('srv-calibracao') + nota
      cont = ['Qual o checklist pós-queda?', 'Qual o intervalo de revisão?']
      break
    case 'limpeza': {
      const itens = [prod('filtro-tanque'), prod('kit-vedacao'), prod('bico-t40')].filter((x): x is Produto => !!x)
      texto = '**Limpeza do sistema de pulverização após a aplicação**\n1. Esvazie o tanque e descarte a calda restante conforme a legislação.\n2. Enxágue o tanque e as mangueiras com água limpa e, se o produto for oleoso, água com detergente neutro.\n3. Faça a bomba circular água limpa por alguns minutos e confira a vazão.\n4. Retire e limpe os bicos e o filtro do tanque; não use objetos metálicos nos bicos.\n5. Seque, verifique vedações e o-rings e deixe o tanque destampado para secar.\n6. Registre a limpeza. Resíduo seco é a principal causa de entupimento e de falha de bomba.'
        + (itens.length ? `\n\nReposição no estoque: ${itens.map((p) => `${lp(p)} (${un(p.estoque)})`).join(', ')}.` : '')
        + linhaSrv('srv-limpeza') + nota
      links.push(...itens.slice(0, 2).map((p) => ({ rotulo: p.nome, rota: `/estoque/${p.id}` })))
      cont = ['Quanto pesa o tanque do T40?', 'Qual o intervalo de revisão?']
      break
    }
    case 'bateria':
      texto = '**Cuidados com a bateria**\n- Deixe esfriar antes de carregar e carregue em local ventilado, longe de materiais inflamáveis.\n- Para guardar por mais de alguns dias, mantenha em torno de **40% a 60%** de carga, em local seco e fresco. As baterias inteligentes fazem a descarga automática, mas confira.\n- Não use bateria inchada, com carcaça danificada ou conector queimado. Separe e identifique.\n- Evite descarregar até o fim em campo e não deixe ao sol dentro do veículo.\n- Transporte em maleta rígida e registre os ciclos de cada bateria.'
        + nota
      cont = ['Tem bateria DB1560 em estoque?', 'Qual o checklist pós-queda?']
      break
    case 'queda':
      texto = '**Checklist pós-queda**\n1. Desligue o drone e **retire a bateria** antes de mexer. Se houver inchaço, cheiro ou calor, isole a bateria.\n2. Inspecione hélices, motores (giram livres?), braços e dobradiças, trem de pouso e tanque.\n3. Veja radares, câmera, conectores e cabos; procure trincas e folgas.\n4. Não ligue para testar antes de uma avaliação: a falha pode estar na ESC ou na placa.\n5. Registre fotos do dano e do local para a oficina e para o seguro, se houver.\n6. Depois do reparo: calibração de bússola e IMU e teste de voo com tanque vazio e depois com carga.'
        + linhaSrv('srv-diag-queda') + nota
      cont = ['Como calibrar a bússola e o IMU?', 'Quais OS estão em aberto?']
      break
    default:
      texto = 'Posso orientar sobre revisão, calibração, limpeza do pulverizador, bateria e pós-queda. Qual deles?'
      cont = ['Qual o intervalo de revisão?', 'Como limpar o sistema de pulverização?', 'Cuidados com a bateria']
  }
  return resp(texto, { fonte, links, continuacoes: cont })
}

// ---------------------------------------------------------------- agenda e notas

function rAgenda(c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Agenda dos técnicos'
  const alvo = c.usuario ?? (CTX.papel === 'Técnico' ? CTX.usuario : undefined)
  const h0 = inicioHoje().getTime()
  let ini = h0; let fim = h0 + DIA; let rot = 'hoje'
  if (tem(c.q, /amanha/)) { ini = h0 + DIA; fim = h0 + 2 * DIA; rot = 'amanhã' }
  else if (tem(c.q, /semana|proximos dias/)) { fim = h0 + 7 * DIA; rot = 'nos próximos 7 dias' }
  const lista = d.compromissos
    .filter((x) => (!alvo || x.tecnicoId === alvo.id) && x.status !== 'cancelado' && ts(x.inicio) >= ini && ts(x.inicio) < fim)
    .sort((a, b) => ts(a.inicio) - ts(b.inicio))
  const quem = alvo ? (CTX.papel === 'Técnico' && alvo.id === CTX.usuario?.id ? 'na sua agenda' : `na agenda de ${alvo.nome}`) : 'na agenda dos técnicos'
  const links = [{ rotulo: 'Abrir agenda', rota: '/agenda' }]
  const cont = ['Quais OS estão em aberto?', 'Qual o checklist depois de uma queda?']
  if (!lista.length) return resp(`Nenhum compromisso ${quem} ${rot}.`, { fonte, links, continuacoes: [rot === 'hoje' ? 'Minha agenda de amanhã' : 'Minha agenda de hoje', ...cont] })
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dia = (iso: string) => (rot.startsWith('nos') ? `${dataCurta(iso)} ` : '')
  const linhas = lista.map((x) => [`${dia(x.inicio)}${hora(x.inicio)}`, x.titulo, nomeCli(x.clienteId, d), x.local?.descricao ?? 'Oficina', ...(alvo ? [] : [d.usuarios.find((u) => u.id === x.tecnicoId)?.nome ?? '-'])])
  const texto = `**${plural(lista.length, 'compromisso', 'compromissos')}** ${quem} ${rot}:\n\n${tabela(['Horário', 'Atividade', 'Cliente', 'Local', ...(alvo ? [] : ['Técnico'])], linhas)}`
  return resp(texto, { fonte, links, continuacoes: [rot === 'amanhã' ? 'Minha agenda de hoje' : 'Minha agenda de amanhã', ...cont] })
}

function rNotas(_c: Consulta, d: Dados): RespostaAssistente {
  const fonte = 'Notas fiscais'
  const soEntrada = !pode('faturamento')
  const lista = d.notas.filter((n) => !soEntrada || n.tipo === 'entrada').sort((a, b) => ts(b.data) - ts(a.data)).slice(0, 8)
  if (!lista.length) return resp('Não há notas fiscais de entrada registradas.', { fonte, links: [{ rotulo: 'Abrir notas', rota: '/notas' }] })
  const linhas = lista.map((n) => [`${n.numero}`, n.tipo === 'entrada' ? 'Entrada' : 'Saída', n.tipo === 'entrada' ? (n.emitente ?? '-') : nomeCli(n.clienteId, d), dataCurta(n.data), n.status, brl(n.valor)])
  return resp(`Últimas notas fiscais${soEntrada ? ' de entrada' : ''}:\n\n${tabela(['Nº', 'Tipo', 'Origem / cliente', 'Data', 'Situação', 'Valor'], linhas, [5])}`, {
    fonte, links: [{ rotulo: 'Abrir notas', rota: '/notas' }], continuacoes: ['O que preciso comprar?', 'Quais peças mais saem?'],
  })
}

// ---------------------------------------------------------------- saudação, fallback e bloqueio por papel

interface PerfilIA { subtitulo: string; ajuda: string[]; sugestoes: string[]; apresentacao: string }

export const PERFIL_IA: Record<Papel, PerfilIA> = {
  Gestor: {
    subtitulo: 'Faça perguntas sobre estoque, peças, oficina, vendas e financeiro.',
    apresentacao: 'o estoque, as OS, os orçamentos, o financeiro e o catálogo de peças',
    ajuda: ['estoque, giro e o que comprar', 'OS, clientes e orçamentos', 'faturamento, contas e funil', 'dúvidas técnicas de manutenção'],
    sugestoes: ['Quais peças mais saem?', 'O que preciso comprar?', 'Quais OS estão atrasadas?', 'Quanto faturamos este mês?', 'Quais orçamentos aguardam resposta?'],
  },
  Vendas: {
    subtitulo: 'Assistente comercial: clientes, orçamentos, funil, preços e peças.',
    apresentacao: 'clientes, orçamentos, funil, preços de venda, estoque disponível e compatibilidade de peças',
    ajuda: ['histórico de clientes e drones', 'orçamentos e funil de vendas', 'preço, estoque e compatibilidade de uma peça', 'peso e frete de um pedido'],
    sugestoes: ['Quais orçamentos aguardam resposta?', 'Como está o funil de vendas?', 'Quanto custa o drone T50?', 'Quanto pesa 2 pares de hélice do T40 e 1 bomba?', 'Em quais drones serve o motor do T40?'],
  },
  Técnico: {
    subtitulo: 'Assistente da oficina: minhas OS, agenda, procedimentos técnicos e peças.',
    apresentacao: 'suas OS, a sua agenda, os procedimentos de manutenção, o estoque e a compatibilidade de peças',
    ajuda: ['minhas OS em aberto e atrasadas', 'minha agenda de hoje e de amanhã', 'checklist pós-queda, revisão de 100 h, limpeza e calibração', 'peças que servem no drone de uma OS e onde estão no estoque'],
    sugestoes: ['Quais são minhas OS em aberto?', 'Qual minha agenda de hoje?', 'Qual o checklist depois de uma queda?', 'Quais peças servem no drone da OS 1039?', 'Onde está a hélice do T40 no estoque?'],
  },
  Estoque: {
    subtitulo: 'Assistente do estoque: giro, compras, entradas e peças.',
    apresentacao: 'estoque, giro, compras, custos, notas de entrada, peças das OS e compatibilidade',
    ajuda: ['peças que mais saem e paradas', 'o que comprar (abaixo do mínimo)', 'notas fiscais de entrada', 'localização, peso e compatibilidade de uma peça'],
    sugestoes: ['O que preciso comprar?', 'Quais peças mais saem?', 'Quais peças estão paradas há mais de 90 dias?', 'Quais notas de entrada chegaram?', 'Quais OS estão aguardando peças?'],
  },
}

const listaAjuda = (p: Papel) => PERFIL_IA[p].ajuda.map((x) => `- ${x}`).join('\n')

function bloqueio(): RespostaAssistente {
  const p = CTX.papel
  return {
    texto: `Essa informação não está disponível no seu perfil (${p}). Posso ajudar com:\n${listaAjuda(p)}`,
    links: [], fonte: `Perfil ${p}`, continuacoes: PERFIL_IA[p].sugestoes.slice(0, 3), bloqueada: true,
  }
}

function rSaudacao(d: Dados): RespostaAssistente {
  const pf = PERFIL_IA[CTX.papel]
  const resumo: string[] = []
  if (pode('compras_giro')) { const n = d.produtos.filter((p) => p.tipo !== 'drone' && p.estoque <= p.estoqueMinimo).length; resumo.push(`**${plural(n, 'peça está', 'peças estão')}** no mínimo ou abaixo`) }
  if (pode('os_oficina')) {
    const meus = CTX.papel === 'Técnico' && CTX.usuario ? CTX.usuario.nome : ''
    const n = d.ordens.filter((o) => atrasada(o) && (!meus || o.tecnico === meus)).length
    resumo.push(n ? `**${plural(n, meus ? 'OS sua está atrasada' : 'OS está atrasada', meus ? 'OS suas estão atrasadas' : 'OS estão atrasadas')}**` : `nenhuma ${meus ? 'OS sua ' : 'OS '}atrasada`)
  }
  if (pode('contas_financeiro')) { const n = d.lancamentos.filter((l) => l.tipo === 'receber' && !l.pagoEm && ts(l.vencimento) < inicioHoje().getTime()).length; resumo.push(n ? `**${plural(n, 'conta a receber vencida', 'contas a receber vencidas')}**` : 'nenhuma conta a receber vencida') }
  if (pode('orcamentos')) { const n = d.orcamentos.filter((o) => o.status === 'enviado').length; resumo.push(`**${plural(n, 'orçamento aguarda', 'orçamentos aguardam')}** resposta`) }
  const texto = `Olá! Sou o assistente do ${d.empresa.nome} para o seu perfil (${CTX.papel}). Eu consulto ${pf.apresentacao}.\n\n`
    + `${resumo.length ? `Para começar: ${resumo.join(', ')}.\n\n` : ''}Pergunte do seu jeito. Posso ajudar com:\n${listaAjuda(CTX.papel)}`
  return resp(texto, { fonte: 'Visão geral dos dados do seu perfil', continuacoes: pf.sugestoes.slice(0, 3) })
}

function rFallback(): RespostaAssistente {
  const pf = PERFIL_IA[CTX.papel]
  return resp(`Não entendi bem essa pergunta, mas posso ajudar com:\n${listaAjuda(CTX.papel)}\n\nTente reformular citando o nome da peça, do cliente, da OS ou do modelo.`, {
    fonte: 'Capacidades do assistente', continuacoes: pf.sugestoes.slice(0, 3),
  })
}

// ---------------------------------------------------------------- permissão por assunto

const ASSUNTO_BASE: Record<Intencao, Assunto | null> = {
  saudacao: null, fallback: null, tecnica: 'tecnico_manutencao', peso: 'peso_frete', compat_peca: 'compatibilidade', compat_modelo: 'compatibilidade',
  os_detalhe: 'os_oficina', os_abertas: 'os_oficina', servico_mais: 'os_oficina', modelo_mais: 'os_oficina',
  orcamento_detalhe: 'orcamentos', orcamentos: 'orcamentos', mais_vendidas: 'compras_giro', paradas: 'compras_giro', estoque_baixo: 'compras_giro',
  faturamento: 'faturamento', contas: 'contas_financeiro', funil: 'funil', cliente: 'clientes_historico', peca: 'estoque_quantidade',
  agenda: 'agenda_tecnico', notas: 'entradas_nf',
}
const CUE_CUSTO = /\bcustos?\b|margem|lucro|markup|preco de (compra|custo)|quanto (pagamos|paguei|pagou)/
const CUE_PRECO = /\bprecos?\b|\bcustam?\b|\bvalor(es)?\b|quanto (e|sai|fica|cobra|cobramos)|tabela de preco/

/** Primeiro assunto exigido pela pergunta que o papel atual não pode ver (ou undefined se tudo liberado). */
function assuntoBloqueado(c: Consulta): Assunto | undefined {
  if (c.intencao === 'saudacao') return undefined
  if (tem(c.q, CUE_CUSTO) && !pode('custo_margem')) return 'custo_margem'
  const base = c.intencao === 'modelo_mais' && tem(c.q, /vend/) ? 'funil' : ASSUNTO_BASE[c.intencao]
  if (tem(c.q, CUE_PRECO) && (c.intencao === 'peca' || c.intencao === 'compat_peca' || c.intencao === 'compat_modelo' || (c.intencao === 'fallback' && c.produtos.length)) && !pode('preco_venda')) return 'preco_venda'
  if (!base || pode(base)) return undefined
  if (base === 'os_oficina' && pode('os_status_cliente') && (c.cliente || c.intencao === 'os_detalhe')) return undefined
  if (base === 'clientes_historico' && pode('historico_tecnico')) return undefined
  return base
}

function limparResposta(r: RespostaAssistente, d: Dados): RespostaAssistente {
  const p = CTX.papel
  const texto = r.texto.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (m, t: string, rota: string) => (podeAcessar(p, rota) ? m : t))
  const links = r.links.filter((l) => podeAcessar(p, l.rota))
  const cont = r.continuacoes.filter((t) => !assuntoBloqueado(detectar(t, d)))
  for (const s of PERFIL_IA[p].sugestoes) if (cont.length < 3 && !cont.includes(s)) cont.push(s)
  return { ...r, texto, links, continuacoes: cont.slice(0, 3) }
}

// ---------------------------------------------------------------- entrada pública

function montarSimulado(c: Consulta, d: Dados): RespostaAssistente {
  if (assuntoBloqueado(c)) return bloqueio()
  return limparResposta(montarBruto(c, d), d)
}

function montarBruto(c: Consulta, d: Dados): RespostaAssistente {
  switch (c.intencao) {
    case 'saudacao': return rSaudacao(d)
    case 'tecnica': return rTecnica(c, d)
    case 'peso': return rPeso(c, d)
    case 'compat_peca': return rCompatPeca(c, d)
    case 'compat_modelo': return rCompatModelo(c, d)
    case 'os_detalhe': return rOSDetalhe(c, d)
    case 'orcamento_detalhe': return rOrcDetalhe(c, d)
    case 'mais_vendidas': return rMaisVendidas(c, d)
    case 'paradas': return rParadas(c, d)
    case 'estoque_baixo': return rEstoqueBaixo(c, d)
    case 'faturamento': return rFaturamento(c, d)
    case 'contas': return rContas(c, d)
    case 'orcamentos': return rOrcamentos(c, d)
    case 'os_abertas': return rOSAbertas(c, d)
    case 'servico_mais': return rServicoMais(c, d)
    case 'modelo_mais': return rModeloMais(c, d)
    case 'funil': return rFunil(c, d)
    case 'cliente': return rCliente(c, d)
    case 'peca': return rPeca(c, d)
    case 'agenda': return rAgenda(c, d)
    case 'notas': return rNotas(c, d)
    default: return rFallback()
  }
}

/** Intenção detectada na pergunta (para outros módulos, como Conversas). */
export function detectarIntencao(texto: string, dados: Dados): string {
  return comCtx(undefined, () => detectar(texto, dados).intencao)
}

/** Peças e modelos de drone citados em um texto livre (para outros módulos). */
export function citados(texto: string, dados: Dados): { produtos: Produto[]; modelos: string[] } {
  return comCtx(undefined, () => {
    const c = detectar(texto, dados)
    return { produtos: c.produtos, modelos: c.modelos }
  })
}

/** Tira a formatação (negrito, links, tabelas) e deixa texto simples, para WhatsApp. */
export function textoSimples(md: string): string {
  return md
    .split('\n')
    .filter((l) => !l.trim().startsWith('|'))
    .join('\n')
    .replace(/\[([^\]]+)\]\(\/[^)\s]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Resposta calculada localmente (síncrona). Usada pelo caminho simulado e como base do Gemini. Sem `ctx`, perfil Gestor. */
export function responderSimulado(pergunta: string, historico: MensagemHistorico[], dados: Dados, ctx?: ContextoIA): RespostaAssistente {
  return comCtx(ctx, () => montarSimulado(resolver(pergunta, historico, dados), dados))
}

/** Panorama só com o que o papel pode ver. */
function panorama(d: Dados): string {
  const hoje = inicioHoje().getTime()
  const l = [`Empresa: ${d.empresa.nome} (revenda de drones agrícolas DJI Agras, peças e oficina).`]
  if (pode('estoque_quantidade')) {
    const baixas = d.produtos.filter((p) => p.tipo !== 'drone' && p.estoque <= p.estoqueMinimo)
    l.push(`Peças cadastradas: ${d.produtos.length}${pode('compras_giro') ? `; no mínimo ou abaixo: ${baixas.length}` : ''}.`)
  }
  if (pode('os_oficina')) {
    const abertas = d.ordens.filter(emAberto)
    l.push(`OS em aberto: ${abertas.length}; atrasadas: ${abertas.filter(atrasada).length}.`)
  }
  if (pode('orcamentos')) l.push(`Orçamentos enviados aguardando resposta: ${d.orcamentos.filter((o) => o.status === 'enviado').length}.`)
  if (pode('contas_financeiro')) {
    const v = d.lancamentos.filter((x) => x.tipo === 'receber' && !x.pagoEm && ts(x.vencimento) < hoje)
    l.push(`Contas a receber vencidas: ${v.length}, total ${brl(v.reduce((a, x) => a + x.valor, 0))}.`)
  }
  if (pode('funil')) l.push(`Leads ativos: ${d.leads.filter((x) => x.etapa !== 'fechado' && x.etapa !== 'perdido').length}.`)
  return l.join('\n')
}

async function viaGemini(c: Consulta, base: RespostaAssistente, historico: MensagemHistorico[], d: Dados): Promise<RespostaAssistente> {
  const s90 = saidasPorProduto(d.movimentacoes, 90)
  const relevantes = c.produtos.slice(0, 8).map((p) => ({
    nome: p.nome, sku: p.sku, estoque: p.estoque, minimo: p.estoqueMinimo,
    ...(pode('preco_venda') ? { preco: p.preco } : {}), ...(pode('custo_margem') ? { custo: p.custo } : {}),
    ...(pode('peso_frete') ? { pesoG: p.pesoG } : {}), ...(pode('compatibilidade') ? { modelos: nomesMod(p.modelosCompativeis, d) } : {}),
    local: p.localizacao, ...(pode('compras_giro') ? { saidas90d: s90[p.id] ?? 0 } : {}),
  }))
  const papel = CTX.papel
  const permitidos = [...ASSUNTOS_IA[papel]].join(', ')
  const sistema = `Você é o assistente do setor ${papel} do Grupo AERO (drones agrícolas DJI Agras, peças e oficina). Responda em português do Brasil, de forma direta e objetiva, `
    + `para um usuário com o perfil ${papel}. Assuntos permitidos neste perfil: ${permitidos}. Fale SOMENTE desses assuntos; para qualquer outro (por exemplo faturamento, contas, custos, margens, `
    + 'preços ou orçamentos quando não estiverem permitidos), responda apenas que a informação não está disponível no perfil e sugira o que você pode fazer. '
    + 'Use SOMENTE os dados fornecidos abaixo; não invente números, peças nem clientes. Se faltar dado, diga isso. '
    + 'Formato permitido: **negrito**, listas com "- ", tabelas simples com "|" e links no formato [texto](/rota) apenas se já estiverem nos dados. Sem títulos com "#".'
  const hist = historico.slice(-6).map((m) => `${m.papel === 'usuario' ? 'Usuário' : 'Assistente'}: ${m.texto.slice(0, 500)}`).join('\n')
  const prompt = `Panorama:\n${panorama(d)}\n\nPeças relevantes (JSON):\n${JSON.stringify(relevantes)}\n\n`
    + `Resultado calculado pelo sistema para esta pergunta (confiável):\n${base.texto}\n\nConversa recente:\n${hist || '(início)'}\n\nPergunta: ${c.orig}\n\n`
    + 'Responda à pergunta usando o resultado calculado como fonte principal.'
  const texto = (await chamarGemini({ sistema, prompt })).trim()
  if (!texto) throw new Error('vazio')
  return { ...base, texto }
}

/** Responde à pergunta usando os dados do sistema que o perfil (`ctx`) pode ver. Sem `ctx`, perfil Gestor. */
export async function responder(pergunta: string, historico: MensagemHistorico[], dados: Dados, ctx?: ContextoIA): Promise<RespostaAssistente> {
  const cx: ContextoIA = ctx ?? { papel: 'Gestor' }
  const { c, base } = comCtx(cx, () => { const q = resolver(pergunta, historico, dados); return { c: q, base: montarSimulado(q, dados) } })
  if (base.bloqueada) { await esperar(400); return base }
  if (iaReal()) {
    try { return await comCtx(cx, () => viaGemini(c, base, historico, dados)) } catch { /* cai no simulado */ }
  }
  await esperar(900)
  return base
}
