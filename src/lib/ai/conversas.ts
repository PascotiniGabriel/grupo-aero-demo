// IA da tela Conversas (WhatsApp): sugerir resposta, resumir e extrair o pedido do cliente.
// Cada função tem o caminho simulado (lógica local sobre os dados da store) e o caminho Gemini.
import type { Conversa, Dados, OrdemServico } from '@/types'
import { useStore } from '@/store'
import { totalOrcamento } from '@/store/selectors'
import { brl, dataCurta, normalizar, numero, peso } from '../format'
import { chamarGemini, esperar, iaReal } from './index'
import { citados, interpretarPedido, responderSimulado, textoSimples } from './assistente'

const dadosAtuais = (): Dados => useStore.getState()

const ROTULO_OS: Record<string, string> = {
  recebido: 'recebido na oficina', diagnostico: 'em diagnóstico', aguardando_aprovacao: 'aguardando aprovação do orçamento',
  em_manutencao: 'em manutenção', testes: 'em testes de voo', pronto: 'pronto para retirada', entregue: 'entregue',
}

function saudacaoHora(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

/** Mensagens do cliente depois da última resposta da equipe (ou as duas últimas, se não houver). */
function blocoRecente(conv: Conversa): string[] {
  const msgs = conv.mensagens.filter((m) => m.de !== 'ia')
  let i = msgs.length
  while (i > 0 && msgs[i - 1].de === 'cliente') i -= 1
  const novas = msgs.slice(i).map((m) => m.texto)
  if (novas.length) return novas
  return msgs.filter((m) => m.de === 'cliente').slice(-2).map((m) => m.texto)
}

const textosCliente = (conv: Conversa, n = 8) => conv.mensagens.filter((m) => m.de === 'cliente').slice(-n).map((m) => m.texto)

function somarDiasUteis(n: number): Date {
  const d = new Date()
  let k = 0
  while (k < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) k += 1 }
  return d
}

const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }

// ------------------------------------------------------------------ sugerir resposta

function respostaStatus(conv: Conversa, d: Dados, saud: string, todo: string): string | null {
  const cli = d.clientes.find((c) => c.id === conv.clienteId)
  if (!cli) return null
  const qTodo = normalizar(todo)
  const urgente = /safra|urgente|urgencia/.test(qTodo) ? 'Entendo a urgência por causa da safra. ' : ''
  const nOrc = /orcamento\s*#?(\d{4})/.exec(qTodo)
  const orc = nOrc ? d.orcamentos.find((o) => o.numero === Number(nOrc[1]) && o.clienteId === cli.id) : undefined
  if (orc) {
    const faltam = orc.itens.filter((i) => i.produtoId).map((i) => ({ i, p: d.produtos.find((x) => x.id === i.produtoId) }))
      .filter((x) => x.p && x.p.estoque < x.i.quantidade)
    const dias = /(\d+)\s*dias/.exec(normalizar(orc.prazoEntrega))
    const entrega = dias ? `Se aprovar hoje, a entrega fica prevista para ${dataCurta(somarDiasUteis(Number(dias[1])).toISOString())} (${dias[1]} dias úteis).` : `Prazo de entrega: ${orc.prazoEntrega}.`
    const pecas = orc.itens.filter((i) => i.tipo === 'peca').map((i) => i.descricao.split(' (')[0]).slice(0, 3)
    const estoque = faltam.length ? `Atenção: ${faltam.map((x) => x.p!.nome).join(', ')} está com estoque abaixo do pedido, então o prazo depende da reposição.` : pecas.length ? 'Todas as peças do orçamento estão em estoque.' : ''
    const valido = new Date(orc.validade).getTime() >= hoje0() ? `O orçamento ${orc.numero} (${brl(totalOrcamento(orc))}) segue válido até ${dataCurta(orc.validade)}.` : `O orçamento ${orc.numero} está com a validade vencida; posso renovar.`
    return `${saud} ${urgente}${valido} ${entrega} ${estoque}`.replace(/\s+/g, ' ').trim() + ' Posso confirmar a aprovação por aqui?'
  }
  const nOS = /\bos\s*#?(\d{4})/.exec(qTodo)
  const abertas = d.ordens.filter((o) => o.clienteId === cli.id && o.status !== 'entregue').sort((a, b) => new Date(b.abertura).getTime() - new Date(a.abertura).getTime())
  const os: OrdemServico | undefined = (nOS ? d.ordens.find((o) => o.numero === Number(nOS[1])) : undefined) ?? abertas[0]
  if (os) {
    const eq = d.equipamentos.find((e) => e.id === os.equipamentoId)
    const modelo = eq ? d.modelos.find((m) => m.id === eq.modeloId)?.nome : ''
    const atraso = Math.round((hoje0() - new Date(os.previsao).getTime()) / 86400000)
    const prazo = os.status === 'pronto' ? 'Já pode retirar na oficina.' : atraso > 0 ? `O prazo previsto era ${dataCurta(os.previsao)} e estamos ${atraso} ${atraso === 1 ? 'dia' : 'dias'} acima dele; vou priorizar.` : `A previsão de entrega é ${dataCurta(os.previsao)}.`
    const ultimo = os.historico[os.historico.length - 1]?.texto
    const peca = os.itens.filter((i) => i.tipo === 'peca' && i.produtoId).map((i) => d.produtos.find((p) => p.id === i.produtoId)).find((p) => p)
    const pecaTxt = peca ? ` A peça (${peca.nome.split(' (')[0]}) ${peca.estoque > 0 ? 'está em estoque' : 'está em falta e já pedi ao fornecedor'}.` : ''
    const outras = abertas.length > 1 ? ` O cliente tem mais ${abertas.length - 1} OS em aberto.` : ''
    void outras
    return `${saud} ${urgente}Sobre a OS ${os.numero}${modelo ? ` do ${modelo}` : ''}: está ${ROTULO_OS[os.status]} com o técnico ${os.tecnico}. ${prazo}${ultimo ? ` Último andamento: ${ultimo.replace(/\.$/, '')}.` : ''}${pecaTxt} Aviso aqui assim que houver novidade.`.replace(/\s+/g, ' ').trim()
  }
  const enviado = d.orcamentos.filter((o) => o.clienteId === cli.id && o.status === 'enviado')[0]
  if (enviado) {
    return `${saud} ${urgente}O orçamento ${enviado.numero} (${brl(totalOrcamento(enviado))}) está enviado, válido até ${dataCurta(enviado.validade)}, com prazo de ${enviado.prazoEntrega}. Posso confirmar a aprovação por aqui?`
  }
  return null
}

