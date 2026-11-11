import type { ItemComercial, ModeloDrone, Movimentacao, Orcamento, Produto } from '@/types'
import { useStore } from './index'

export function porId<T extends { id: string }>(lista: T[], id: string | undefined): T | undefined {
  return id ? lista.find((x) => x.id === id) : undefined
}

export function totalItens(itens: ItemComercial[]): number {
  return itens.reduce((s, i) => s + i.quantidade * i.valorUnit, 0)
}

export function totalOrcamento(o: Pick<Orcamento, 'itens' | 'desconto' | 'frete'>): number {
  return Math.max(0, totalItens(o.itens) - (o.desconto || 0) + (o.frete || 0))
}

/** Peso total em gramas dos itens que referenciam produtos. */
export function pesoItens(itens: ItemComercial[], produtos: Produto[]): number {
  return itens.reduce((s, i) => {
    const p = i.produtoId ? produtos.find((x) => x.id === i.produtoId) : undefined
    return s + (p ? p.pesoG * i.quantidade : 0)
  }, 0)
}

/** Quantidade total saída por produto nos últimos `dias` dias. */
export function saidasPorProduto(movs: Movimentacao[], dias: number): Record<string, number> {
  const corte = Date.now() - dias * 86400000
  const out: Record<string, number> = {}
  for (const m of movs) {
    if (m.tipo === 'saida' && new Date(m.data).getTime() >= corte) out[m.produtoId] = (out[m.produtoId] ?? 0) + m.quantidade
  }
  return out
}

/** Nome do modelo (ex.: "T40") a partir do id; fora de componente lê a store atual. */
export function nomeModelo(id: string, modelos?: ModeloDrone[]): string {
  const lista = modelos ?? useStore.getState().modelos
  return lista.find((m) => m.id === id)?.nome ?? id.toUpperCase()
}
