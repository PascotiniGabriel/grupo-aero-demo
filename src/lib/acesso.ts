import type { Usuario } from '@/types'

export type Papel = Usuario['papel']

/** Primeiro trecho da rota ('' = Início) que cada papel pode abrir. Gestor abre tudo. */
const PERMITIDAS: Record<Papel, string[] | 'tudo'> = {
  Gestor: 'tudo',
  Vendas: ['', 'funil', 'orcamentos', 'clientes', 'conversas', 'estoque', 'catalogo', 'assistente', 'config'],
  Técnico: ['agenda', 'os', 'relatorios', 'estoque', 'catalogo', 'assistente', 'config'],
  Estoque: ['', 'estoque', 'catalogo', 'notas', 'os', 'assistente', 'config'],
}

function segmento(rota: string): string {
  return rota.replace(/^#?\/?/, '').split(/[/?#]/)[0] ?? ''
}

/** A rota (ex.: '/os/os-12') é permitida para o papel? `/config` abre para todos (só "Meu perfil" e "Uso sem internet" para quem não é Gestor). */
export function podeAcessar(papel: Papel, rota: string): boolean {
  const p = PERMITIDAS[papel]
  return p === 'tudo' || p.includes(segmento(rota))
}

/** Página inicial de cada papel. */
export function inicioDoPapel(papel: Papel): string {
  return papel === 'Técnico' ? '/agenda' : '/'
}

export const VISAO_POR_PAPEL: Record<Papel, string> = {
  Gestor: 'Vê tudo: painel, funil, orçamentos, oficina, estoque, notas, financeiro e configurações.',
  Vendas: 'Início comercial, funil, orçamentos, clientes, conversas, consulta de peças, catálogo e assistente. Sem financeiro nem custos.',
  Técnico: 'Minha agenda, ordens de serviço, relatórios de manutenção, consulta de peças, catálogo e assistente.',
  Estoque: 'Início de estoque, peças e produtos, catálogo, notas fiscais (entrada por XML), consulta das ordens de serviço e assistente.',
}

// ---------------------------------------------------------------- Assistente IA: assuntos por papel

export type Assunto =
  | 'estoque_quantidade' | 'preco_venda' | 'custo_margem' | 'compatibilidade' | 'peso_frete'
  | 'os_oficina' | 'os_status_cliente' | 'agenda_tecnico' | 'clientes_historico' | 'historico_tecnico'
  | 'orcamentos' | 'funil' | 'faturamento' | 'contas_financeiro' | 'compras_giro' | 'entradas_nf' | 'tecnico_manutencao'

const TODOS_ASSUNTOS: Assunto[] = [
  'estoque_quantidade', 'preco_venda', 'custo_margem', 'compatibilidade', 'peso_frete', 'os_oficina', 'os_status_cliente',
  'agenda_tecnico', 'clientes_historico', 'historico_tecnico', 'orcamentos', 'funil', 'faturamento', 'contas_financeiro',
  'compras_giro', 'entradas_nf', 'tecnico_manutencao',
]

/** O que o Assistente IA pode responder para cada papel (o que está fora é bloqueado antes de calcular e antes de chamar o modelo). */
export const ASSUNTOS_IA: Record<Papel, Set<Assunto>> = {
  Gestor: new Set(TODOS_ASSUNTOS),
  Vendas: new Set<Assunto>([
    'clientes_historico', 'orcamentos', 'funil', 'preco_venda', 'estoque_quantidade', 'compatibilidade', 'peso_frete', 'os_status_cliente',
  ]),
  Técnico: new Set<Assunto>([
    'compatibilidade', 'estoque_quantidade', 'os_oficina', 'agenda_tecnico', 'historico_tecnico', 'tecnico_manutencao', 'peso_frete',
  ]),
  Estoque: new Set<Assunto>([
    'estoque_quantidade', 'compras_giro', 'custo_margem', 'preco_venda', 'compatibilidade', 'peso_frete', 'entradas_nf', 'os_oficina',
  ]),
}

export const assuntoPermitido = (papel: Papel, a: Assunto): boolean => ASSUNTOS_IA[papel].has(a)