function respostaFinanceiro(conv: Conversa, d: Dados, saud: string, todo: string): string | null {
  const cli = d.clientes.find((c) => c.id === conv.clienteId)
  if (!cli) return null
  const abertos = d.lancamentos.filter((l) => l.tipo === 'receber' && l.clienteId === cli.id && !l.pagoEm).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
  if (!abertos.length) return `${saud} Conferi aqui e não há pendências financeiras em aberto no seu cadastro. Se tiver algum documento em mãos, me envie o número que verifico.`
  const l = abertos[0]
  const venc = new Date(l.vencimento).getTime() < hoje0()
  const dia = /dia\s*(\d{1,2})/.exec(normalizar(todo))
  const nova = dia ? ` Sobre a nova data (dia ${dia[1]}), vou solicitar ao financeiro e confirmo a emissão do novo boleto por aqui.` : ' Posso reenviar a segunda via se precisar.'
  return `${saud} Localizei o lançamento "${l.descricao}", no valor de ${brl(l.valor)}, ${venc ? `vencido em ${dataCurta(l.vencimento)}` : `com vencimento em ${dataCurta(l.vencimento)}`}.${nova}`
}

function respostaPedido(conv: Conversa, d: Dados, saud: string, todo: string): string | null {
  const { itens: brutos } = interpretarPedido(todo, d)
  const itens = brutos.filter((i, k) => brutos.findIndex((x) => x.produto.id === i.produto.id) === k)
  if (!itens.length) return null
  const cli = d.clientes.find((c) => c.id === conv.clienteId)
  let total = 0; let pesoTotal = 0
  const linhas = itens.map((i) => {
    const sub = i.quantidade * i.produto.preco
    total += sub; pesoTotal += i.quantidade * i.produto.pesoG
    const disp = i.produto.estoque >= i.quantidade ? `${numero(i.produto.estoque)} em estoque` : i.produto.estoque > 0 ? `só ${numero(i.produto.estoque)} em estoque, o restante sob encomenda` : 'sem estoque, sob encomenda'
    return `- ${i.quantidade} × ${i.produto.nome}: ${brl(i.produto.preco)} cada, ${brl(sub)} (${disp})`
  })
  const prazo = /ate\s+(segunda|terca|quarta|quinta|sexta|sabado|amanha|domingo)/.exec(normalizar(todo))
  const envio = cli ? ` Envio para ${cli.cidade}/${cli.uf}${prazo ? `; se confirmar hoje, priorizo o despacho para chegar até ${prazo[1] === 'amanha' ? 'amanhã' : prazo[1] === 'terca' ? 'terça' : prazo[1] === 'sabado' ? 'sábado' : prazo[1]}` : ''}.` : ''
  return `${saud} Temos disponível:\n${linhas.join('\n')}\n\nTotal das peças: ${brl(total)}, sem frete (peso aproximado ${peso(pesoTotal)}).${envio} Posso gerar o orçamento com o frete?`
}

