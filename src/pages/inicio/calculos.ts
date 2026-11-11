import type { Dados, ItemComercial } from '@/types'
import { totalItens, totalOrcamento } from '@/store/selectors'
import { statusLancamento } from '@/components/ui'

const DIA = 86400000
export type Periodo = 30 | 90 | 180

export interface Venda { data: number; drones: number; pecas: number; servicos: number; total: number }

function repartir(itens: ItemComercial[], fator: number) {
  const r = { drones: 0, pecas: 0, servicos: 0 }
  for (const i of itens) {
    const v = i.quantidade * i.valorUnit * fator
    if (i.tipo === 'drone') r.drones += v
    else if (i.tipo === 'servico') r.servicos += v
    else r.pecas += v
  }
  return r
}

/** Vendas realizadas: orçamentos aprovados + OS prontas/entregues que não vieram de orçamento. */
export function listarVendas(d: Pick<Dados, 'orcamentos' | 'ordens'>): Venda[] {
  const out: Venda[] = []
  for (const o of d.orcamentos) {
    if (o.status !== 'aprovado') continue
    const bruto = totalItens(o.itens)
    const total = totalOrcamento(o)
    out.push({ data: new Date(o.data).getTime(), ...repartir(o.itens, bruto > 0 ? total / bruto : 1), total })
  }
  for (const os of d.ordens) {
    if (os.orcamentoId || (os.status !== 'pronto' && os.status !== 'entregue')) continue
    out.push({ data: new Date(os.conclusao ?? os.abertura).getTime(), ...repartir(os.itens, 1), total: totalItens(os.itens) })
  }
  return out
}

export function somaVendas(v: Venda[], de: number, ate: number): number {
  return v.filter((x) => x.data >= de && x.data < ate).reduce((s, x) => s + x.total, 0)
}

export function vendasPorMes(v: Venda[], meses = 6) {
  const hoje = new Date()
  const out: { mes: string; drones: number; pecas: number; servicos: number }[] = []
  for (let k = meses - 1; k >= 0; k--) {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() - k, 1).getTime()
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() - k + 1, 1).getTime()
    const nome = new Date(ini).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const r = { mes: nome, drones: 0, pecas: 0, servicos: 0 }
    for (const x of v) if (x.data >= ini && x.data < fim) { r.drones += x.drones; r.pecas += x.pecas; r.servicos += x.servicos }
    out.push(r)
  }
  return out
}

export function contaVencidos(lanc: Dados['lancamentos'], tipo: 'receber' | 'pagar') {
  const l = lanc.filter((x) => x.tipo === tipo && statusLancamento(x) === 'vencido')
  return { qtd: l.length, valor: l.reduce((s, x) => s + x.valor, 0) }
}

export const diasMs = (n: number) => n * DIA
