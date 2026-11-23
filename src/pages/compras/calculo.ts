import type { Cotacao, RespostaCotacao } from '@/types'

export const ROTULO_STATUS: Record<Cotacao['status'], string> = { rascunho: 'Rascunho', enviada: 'Enviada', respondida: 'Respondida', fechada: 'Fechada' }
export const COR_STATUS = { rascunho: 'neutro', enviada: 'azul', respondida: 'ambar', fechada: 'verde' } as const

export const produtosDe = (c: Cotacao, r: RespostaCotacao) =>
  c.itens.reduce((s, it, i) => s + (r.precos[i] || 0) * it.quantidade, 0)
export const totalDe = (c: Cotacao, r: RespostaCotacao) => produtosDe(c, r) + (r.frete || 0) + (r.outrasDespesas || 0)
/** Peso total em kg (0 quando a resposta não informou pesos). */
export const pesoTotalDe = (c: Cotacao, r: RespostaCotacao) =>
  c.itens.reduce((s, it, i) => s + (r.pesos?.[i] || 0) * it.quantidade, 0)
/** Quantos itens o fornecedor não cotou (preço 0). */
export const faltantes = (c: Cotacao, r: RespostaCotacao) => c.itens.filter((_, i) => !(r.precos[i] > 0)).length

/** Melhor resposta: menor total entre as que cotaram tudo; se nenhuma, entre as que cotaram algo. */
export function melhorResposta(c: Cotacao): RespostaCotacao | undefined {
  const validas = c.respostas.filter((r) => produtosDe(c, r) > 0)
  const completas = validas.filter((r) => faltantes(c, r) === 0)
  const base = completas.length ? completas : validas
  return base.reduce<RespostaCotacao | undefined>((m, r) => (!m || totalDe(c, r) < totalDe(c, m) ? r : m), undefined)
}

export function menorPrecoItem(c: Cotacao, i: number): number {
  const ps = c.respostas.map((r) => r.precos[i]).filter((p) => p > 0)
  return ps.length ? Math.min(...ps) : 0
}

/** Combinação: cada item no fornecedor mais barato; soma o frete de cada fornecedor envolvido. */
export function melhorPorItem(c: Cotacao) {
  const envolvidos = new Map<string, RespostaCotacao>()
  let produtos = 0
  let semPreco = 0
  c.itens.forEach((it, i) => {
    let melhor: RespostaCotacao | undefined
    for (const r of c.respostas) if (r.precos[i] > 0 && (!melhor || r.precos[i] < melhor.precos[i])) melhor = r
    if (!melhor) { semPreco++; return }
    produtos += melhor.precos[i] * it.quantidade
    envolvidos.set(melhor.fornecedorId, melhor)
  })
  const resps = [...envolvidos.values()]
  const frete = resps.reduce((s, r) => s + (r.frete || 0), 0)
  const outras = resps.reduce((s, r) => s + (r.outrasDespesas || 0), 0)
  return { produtos, frete, outras, total: produtos + frete + outras, fornecedores: resps.length, semPreco }
}

export const novoId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function lerNumero(v: string): number {
  const n = Number(v.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}
