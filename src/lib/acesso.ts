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
