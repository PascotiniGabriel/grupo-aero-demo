import type { Cliente, Equipamento, Lancamento, NotaFiscal, Orcamento, OrdemServico } from '@/types'
import { statusLancamento } from '@/components/ui'

export interface DadosCliente {
  notas: NotaFiscal[]
  ordens: OrdemServico[]
  orcamentos: Orcamento[]
  lancamentos: Lancamento[]
  equipamentos: Equipamento[]
}

export function totalComprado(clienteId: string, notas: NotaFiscal[]): number {
  return notas.filter((n) => n.clienteId === clienteId && n.tipo === 'saida' && n.status === 'autorizada').reduce((s, n) => s + n.valor, 0)
}

export function emAberto(clienteId: string, lancamentos: Lancamento[]): number {
  return lancamentos.filter((l) => l.clienteId === clienteId && l.tipo === 'receber' && !l.pagoEm).reduce((s, l) => s + l.valor, 0)
}

export function vencidoCliente(clienteId: string, lancamentos: Lancamento[]): number {
  return lancamentos.filter((l) => l.clienteId === clienteId && l.tipo === 'receber' && statusLancamento(l) === 'vencido').reduce((s, l) => s + l.valor, 0)
}

/** Data (ISO) do atendimento mais recente: OS, orçamento ou nota. */
export function ultimoAtendimento(clienteId: string, d: Pick<DadosCliente, 'ordens' | 'orcamentos' | 'notas'>): string | undefined {
  const datas = [
    ...d.ordens.filter((o) => o.clienteId === clienteId).map((o) => o.abertura),
    ...d.orcamentos.filter((o) => o.clienteId === clienteId).map((o) => o.data),
    ...d.notas.filter((n) => n.clienteId === clienteId).map((n) => n.data),
  ].filter((x) => new Date(x).getTime() <= Date.now() + 86400000)
  return datas.sort().at(-1)
}

export const paraInput = (iso: string | undefined) => (iso ? iso.slice(0, 10) : '')
export const deInput = (v: string) => (v ? new Date(`${v}T12:00:00`).toISOString() : undefined)

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']
