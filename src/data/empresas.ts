import type { Cliente, Dados, EmpresaGrupo } from '@/types'

/** Id da empresa principal (matriz). Registros sem `empresaId` pertencem a ela. */
export const EMPRESA_PRINCIPAL_ID = 'emp-ba'

export const EMPRESAS_GRUPO: EmpresaGrupo[] = [
  { id: 'emp-ba', nome: 'Aerobrasil Drones', nomeCurto: 'BA', cnpj: '00.000.000/0001-00', cidade: 'Barra da Estiva', uf: 'BA' },
  { id: 'emp-sm', nome: 'Aerobrasil Sul', nomeCurto: 'SM', cnpj: '00.000.001/0001-00', cidade: 'Santa Maria', uf: 'RS' },
  { id: 'emp-ca', nome: 'Aerobrasil Cruz Alta', nomeCurto: 'CA', cnpj: '00.000.002/0001-00', cidade: 'Cruz Alta', uf: 'RS' },
]

const CIDADES_CA = ['Cruz Alta', 'Tupanciretã']
const CIDADES_SM = ['Santa Maria', 'Júlio de Castilhos']

/** Empresa que atende a cidade/UF (usado para distribuir os dados fictícios). */
export function empresaDaCidade(cidade: string, uf: string): string {
  if (CIDADES_CA.includes(cidade)) return 'emp-ca'
  if (CIDADES_SM.includes(cidade) || (uf === 'RS')) return 'emp-sm'
  return EMPRESA_PRINCIPAL_ID
}

/** Distribui o estoque total de forma determinística (índice do produto). Soma sempre igual a `estoque`. */
export function distribuirEstoque(estoque: number, i: number, ids: string[] = EMPRESAS_GRUPO.map((e) => e.id)): Record<string, number> {
  const [ba, sm, ca] = ids
  if (!sm) return { [ba]: estoque }
  let q_sm = Math.floor(estoque * (0.2 + 0.1 * (i % 3)))
  let q_ca = ca ? Math.floor(estoque * 0.1 * ((i + 1) % 3)) : 0
  let q_ba = estoque - q_sm - q_ca
  if (i % 7 === 0 && estoque >= 2) { q_ca += q_ba; q_ba = 0 }
  const r: Record<string, number> = { [ba]: q_ba, [sm]: q_sm }
  if (ca) r[ca] = q_ca
  return r
}

export const somaEstoque = (m: Record<string, number> | undefined): number => Object.values(m ?? {}).reduce((a, b) => a + b, 0)

/** Aplica empresas, empresaId e estoque por empresa nos dados do seed. */
export function distribuirEmpresas(d: Dados): Dados {
  const cli = new Map<string, Cliente>(d.clientes.map((c) => [c.id, c]))
  const doCliente = (id?: string) => { const c = id ? cli.get(id) : undefined; return c ? empresaDaCidade(c.cidade, c.uf) : EMPRESA_PRINCIPAL_ID }
  const porIdx = (i: number) => (i % 10 === 4 ? 'emp-sm' : i % 10 === 8 ? 'emp-ca' : EMPRESA_PRINCIPAL_ID)
  const empOS = new Map(d.ordens.map((o) => [o.id, doCliente(o.clienteId)]))
  return {
    ...d,
    empresas: EMPRESAS_GRUPO.map((e) => ({ ...e })),
    produtos: d.produtos.map((p, i) => ({ ...p, estoquePorEmpresa: distribuirEstoque(p.estoque, i) })),
    clientes: d.clientes.map((c) => ({ ...c, empresaId: empresaDaCidade(c.cidade, c.uf) })),
    orcamentos: d.orcamentos.map((o) => ({ ...o, empresaId: doCliente(o.clienteId) })),
    ordens: d.ordens.map((o) => ({ ...o, empresaId: doCliente(o.clienteId) })),
    notas: d.notas.map((n, i) => ({ ...n, empresaId: n.clienteId ? doCliente(n.clienteId) : porIdx(i) })),
    lancamentos: d.lancamentos.map((l, i) => ({ ...l, empresaId: l.clienteId ? doCliente(l.clienteId) : porIdx(i) })),
    leads: d.leads.map((l, i) => ({ ...l, empresaId: l.uf === 'RS' ? empresaDaCidade(l.cidade, l.uf) : porIdx(i * 3) })),
    compromissos: d.compromissos.map((c, i) => ({ ...c, empresaId: (c.osId && empOS.get(c.osId)) || (c.clienteId ? doCliente(c.clienteId) : porIdx(i)) })),
    movimentacoes: d.movimentacoes.map((m, i) => ({ ...m, empresaId: porIdx(i) })),
    cotacoes: d.cotacoes.map((c, i) => ({ ...c, empresaId: (c.osId && empOS.get(c.osId)) || porIdx(i * 3) })),
    chamados: d.chamados.map((c) => ({ ...c, empresaId: doCliente(c.clienteId) })),
    conversas: d.conversas.map((c, i) => ({ ...c, empresaId: c.clienteId ? doCliente(c.clienteId) : porIdx(i * 3) })),
  }
}