function juntar(l: string[]): string {
  return l.length <= 1 ? (l[0] ?? '') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`
}

function respostaTecnica(recente: string, todo: string, d: Dados, saud: string): string | null {
  const q = normalizar(recente)
  const cue = /(serve|servem|compativel|encaixa|cabe)/.test(q) || /(^|\. |\? )e (o|a|os|as) (parafuso|helice|motor|bico|bomba|esc|bateria|tanque|radar)/.test(q)
  if (!cue) return null
  const modelosTodo = citados(todo, d).modelos
  const ultimo = modelosTodo[modelosTodo.length - 1]
  const nomeUltimo = ultimo ? d.modelos.find((m) => m.id === ultimo)?.nome ?? '' : ''
  const consulta = citados(recente, d).modelos.length ? recente : `${recente} ${nomeUltimo}`
  const { produtos, modelos } = citados(consulta, d)
  if (!produtos.length) return null
  if (modelos.length >= 2) {
    const r = responderSimulado(consulta, [], d)
    const corpo = textoSimples(r.texto).split('\n').filter((l) => l.trim()).slice(0, 3).join(' ')
    return `${saud} ${corpo} Quer que eu separe para você?`
  }
  const p = produtos[0]
  const nomes = juntar(p.modelosCompativeis.map((m) => d.modelos.find((x) => x.id === m)?.nome ?? m))
  const estoque = p.estoque > 0 ? `Temos ${numero(p.estoque)} em estoque, a ${brl(p.preco)} cada.` : 'No momento está sem estoque, mas consigo encomendar.'
  const alvo = modelos[0] ? d.modelos.find((m) => m.id === modelos[0])?.nome : ''
  const serve = alvo && p.modelosCompativeis.length ? (p.modelosCompativeis.includes(modelos[0]) ? `serve no ${alvo}` : `não serve no ${alvo}`) : ''
  return `${saud} ${p.nome} ${serve ? `${serve} (compatível com ${nomes})` : `serve em ${nomes || 'todos os modelos'}`}. ${estoque} Quer que eu separe para você?`
}

function simularResposta(conv: Conversa, d: Dados): string {
  const cli = d.clientes.find((c) => c.id === conv.clienteId)
  const nome = cli?.tipo === 'PF' ? cli.nome.split(' ')[0] : ''
  const saud = `${saudacaoHora()}${nome ? `, ${nome}` : ''}!`
  const recente = blocoRecente(conv).join(' ')
  const todo = textosCliente(conv).join(' ')
  const q = normalizar(recente)
  const ultima = conv.mensagens[conv.mensagens.length - 1]

  if (!/\?/.test(recente) && /obrigad|valeu|perfeito|combinado|fechado|ok\b/.test(q) && ultima?.de === 'cliente' && q.length < 80) {
    return `Por nada${nome ? `, ${nome}` : ''}! Qualquer dúvida é só chamar por aqui.`
  }
  if (/prazo|quando|ate quando|entrega|previs|novidade|andamento|como esta|situacao|urgente|urgencia|status|atras|ficou pronto/.test(q)) {
    const r = respostaStatus(conv, d, saud, todo); if (r) return r
  }
  if (/boleto|pagamento|segunda via|vencimento|fatura|nota fiscal|\bnf\b|\bpix\b|cobranca/.test(q)) {
    const r = respostaFinanceiro(conv, d, saud, recente); if (r) return r
  }
  const tec = respostaTecnica(recente, todo, d, saud); if (tec) return tec
  const ped = respostaPedido(conv, d, saud, todo); if (ped) return ped
  if (/caiu|queda|quebr|defeito|problema|parou|nao liga|barulho|ruido|trinc|bateu/.test(q)) {
    const diag = d.servicos.find((s) => s.id === 'srv-diag-queda')
    return `${saud} Sinto muito pelo ocorrido. Por segurança, retire a bateria e não ligue o equipamento até a avaliação. Traga o drone à oficina que abrimos uma ordem de serviço e fazemos o diagnóstico${diag ? ` (${brl(diag.preco)}, cerca de ${numero(diag.horas)} h)` : ''}. Qual é o modelo e o que aconteceu?`
  }
  const { modelos } = citados(todo, d)
  const kit = d.produtos.find((p) => p.tipo === 'drone' && p.modelosCompativeis.some((m) => modelos.includes(m)))
  if (kit && (conv.etiqueta === 'Venda de drone' || /drone|demonstra|comprar|valor|preco|quanto/.test(q))) {
    const vento = /vento/.test(normalizar(todo)) ? ' Com vento forte, o ideal é aplicar nas primeiras horas da manhã, e na demonstração avaliamos isso na sua área.' : ''
    return `${saud} O ${kit.nome} sai por ${brl(kit.preco)} e temos ${numero(kit.estoque)} ${kit.estoque === 1 ? 'unidade' : 'unidades'} em estoque.${vento} Posso agendar uma demonstração na sua propriedade. Qual o melhor dia e horário?`
  }
  return `${saud} Recebi sua mensagem. Vou verificar e retorno em instantes.`
}

function contextoConversa(conv: Conversa, d: Dados): string {
  const cli = d.clientes.find((c) => c.id === conv.clienteId)
  if (!cli) return 'Contato ainda não cadastrado como cliente.'
  const eqps = d.equipamentos.filter((e) => e.clienteId === cli.id).map((e) => `${d.modelos.find((m) => m.id === e.modeloId)?.nome}${e.apelido ? ` (${e.apelido})` : ''}`)
  const oss = d.ordens.filter((o) => o.clienteId === cli.id && o.status !== 'entregue').map((o) => `OS ${o.numero}: ${ROTULO_OS[o.status]}, previsão ${dataCurta(o.previsao)}, técnico ${o.tecnico}`)
  const orcs = d.orcamentos.filter((o) => o.clienteId === cli.id).slice(0, 3).map((o) => `Orçamento ${o.numero}: ${o.status}, ${brl(totalOrcamento(o))}, validade ${dataCurta(o.validade)}, prazo ${o.prazoEntrega}`)
  const fin = d.lancamentos.filter((l) => l.tipo === 'receber' && l.clienteId === cli.id && !l.pagoEm).map((l) => `${l.descricao}: ${brl(l.valor)}, vence ${dataCurta(l.vencimento)}`)
  return [`Cliente: ${cli.nome} (${cli.cidade}/${cli.uf})`, `Drones: ${eqps.join(', ') || 'nenhum'}`, `OS em aberto: ${oss.join(' | ') || 'nenhuma'}`, `Orçamentos: ${orcs.join(' | ') || 'nenhum'}`, `Financeiro em aberto: ${fin.join(' | ') || 'nada'}`].join('\n')
}

const historicoTexto = (conv: Conversa, n = 12) => conv.mensagens.slice(-n).map((m) => `${m.de === 'cliente' ? 'Cliente' : m.de === 'equipe' ? 'Equipe' : 'Nota da IA'}: ${m.texto}`).join('\n')

/** Sugere a próxima resposta da equipe, usando estoque, OS, orçamentos e financeiro reais. */
export async function sugerirResposta(conversa: Conversa, dados: Dados = dadosAtuais()): Promise<string> {
  const base = simularResposta(conversa, dados)
  if (iaReal()) {
    try {
      const { itens } = interpretarPedido(textosCliente(conversa).join(' '), dados)
      const pecas = itens.map((i) => `${i.quantidade} × ${i.produto.nome}: estoque ${i.produto.estoque}, preço ${brl(i.produto.preco)}, peso ${i.produto.pesoG} g`).join('\n')
      const texto = await chamarGemini({
        sistema: 'Você escreve respostas de WhatsApp para a equipe do Grupo AERO (drones agrícolas DJI Agras, peças e oficina). Português do Brasil, educado, objetivo e curto (até 6 linhas). '
          + 'Use apenas os dados fornecidos; não invente preços, prazos nem estoque. Devolva só o texto da mensagem, sem aspas e sem formatação markdown.',
        prompt: `Conversa:\n${historicoTexto(conversa)}\n\nDados do cliente:\n${contextoConversa(conversa, dados)}\n\nPeças citadas:\n${pecas || '(nenhuma)'}\n\nRascunho calculado pelo sistema (use como base de fatos):\n${base}\n\nEscreva a próxima resposta da equipe.`,
      })
      if (texto.trim()) return texto.trim()
    } catch { /* cai no simulado */ }
  }
  await esperar(1100)
  return base
}

// ------------------------------------------------------------------ resumo

function tempoSemResposta(conv: Conversa): string {
  const msgs = conv.mensagens.filter((m) => m.de !== 'ia')
  let i = msgs.length
  while (i > 0 && msgs[i - 1].de === 'cliente') i -= 1
  const primeira = msgs[i]
  if (!primeira) return ''
  const h = Math.max(0, Math.round((Date.now() - new Date(primeira.hora).getTime()) / 3600000))
  if (h < 1) return 'há menos de 1 hora'
  if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`
  const dd = Math.round(h / 24)
  return `há ${dd} ${dd === 1 ? 'dia' : 'dias'}`
}

