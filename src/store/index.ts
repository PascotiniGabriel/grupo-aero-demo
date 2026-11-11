import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dados, Empresa, Movimentacao } from '@/types'
import { criarDadosDemo } from '@/data/seed'

export function novoId(prefixo = 'id'): string {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Nomes das coleções (arrays com `id`) da store. */
export type Colecao = {
  [K in keyof Dados]: Dados[K] extends Array<{ id: string }> ? K : never
}[keyof Dados]
export type ItemDe<K extends Colecao> = Dados[K][number]

export interface Estado extends Dados {
  usuarioAtualId: string
  salvar: <K extends Colecao>(colecao: K, item: ItemDe<K>) => void
  remover: (colecao: Colecao, id: string) => void
  movimentarEstoque: (m: {
    produtoId: string; tipo: 'entrada' | 'saida'; quantidade: number; origem: string; valorUnit?: number
  }) => void
  proximoNumero: (tipo: 'orcamento' | 'os' | 'nota') => number
  salvarEmpresa: (e: Empresa) => void
  definirUsuario: (id: string) => void
  restaurarDemo: () => void
}

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      ...criarDadosDemo(),
      usuarioAtualId: 'usr-1',

      salvar: (colecao, item) =>
        set((s) => {
          const lista = s[colecao] as Array<{ id: string }>
          const existe = lista.some((x) => x.id === item.id)
          const nova = existe ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item]
          return { [colecao]: nova } as Partial<Estado>
        }),

      remover: (colecao, id) =>
        set((s) => ({ [colecao]: (s[colecao] as Array<{ id: string }>).filter((x) => x.id !== id) }) as Partial<Estado>),

      movimentarEstoque: ({ produtoId, tipo, quantidade, origem, valorUnit }) =>
        set((s) => {
          const p = s.produtos.find((x) => x.id === produtoId)
          if (!p || quantidade <= 0) return {}
          const delta = tipo === 'entrada' ? quantidade : -quantidade
          const mov: Movimentacao = {
            id: novoId('mov'), produtoId, tipo, quantidade, data: new Date().toISOString(), origem,
            valorUnit: valorUnit ?? (tipo === 'entrada' ? p.custo : p.preco),
          }
          return {
            produtos: s.produtos.map((x) => (x.id === produtoId ? { ...x, estoque: Math.max(0, x.estoque + delta) } : x)),
            movimentacoes: [mov, ...s.movimentacoes],
          }
        }),

      proximoNumero: (tipo) => {
        const s = get()
        const nums = tipo === 'orcamento' ? s.orcamentos.map((x) => x.numero) : tipo === 'os' ? s.ordens.map((x) => x.numero) : s.notas.map((x) => x.numero)
        const base = tipo === 'orcamento' ? 2097 : tipo === 'os' ? 1030 : 5500
        return Math.max(base, ...nums) + 1
      },

      salvarEmpresa: (empresa) => set({ empresa }),
      definirUsuario: (usuarioAtualId) => set({ usuarioAtualId }),
      restaurarDemo: () => set({ ...criarDadosDemo(), usuarioAtualId: 'usr-1' }),
    }),
    {
      name: 'aero-demo-v1',
      partialize: (s) => {
        // persiste só dados (sem funções)
        const { salvar, remover, movimentarEstoque, proximoNumero, salvarEmpresa, definirUsuario, restaurarDemo, ...dados } = s
        void salvar; void remover; void movimentarEstoque; void proximoNumero; void salvarEmpresa; void definirUsuario; void restaurarDemo
        return dados
      },
    },
  ),
)
