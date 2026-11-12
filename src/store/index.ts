import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { Dados, Empresa, Movimentacao } from '@/types'
import { criarDadosDemo } from '@/data/seed'
import { useSync } from '@/lib/sync'
import { idbStorage } from './armazenamento'

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

const ROTULO: Record<string, string> = {
  clientes: 'Cliente', equipamentos: 'Drone', orcamentos: 'Orçamento', ordens: 'OS', notas: 'Nota fiscal', lancamentos: 'Lançamento',
  leads: 'Lead', conversas: 'Conversa', produtos: 'Peça', movimentacoes: 'Movimentação', servicos: 'Serviço', usuarios: 'Usuário', modelos: 'Modelo',
  compromissos: 'Compromisso',
}

type Qualquer = Record<string, unknown>

function nomeDoItem(colecao: string, it: Qualquer | undefined): string {
  const r = ROTULO[colecao] ?? colecao
  if (!it) return r
  if (typeof it.numero === 'number') return `${r} ${it.numero}`
  const nome = it.nome ?? it.titulo ?? it.descricao ?? it.apelido
  return typeof nome === 'string' ? `${r} ${nome}` : r
}

/** Texto legível da alteração, para a fila de sincronização. */
function descrever(colecao: string, antes: Qualquer | undefined, depois: Qualquer | undefined, removido = false): string {
  const nome = nomeDoItem(colecao, depois ?? antes)
  if (removido) return `${nome} — removido`
  if (!antes) return `${nome} — criado`
  const fa = Array.isArray(antes.fotos) ? antes.fotos.length : undefined
  const fd = Array.isArray(depois?.fotos) ? (depois!.fotos as unknown[]).length : undefined
  if (fa !== undefined && fd !== undefined && fd !== fa) {
    const n = Math.abs(fd - fa)
    return `${nome} — ${n} ${n === 1 ? 'foto' : 'fotos'} ${fd > fa ? 'adicionada' : 'removida'}${n === 1 ? '' : 's'}`
  }
  if (antes.status !== undefined && depois && antes.status !== depois.status) return `${nome} — status: ${String(depois.status).replace(/_/g, ' ')}`
  return `${nome} — atualizado`
}

/** localStorage antigo (v1) é lido uma vez e migrado para o IndexedDB. */
const CHAVE_ANTIGA = 'aero-demo-v1'
const storage: StateStorage = {
  getItem: async (nome) => {
    const atual = await idbStorage.getItem(nome)
    if (atual) return atual
    try { return localStorage.getItem(CHAVE_ANTIGA) } catch { return null }
  },
  setItem: async (nome, valor) => {
    await idbStorage.setItem(nome, valor)
    try { localStorage.removeItem(CHAVE_ANTIGA) } catch { /* ignora */ }
  },
  removeItem: (nome) => idbStorage.removeItem(nome),
}

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      ...criarDadosDemo(),
      usuarioAtualId: 'usr-1',

      salvar: (colecao, item) => {
        const lista = get()[colecao] as Array<{ id: string }>
        const antes = lista.find((x) => x.id === item.id)
        const nova = antes ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item]
        useSync.getState().registrar({ acao: 'salvar', colecao, itemId: item.id, resumo: descrever(colecao, antes as Qualquer | undefined, item as unknown as Qualquer) })
        set({ [colecao]: nova } as Partial<Estado>)
      },

      remover: (colecao, id) => {
        const lista = get()[colecao] as Array<{ id: string }>
        useSync.getState().registrar({ acao: 'remover', colecao, itemId: id, resumo: descrever(colecao, lista.find((x) => x.id === id) as Qualquer | undefined, undefined, true) })
        set({ [colecao]: lista.filter((x) => x.id !== id) } as Partial<Estado>)
      },

      movimentarEstoque: ({ produtoId, tipo, quantidade, origem, valorUnit }) => {
        const s = get()
        const p = s.produtos.find((x) => x.id === produtoId)
        if (!p || quantidade <= 0) return
        const delta = tipo === 'entrada' ? quantidade : -quantidade
        const mov: Movimentacao = {
          id: novoId('mov'), produtoId, tipo, quantidade, data: new Date().toISOString(), origem,
          valorUnit: valorUnit ?? (tipo === 'entrada' ? p.custo : p.preco),
        }
        useSync.getState().registrar({ acao: 'estoque', colecao: 'produtos', itemId: produtoId, resumo: `${p.nome} — ${tipo === 'entrada' ? 'entrada' : 'saída'} de ${quantidade}` })
        set({
          produtos: s.produtos.map((x) => (x.id === produtoId ? { ...x, estoque: Math.max(0, x.estoque + delta) } : x)),
          movimentacoes: [mov, ...s.movimentacoes],
        })
      },

      proximoNumero: (tipo) => {
        const s = get()
        const nums = tipo === 'orcamento' ? s.orcamentos.map((x) => x.numero) : tipo === 'os' ? s.ordens.map((x) => x.numero) : s.notas.map((x) => x.numero)
        const base = tipo === 'orcamento' ? 2097 : tipo === 'os' ? 1030 : 5500
        return Math.max(base, ...nums) + 1
      },

      salvarEmpresa: (empresa) => {
        useSync.getState().registrar({ acao: 'empresa', colecao: 'empresa', itemId: 'empresa', resumo: 'Dados da empresa — atualizados' })
        set({ empresa })
      },
      definirUsuario: (usuarioAtualId) => set({ usuarioAtualId }),
      restaurarDemo: () => {
        useSync.setState({ fila: [], enviados: [] })
        set({ ...criarDadosDemo(), usuarioAtualId: 'usr-1' })
      },
    }),
    {
      name: 'aero-demo-v2',
      version: 2,
      storage: createJSONStorage(() => storage),
      // Estado antigo: mantém o que existe; coleções novas (ex.: compromissos) vêm do estado inicial no merge.
      migrate: (persistido) => persistido as Estado,
      merge: (persistido, atual) => ({ ...atual, ...((persistido as Partial<Estado>) ?? {}) }),
      // persiste só dados (sem funções)
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')) as unknown as Estado,
    },
  ),
)

/** Resolve quando o estado salvo no aparelho terminou de carregar. */
export function aguardarHidratacao(): Promise<void> {
  if (useStore.persist.hasHydrated()) return Promise.resolve()
  return new Promise((ok) => { useStore.persist.onFinishHydration(() => ok()) })
}