const corta = (t: string, n = 120) => (t.length > n ? `${t.slice(0, n - 1).trim()}…` : t)

function simularResumo(conv: Conversa): string {
  const cliente = conv.mensagens.filter((m) => m.de === 'cliente')
  const equipe = conv.mensagens.filter((m) => m.de === 'equipe')
  const pend = (() => {
    let n = 0
    for (let i = conv.mensagens.length - 1; i >= 0; i--) { const m = conv.mensagens[i]; if (m.de === 'ia') continue; if (m.de === 'cliente') n += 1; else break }
    return n
  })()
  const passo: Record<Conversa['etiqueta'], string> = {
    Peças: 'Confirmar a disponibilidade e enviar o orçamento com o frete.',
    Manutenção: 'Atualizar o cliente sobre a OS e o prazo de entrega.',
    'Venda de drone': 'Agendar a demonstração e preparar a proposta.',
    Financeiro: 'Conferir o lançamento e responder sobre o boleto.',
  }
  const pedidos = cliente.slice(-4).map((m) => `- ${corta(m.texto)}`).join('\n')
  const respostas = equipe.length ? equipe.slice(-3).map((m) => `- ${corta(m.texto)}`).join('\n') : '- Ainda não houve resposta da equipe.'
  const pendente = pend > 0 ? `${pend} ${pend === 1 ? 'mensagem do cliente sem resposta' : 'mensagens do cliente sem resposta'} ${tempoSemResposta(conv)}.` : 'Nada pendente: a última mensagem é da equipe.'
  return `**Assunto:** ${conv.etiqueta}, ${conv.nome}\n\n**O que o cliente disse**\n${pedidos}\n\n**O que a equipe respondeu**\n${respostas}\n\n**Pendente:** ${pendente}\n\n**Próximo passo sugerido:** ${passo[conv.etiqueta]}`
}

