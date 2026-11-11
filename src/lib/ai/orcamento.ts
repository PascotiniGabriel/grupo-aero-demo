import type { Cliente, Equipamento, ItemComercial, ModeloDrone, Produto, Servico } from '@/types'
import { buscarProdutos, chamarGemini, esperar, iaReal, similaridade } from './index'
import { normalizar } from '../format'

export interface DadosPedido {
  produtos: Produto[]
  servicos: Servico[]
  clientes: Cliente[]
  equipamentos: Equipamento[]
  modelos: ModeloDrone[]
}

export interface PedidoInterpretado {
  clienteId?: string
  equipamentoId?: string
  itens: ItemComercial[]
  naoReconhecidos: string[]
  observacoes?: string
  frete?: number
  /** Desconto em R$ (calculado sobre o subtotal quando vem em %). */
  desconto?: number
  avisos: string[]
  /** Cliente citado no texto mas que não existe no cadastro. */
  clienteTexto?: string
}

let seq = 0
export const novoIdItem = () => `it-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function itemDeProduto(p: Produto, quantidade = 1): ItemComercial {
  return { id: novoIdItem(), tipo: p.tipo === 'drone' ? 'drone' : 'peca', produtoId: p.id, descricao: p.nome, quantidade, valorUnit: p.preco }
}
export function itemDeServico(s: Servico, quantidade = 1): ItemComercial {
  return { id: novoIdItem(), tipo: 'servico', servicoId: s.id, descricao: s.nome, quantidade, valorUnit: s.preco }
}

/* ------------------------------------------------------------------ busca para o editor */

export interface OpcaoItem {
  chave: string
  tipo: 'peca' | 'servico' | 'drone'
  nome: string
  preco: number
  estoque?: number
  produto?: Produto
  servico?: Servico
  /** true = serve no modelo; false = não serve; undefined = sem modelo escolhido ou peça universal. */
  compat?: boolean
}

export function compativel(p: Produto, modeloId?: string): boolean | undefined {
  if (!modeloId || p.modelosCompativeis.length === 0) return undefined
  return p.modelosCompativeis.includes(modeloId)
}

/** Busca unificada (peças, serviços, drones). Com modelo, as compatíveis vêm primeiro. */
export function buscarCatalogo(texto: string, dados: Pick<DadosPedido, 'produtos' | 'servicos'>, modeloId?: string, limite = 10): OpcaoItem[] {
  const q = texto.trim()
  let prods: Produto[]
  if (!q) prods = modeloId ? dados.produtos.filter((p) => p.tipo !== 'drone' && p.modelosCompativeis.includes(modeloId)).slice(0, limite) : []
  else prods = buscarProdutos(q, dados.produtos, 40)
  const opcoes: OpcaoItem[] = prods.map((p) => ({
    chave: p.id, tipo: p.tipo === 'drone' ? 'drone' : 'peca', nome: p.nome, preco: p.preco, estoque: p.estoque, produto: p, compat: compativel(p, modeloId),
  }))
  if (modeloId) {
    const rank = (o: OpcaoItem) => (o.compat === true ? 0 : o.compat === undefined ? 1 : 2)
    opcoes.sort((a, b) => rank(a) - rank(b)) // sort estável mantém a relevância dentro do grupo
  }
  const srv: OpcaoItem[] = q
    ? dados.servicos
        .filter((s) => similaridade(q, s.nome) >= 0.5 || normalizar(s.nome).includes(normalizar(q)))
        .map((s) => ({ chave: s.id, tipo: 'servico' as const, nome: s.nome, preco: s.preco, servico: s }))
    : dados.servicos.map((s) => ({ chave: s.id, tipo: 'servico' as const, nome: s.nome, preco: s.preco, servico: s }))
  return [...opcoes.slice(0, limite), ...srv].slice(0, limite + 4)
}

/* ------------------------------------------------------------------ interpretação simulada */

const PARADA = new Set([
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'para', 'pra', 'pro',
  'com', 'em', 'e', 'por', 'ao', 'aos', 'que', 'mais', 'tambem', 'favor', 'preciso', 'quero', 'queria', 'orcamento', 'pecas', 'peca',
  'unidades', 'unidade', 'und', 'un', 'pcs', 'par', 'pares', 'jogo', 'jogos', 'novo', 'nova', 'novos', 'novas', 'pol', 'polegadas', 'cada',
])
const VERBOS = new Set(['troca', 'trocar', 'troque', 'substituir', 'substituicao', 'instalar', 'repor', 'reposicao', 'comprar', 'compra', 'novo'])
const GENERICAS = new Set(['fazenda', 'sitio', 'granja', 'agropecuaria', 'cooperativa', 'agricola', 'grupo', 'cliente', 'empresa', 'sr', 'sra', 'seu', 'dona'])
const NUMEROS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20,
}
const GATILHO_SERVICO = /\b(troca|trocar|troque|revis\w*|calibr\w*|limpeza|limpar|diagnost\w*|atualiza\w*|firmware|curso|caar|treinamento|instalacao|teste de voo|mao de obra|servico)\b/
const FILLER = /^(?:e|mais|alem disso|tambem|com|inclua|incluir|inclui|adiciona|adicione|adicionar|acrescenta|acrescente|coloca|colocar|poe|bota|quer|querem|precisa|precisam|pediu|pede|solicitou|necessita|quero|queria|preciso de|preciso|precisamos de|orcamento|orcar|cotacao|cotar|pedido|favor|por favor|ainda|me ve|me passa|separa)\b[\s,]*/

const tokensDe = (t: string) => normalizar(t).split(/[^a-z0-9]+/).filter(Boolean)
const radical = (w: string) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)
/** Texto normalizado, sem plural nem palavras de ligação — para comparar nomes. */
const chave = (t: string, tirarVerbos = false) =>
  tokensDe(t).filter((w) => !PARADA.has(w) && !(tirarVerbos && VERBOS.has(w))).map(radical).join(' ')

function numero(s: string): number {
  const limpo = s.replace(/[^\d.,]/g, '')
  if (!limpo) return 0
  const v = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : /\.\d{3}$/.test(limpo) ? limpo.replace(/\./g, '') : limpo
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

function lerQuantidade(n: string): { qtd: number; pos: number } {
  let m = /^(meia duzia|uma duzia|duzia|uma dezena|dezena)\b\s*(?:de\s+)?/.exec(n)
  if (m) return { qtd: m[1] === 'meia duzia' ? 6 : m[1].includes('dezena') ? 10 : 12, pos: m[0].length }
  m = /^(\d+)\s*(?:x\b|un\b|unid\w*|pcs\b|pecas?\b)?\s*/.exec(n)
  if (m) return { qtd: Math.max(1, parseInt(m[1], 10)), pos: m[0].length }
  m = /^([a-z]+)\b\s*/.exec(n)
  if (m && NUMEROS[m[1]]) return { qtd: NUMEROS[m[1]], pos: m[0].length }
  return { qtd: 1, pos: 0 }
}

function acharCliente(frase: string, clientes: Cliente[], estrito: boolean): Cliente | undefined {
  const ft = tokensDe(frase).filter((w) => !PARADA.has(w) && !GENERICAS.has(w)).map(radical)
  if (!ft.length) return undefined
  const bate = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)))
  let melhor: { c: Cliente; s: number } | undefined
  for (const c of clientes) {
    const ct = tokensDe(c.nome).filter((w) => !PARADA.has(w) && !GENERICAS.has(w)).map(radical)
    if (!ct.length) continue
    const noCliente = ct.filter((w) => ft.some((x) => bate(x, w))).length / ct.length
    const naFrase = ft.filter((x) => ct.some((w) => bate(x, w))).length / ft.length
    const s = estrito ? (naFrase === 1 ? noCliente : 0) : Math.max(noCliente, naFrase * 0.9)
    if (s >= 0.66 && (!melhor || s > melhor.s)) melhor = { c, s }
  }
  return melhor?.c
}

function sentencas(texto: string): string[] {
  return texto.replace(/\bpol\./gi, 'pol').split(/\.(?=\s|$)|\n+/).map((s) => s.trim()).filter(Boolean)
}
function pedacos(frase: string): string[] {
  return frase.replace(/:/g, ',').split(/(?<!\d),|,(?!\d)|;|\s+\+\s+|\s+e\s+|\s+mais\s+(?=\d)/i).map((s) => s.trim()).filter(Boolean)
}

interface Ctx { dados: DadosPedido; modeloIds: string[]; regexModelo: RegExp }

function acharModelo(n: string, ctx: Ctx): string | undefined {
  const m = ctx.regexModelo.exec(n)
  return m ? m[1].replace(/\s+/g, '') : undefined
}

function melhorServico(consulta: string, servicos: Servico[]): { s: Servico; nota: number } | undefined {
  let melhor: { s: Servico; nota: number } | undefined
  for (const s of servicos) {
    const nota = similaridade(consulta, chave(s.nome))
    if (!melhor || nota > melhor.nota) melhor = { s, nota }
  }
  return melhor
}

function melhorProduto(consulta: string, produtos: Produto[], modeloId: string | undefined): { p: Produto; nota: number; ambiguo: boolean } | undefined {
  const lista: { p: Produto; nota: number; base: number }[] = []
  const q1 = consulta.split(' ')[0]
  for (const p of produtos) {
    const base = similaridade(consulta, chave(p.nome))
    if (base < 0.55) continue
    let nota = base
    if (chave(p.nome).startsWith(q1)) nota += 0.3
    const c = compativel(p, modeloId)
    if (c === true) nota += 0.6
    else if (c === false) nota -= 0.8
    if (p.estoque > 0) nota += 0.05
    lista.push({ p, nota, base })
  }
  if (!lista.length) return undefined
  lista.sort((a, b) => b.nota - a.nota)
  const top = lista[0]
  const ambiguo = !modeloId && lista.filter((x) => Math.abs(x.nota - top.nota) < 0.06).length > 1
  return { p: top.p, nota: top.base, ambiguo }
}

export interface ContextoPedido { clienteId?: string; equipamentoId?: string; modeloId?: string }

/** Procura o nome (ou um trecho único dele) de algum cliente dentro do texto normalizado. */
function escanearCliente(n: string, dados: DadosPedido): { c: Cliente; ini: number; fim: number } | undefined {
  const vocab = new Set<string>()
  for (const p of dados.produtos) tokensDe(p.nome).forEach((w) => vocab.add(radical(w)))
  for (const sv of dados.servicos) tokensDe(sv.nome).forEach((w) => vocab.add(radical(w)))
  const contagem = new Map<string, number>()
  const nomes = dados.clientes.map((c) => tokensDe(c.nome).filter((w) => !PARADA.has(w) && !GENERICAS.has(w)))
  nomes.forEach((ts) => ts.forEach((w) => contagem.set(w, (contagem.get(w) ?? 0) + 1)))
  const gen = `(?:(?:${[...GENERICAS].join('|')})\\s+)?`
  let melhor: { c: Cliente; ini: number; fim: number } | undefined
  dados.clientes.forEach((c, i) => {
    const ts = nomes[i]
    if (!ts.length) return
    const alternativas = [gen + ts.join('\\s+(?:d[aeo]s?\\s+)?')]
    for (const w of ts) if (w.length >= 5 && contagem.get(w) === 1 && !vocab.has(radical(w))) alternativas.push(w)
    for (const alt of alternativas) {
      const m = new RegExp(`(?:\\b(?:para|pra|pro|do|da|de|cliente|a|o)\\s+)?(?:(?:o|a)\\s+)?\\b${alt}\\b`).exec(n)
      if (m && (!melhor || m[0].length > melhor.fim - melhor.ini)) melhor = { c, ini: m.index, fim: m.index + m[0].length }
    }
  })
  return melhor
}

function simulado(texto: string, dados: DadosPedido, contexto?: ContextoPedido): PedidoInterpretado {
  const ids = dados.modelos.map((m) => m.id).sort((a, b) => b.length - a.length)
  const ctx: Ctx = { dados, modeloIds: ids, regexModelo: new RegExp(`\\b(${ids.map((i) => i.replace(/^t/, 't\\s?')).join('|')})\\b`) }
  const r: PedidoInterpretado = { itens: [], naoReconhecidos: [], avisos: [] }
  const obs: string[] = []
  let descPct = 0
  let descValor = 0

  const todos = normalizar(texto)
  const modeloGlobal = acharModelo(todos, ctx)
  let modeloAtual: string | undefined
  if (contexto?.clienteId) r.clienteId = contexto.clienteId

  const definirCliente = (c: Cliente) => {
    r.clienteId = c.id
  }
  const modeloDoCliente = (): string | undefined => {
    if (!r.clienteId) return undefined
    const mods = [...new Set(dados.equipamentos.filter((e) => e.clienteId === r.clienteId).map((e) => e.modeloId))]
    return mods.length === 1 ? mods[0] : undefined
  }

  // 1ª passada: cliente (pode vir em qualquer ponto do texto) e observações
  const pecas: string[] = []
  for (const sent of sentencas(texto)) {
    const nSent = normalizar(sent)
    const mo = /^(?:obs\w*|observac\w*)\s*[:\-]?\s*/.exec(nSent)
    if (mo) { const t = sent.slice(mo[0].length).trim(); if (t) obs.push(t.charAt(0).toUpperCase() + t.slice(1)); continue }
    pecas.push(...pedacos(sent))
  }

  // cliente: procura em pedaços "para X" / "cliente X" e em caudas "... para X"
  const limpos: { orig: string; n: string }[] = []
  for (const bruto of pecas) {
    let orig = bruto
    let n = normalizar(bruto)
    for (let i = 0; i < 4; i++) {
      const f = FILLER.exec(n)
      if (!f || !f[0].length) break
      orig = orig.slice(f[0].length); n = n.slice(f[0].length)
    }
    const achado = escanearCliente(n, dados)
    if (achado) {
      definirCliente(achado.c)
      orig = orig.slice(0, achado.ini) + ' ' + orig.slice(achado.fim); n = n.slice(0, achado.ini) + ' ' + n.slice(achado.fim)
      orig = orig.trim(); n = n.trim()
      for (let i = 0; i < 4; i++) {
        const f = FILLER.exec(n)
        if (!f || !f[0].length) break
        orig = orig.slice(f[0].length); n = n.slice(f[0].length)
      }
    }
    if (!n.trim()) continue
    const lead = /^(?:para|pra|pro|cliente)\s+(?:o\s+|a\s+)?(.+)$/.exec(n)
    if (lead) {
      const c = acharCliente(lead[1], dados.clientes, false)
      if (c) { definirCliente(c); continue }
      if (!/\d/.test(lead[1]) && !r.clienteTexto && !buscarProdutos(lead[1], dados.produtos, 1).length) { r.clienteTexto = orig.replace(/^\S+\s+(?:(?:o|a)\s+)?/i, '').trim(); continue }
    }
    const cauda = /\s(?:para|pra|pro)\s+(?:o\s+|a\s+)?(.+)$/.exec(n)
    if (cauda) {
      const c = acharCliente(cauda[1], dados.clientes, true)
      if (c) { definirCliente(c); n = n.slice(0, cauda.index); orig = orig.slice(0, cauda.index) }
    }
    limpos.push({ orig: orig.trim(), n: n.trim() })
  }

  // modelo padrão quando o texto não cita nenhum: o drone do cliente
  const modeloPadrao = modeloGlobal ?? modeloDoCliente() ?? contexto?.modeloId

  for (const { orig, n } of limpos) {
    if (/\bfrete\b/.test(n)) {
      const v = /(?:r\$\s*|de\s+)(\d[\d.,]*)\s*(?:reais)?/.exec(n)
      if (v && numero(v[1]) > 0) { r.frete = numero(v[1]); obs.push(`Frete de ${numero(v[1]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`) }
      else if (/(conta do cliente|cliente (?:paga|retira)|fob|retira|por conta dele|por conta dela)/.test(n)) { r.frete = 0; obs.push('Frete por conta do cliente.') }
      else if (/(gratis|incluso|incluido|cif|nossa conta|conta da empresa|conta do grupo|sem custo)/.test(n)) { r.frete = 0; obs.push('Frete incluso (por conta da empresa).') }
      else obs.push(orig.charAt(0).toUpperCase() + orig.slice(1) + '.')
      continue
    }
    if (/\bdesconto\b/.test(n)) {
      const pct = /(\d+(?:,\d+)?)\s*(?:%|por cento)/.exec(n)
      const val = /(?:r\$\s*|de\s+)(\d[\d.,]*)\s*(?:reais)?/.exec(n)
      if (pct) descPct = numero(pct[1])
      else if (val) descValor = numero(val[1])
      continue
    }
    if (/^(?:entrega|pagamento|prazo|pagar|a vista|parcelad|validade|pix|boleto)/.test(n)) { obs.push(orig.charAt(0).toUpperCase() + orig.slice(1) + '.'); continue }
    if (acharModelo(n, ctx) && !chave(n.replace(ctx.regexModelo, ' '))) { modeloAtual = acharModelo(n, ctx); continue }

    const { qtd, pos } = lerQuantidade(n)
    const resto = n.slice(pos)
    const restoOrig = orig.slice(pos)
    const modeloPeca = acharModelo(resto, ctx)
    if (modeloPeca) modeloAtual = modeloPeca
    const modelo = modeloPeca ?? modeloAtual ?? modeloPadrao
    const semModelo = resto.replace(ctx.regexModelo, ' ')
    const ehDrone = /\b(drone|drones|kit completo|agras)\b/.test(resto)

    if (ehDrone) {
      const alvo = ctx.dados.produtos.find((p) => p.tipo === 'drone' && modelo && p.modelosCompativeis.includes(modelo))
      if (alvo) { juntar(r.itens, itemDeProduto(alvo, qtd)); continue }
      r.naoReconhecidos.push(restoOrig.trim() || orig); continue
    }

    const consultaServ = chave(semModelo)
    const consultaProd = chave(semModelo, true)
    if (!consultaServ) { if (orig.length > 2) r.naoReconhecidos.push(orig); continue }

    const srv = GATILHO_SERVICO.test(resto) ? melhorServico(consultaServ, dados.servicos) : undefined
    const prod = consultaProd ? melhorProduto(consultaProd, dados.produtos.filter((p) => p.tipo !== 'drone'), modelo) : undefined
    const servOk = srv && srv.nota >= 0.5
    if (servOk && (!prod || srv.nota >= prod.nota)) { juntar(r.itens, itemDeServico(srv.s, qtd)); continue }
    if (prod) {
      juntar(r.itens, itemDeProduto(prod.p, qtd))
      if (prod.ambiguo) r.avisos.push(`Há mais de uma opção para "${restoOrig.trim()}". Usei "${prod.p.nome}" — confira se serve no drone do cliente.`)
      continue
    }
    // serviço sem gatilho explícito (ex.: "calibração")
    const srv2 = melhorServico(consultaServ, dados.servicos)
    if (srv2 && srv2.nota >= 0.6) { juntar(r.itens, itemDeServico(srv2.s, qtd)); continue }
    r.naoReconhecidos.push(restoOrig.trim() || orig)
  }

  if (r.clienteId) {
    const meus = dados.equipamentos.filter((e) => e.clienteId === r.clienteId)
    const alvo = (modeloAtual ?? modeloGlobal) ? meus.find((e) => e.modeloId === (modeloAtual ?? modeloGlobal)) : undefined
    r.equipamentoId = alvo?.id ?? (meus.length === 1 ? meus[0].id : undefined)
  }
  const subtotal = r.itens.reduce((s, i) => s + i.quantidade * i.valorUnit, 0)
  if (descPct > 0) r.desconto = Math.round(subtotal * descPct) / 100
  else if (descValor > 0) r.desconto = descValor
  if (obs.length) r.observacoes = obs.join(' ')
  return r
}

function juntar(itens: ItemComercial[], novo: ItemComercial) {
  const ex = itens.find((i) => (novo.produtoId && i.produtoId === novo.produtoId) || (novo.servicoId && i.servicoId === novo.servicoId))
  if (ex) ex.quantidade += novo.quantidade
  else itens.push(novo)
}

/* ------------------------------------------------------------------ Gemini */

interface RespostaGemini {
  clienteId?: string | null
  equipamentoId?: string | null
  itens?: { tipo?: string; id?: string; quantidade?: number }[]
  naoReconhecidos?: string[]
  observacoes?: string | null
  frete?: number | null
}

async function viaGemini(texto: string, dados: DadosPedido): Promise<PedidoInterpretado> {
  const prods = dados.produtos.map((p) => `${p.id}|${p.nome}|R$${p.preco}|modelos:${p.modelosCompativeis.join(',') || 'todos'}`).join('\n')
  const servs = dados.servicos.map((s) => `${s.id}|${s.nome}|R$${s.preco}`).join('\n')
  const clis = dados.clientes.map((c) => `${c.id}|${c.nome}|${c.cidade}/${c.uf}`).join('\n')
  const eqps = dados.equipamentos.map((e) => `${e.id}|cliente:${e.clienteId}|modelo:${e.modeloId}`).join('\n')
  const sistema =
    'Você monta orçamentos para uma revenda de drones agrícolas DJI Agras, peças e oficina. Use SOMENTE os ids das listas fornecidas. ' +
    'Respeite o modelo do drone citado (ou o drone do cliente) ao escolher peças. Responda apenas JSON: ' +
    '{"clienteId":string|null,"equipamentoId":string|null,"itens":[{"tipo":"produto"|"servico","id":string,"quantidade":number}],"naoReconhecidos":[string],"observacoes":string|null,"frete":number|null}. ' +
    'O que não puder casar com a lista vai em naoReconhecidos (trecho original). Frete por conta do cliente: frete 0 e registre em observacoes.'
  const prompt = `PEDIDO:\n${texto}\n\nPRODUTOS:\n${prods}\n\nSERVIÇOS:\n${servs}\n\nCLIENTES:\n${clis}\n\nEQUIPAMENTOS:\n${eqps}`
  const bruto = await chamarGemini({ sistema, prompt, json: true })
  const j = JSON.parse(bruto.replace(/^```(?:json)?|```$/g, '').trim()) as RespostaGemini
  const r: PedidoInterpretado = { itens: [], naoReconhecidos: Array.isArray(j.naoReconhecidos) ? j.naoReconhecidos.map(String) : [], avisos: [] }
  if (j.clienteId && dados.clientes.some((c) => c.id === j.clienteId)) r.clienteId = j.clienteId
  if (j.equipamentoId && dados.equipamentos.some((e) => e.id === j.equipamentoId)) r.equipamentoId = j.equipamentoId
  for (const it of j.itens ?? []) {
    const q = Math.max(1, Math.round(Number(it.quantidade) || 1))
    const p = dados.produtos.find((x) => x.id === it.id)
    const s = dados.servicos.find((x) => x.id === it.id)
    if (p) juntar(r.itens, itemDeProduto(p, q))
    else if (s) juntar(r.itens, itemDeServico(s, q))
  }
  if (j.observacoes) r.observacoes = String(j.observacoes)
  if (typeof j.frete === 'number' && j.frete >= 0) r.frete = j.frete
  if (!r.itens.length && !r.naoReconhecidos.length) throw new Error('Resposta vazia')
  return r
}

/** Interpreta um pedido em texto livre (digitado ou ditado) e devolve o orçamento montado. */
export async function interpretarPedido(texto: string, dados: DadosPedido, contexto?: ContextoPedido): Promise<PedidoInterpretado> {
  if (iaReal()) {
    try { return await viaGemini(texto, dados) } catch { /* cai no simulado */ }
  }
  await esperar(1800)
  return simulado(texto, dados, contexto)
}

/** Versão síncrona do caminho simulado (testes e uso interno). */
export const interpretarSimulado = simulado
