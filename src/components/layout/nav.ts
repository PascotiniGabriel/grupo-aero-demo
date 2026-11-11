import {
  BookOpen, ClipboardCheck, FileText, House, MessageCircle, Package, Receipt, SquareKanban, Users, Wallet, Wrench, type LucideIcon,
} from 'lucide-react'

export interface ItemNav {
  para: string
  rotulo: string
  icone: LucideIcon
  /** Só fica ativo na rota exata (usado no Início). */
  exato?: boolean
  contador?: 'conversas'
}
export interface GrupoNav { titulo?: string; itens: ItemNav[] }

export const GRUPOS_NAV: GrupoNav[] = [
  { itens: [{ para: '/', rotulo: 'Início', icone: House, exato: true }] },
  {
    titulo: 'Vendas',
    itens: [
      { para: '/funil', rotulo: 'Funil de vendas', icone: SquareKanban },
      { para: '/orcamentos', rotulo: 'Orçamentos', icone: FileText },
      { para: '/clientes', rotulo: 'Clientes', icone: Users },
      { para: '/conversas', rotulo: 'Conversas', icone: MessageCircle, contador: 'conversas' },
    ],
  },
  {
    titulo: 'Oficina',
    itens: [
      { para: '/os', rotulo: 'Ordens de serviço', icone: Wrench },
      { para: '/relatorios', rotulo: 'Relatórios de manutenção', icone: ClipboardCheck },
    ],
  },
  {
    titulo: 'Estoque',
    itens: [
      { para: '/estoque', rotulo: 'Peças e produtos', icone: Package },
      { para: '/catalogo', rotulo: 'Catálogo', icone: BookOpen },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { para: '/notas', rotulo: 'Notas fiscais', icone: Receipt },
      { para: '/financeiro', rotulo: 'Financeiro', icone: Wallet },
    ],
  },
]

export const ITENS_NAV: ItemNav[] = GRUPOS_NAV.flatMap((g) => g.itens)