/** Resumo curto da conversa, em texto com formatação simples (negrito e listas). */
export async function resumirConversa(conversa: Conversa): Promise<string> {
  const base = simularResumo(conversa)
  if (iaReal()) {
    try {
      const texto = await chamarGemini({
        sistema: 'Você resume conversas de WhatsApp para o atendente do Grupo AERO. Português do Brasil. Use exatamente esta estrutura em markdown simples: '
          + '**Assunto:** ...; **O que o cliente disse** (lista com "- "); **O que a equipe respondeu** (lista); **Pendente:** ...; **Próximo passo sugerido:** .... Seja curto e não invente fatos.',
        prompt: `Etiqueta: ${conversa.etiqueta}\nContato: ${conversa.nome}\n\n${historicoTexto(conversa, 20)}`,
      })
      if (texto.trim()) return texto.trim()
    } catch { /* cai no simulado */ }
  }
  await esperar(900)
  return base
}

// ------------------------------------------------------------------ pedido

/** Texto do pedido do cliente, pronto para o "Gerar orçamento" (ex.: "4 Hélices 62 pol..., 4 Bico centrífugo..."). */
export async function extrairPedido(conversa: Conversa, dados: Dados = dadosAtuais()): Promise<string> {
  const cliente = textosCliente(conversa, 10)
  const { itens: brutos } = interpretarPedido(cliente.join(' '), dados)
  const itens = brutos.filter((i, k) => brutos.findIndex((x) => x.produto.id === i.produto.id) === k)
  const base = itens.length
    ? itens.map((i) => `${i.quantidade} ${i.produto.nome}`).join(', ')
    : cliente.slice(-2).join(' ').replace(/\s+/g, ' ').trim()
  if (iaReal()) {
    try {
      const texto = await chamarGemini({
        sistema: 'Extraia de uma conversa de WhatsApp o pedido de peças ou serviços do cliente. Responda em uma única linha em português, no formato "quantidade item, quantidade item", '
          + 'sem explicações. Se o cliente citar o modelo do drone, mantenha no item.',
        prompt: `${historicoTexto(conversa, 20)}\n\nPeças reconhecidas no catálogo:\n${base}`,
      })
      if (texto.trim()) return texto.trim().replace(/\s*\n+\s*/g, ' ')
    } catch { /* cai no simulado */ }
  }
  await esperar(800)
  return base
}
