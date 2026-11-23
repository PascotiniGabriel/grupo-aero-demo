import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { Dados, EmpresaGrupo, Empresa, Movimentacao, Produto } from '@/types'
import { criarDadosDemo } from '@/data/seed'
import { EMPRESA_PRINCIPAL_ID, EMPRESAS_GRUPO, distribuirEstoque, somaEstoque } from '@/data/empresas'
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
  /** Filtro global: ids das empresas em vista (uma, várias ou todas). Persistido. */
  empresaSelecionada: string[]
  /** Ainda não escolheu nesta sessão? (não persistido; ver sessionStorage em lib/empresas). */
  definirEmpresaSelecionada: (ids: string[]) => void
  salvar: <K extends Colecao>(colecao: K, item: ItemDe<K>) => void
  remover: (colecao: Colecao, id: string) => void
  /** `empresaId` = empresa cujo estoque muda (padrão: a única selecionada, senão a principal). */
  movimentarEstoque: (m: {
    produtoId: string; tipo: 'entrada' | 'saida'; quantidade: number; origem: string; valorUnit?: number; empresaId?: string
  }) => void
  proximoNumero: (tipo: 'orcamento' | 'os' | 'nota') => number
  salvarEmpresa: (e: Empresa) => void
  definirUsuario: (id: string) => void
  restaurarDemo: () => void
}

const ROTULO: Record<string, string> = {
  clientes: 'Cliente', equipamentos: 'Drone', orcamentos: 'Orçamento', ordens: 'OS', notas: 'Nota fiscal', lancamentos: 'Lançamento',
  leads: 'Lead', conversas: 'Conversa', produtos: 'Peça', movimentacoes: 'Movimentação', servicos: 'Serviço', usuarios: 'Usuário', modelos: 'Modelo',
  compromissos: 'Compromisso', fornecedores: 'Fornecedor', cotacoes: 'Cotação', chamados: 'Chamado', empresas: 'Empresa',
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

/** Mantém `estoque` (total) coerente com `estoquePorEmpresa`. Se só `estoque` mudou (ex.: formulário da peça), a diferença vai para a principal. */
function normalizarEstoque(p: Produto, empresas: EmpresaGrupo[], idx = 0): Produto {
  if (!p.estoquePorEmpresa) return { ...p, estoquePorEmpresa: distribuirEstoque(p.estoque, idx, empresas.map((e) => e.id)) }
  const soma = somaEstoque(p.estoquePorEmpresa)
  if (soma === p.estoque) return p
  const por = { ...p.estoquePorEmpresa }
  por[EMPRESA_PRINCIPAL_ID] = Math.max(0, (por[EMPRESA_PRINCIPAL_ID] ?? 0) + (p.estoque - soma))
  return { ...p, estoquePorEmpresa: por, estoque: somaEstoque(por) }
}

/** Dados salvos prevalecem; o que faltou (coleção nova) vem do seed. Itens novos do seed (orçamentos 2110/2111) entram sem apagar nada do usuário. */
function mesclarComSeed(salvo: Partial<Estado>, atual: Estado): Estado {
  const r = { ...atual, ...salvo } as Estado
  const chaves = ['fornecedores', 'cotacoes', 'chamados', 'compromissos'] as const
  for (const k of chaves) if (!Array.isArray(salvo[k])) (r as unknown as Qualquer)[k] = atual[k]
  const orc = r.orcamentos ?? []
  const novos = atual.orcamentos.filter((o) => ['orc-2110', 'orc-2111'].includes(o.id) && !orc.some((x) => x.id === o.id))
  if (novos.length && orc.length) r.orcamentos = [...orc, ...novos]
  // Plano de suporte: empresa ganha os planos; clientes sem a chave `suporte` recebem a do seed; chamado de uso alto entra uma vez.
  if (!r.empresa?.planosSuporte) r.empresa = { ...r.empresa, planosSuporte: atual.empresa.planosSuporte }
  if (Array.isArray(r.clientes)) {
    r.clientes = r.clientes.map((c) => {
      const base = atual.clientes.find((x) => x.id === c.id)
      return !('suporte' in c) && base?.suporte ? { ...c, suporte: base.suporte } : c
    })
  }
  if (Array.isArray(r.chamados) && !r.chamados.some((c) => c.id === 'cha-9')) {
    const novo = atual.chamados.find((c) => c.id === 'cha-9')
    if (novo && r.chamados.length) r.chamados = [...r.chamados, novo]
  }
  // Multiempresa: empresas, estoque por empresa, empresaId (principal) e acesso dos usuários.
  if (!Array.isArray(salvo.empresas) || !salvo.empresas.length) r.empresas = atual.empresas
  if (!Array.isArray(salvo.empresaSelecionada) || !salvo.empresaSelecionada.length) r.empresaSelecionada = r.empresas.map((e) => e.id)
  if (Array.isArray(r.produtos)) r.produtos = r.produtos.map((p, i) => normalizarEstoque(p, r.empresas, i))
  const comEmpresa = <T extends { empresaId?: string }>(l: T[] | undefined) => (Array.isArray(l) ? l.map((x) => (x.empresaId ? x : { ...x, empresaId: EMPRESA_PRINCIPAL_ID })) : l)
  for (const k of ['orcamentos', 'ordens', 'notas', 'lancamentos', 'leads', 'compromissos', 'movimentacoes', 'cotacoes', 'chamados', 'conversas'] as const) {
    (r as unknown as Qualquer)[k] = comEmpresa(r[k] as Array<{ empresaId?: string }>)
  }
  if (Array.isArray(r.usuarios)) {
    r.usuarios = r.usuarios.map((u) => (u.empresaIds?.length ? u : { ...u, empresaIds: atual.usuarios.find((x) => x.id === u.id)?.empresaIds ?? r.empresas.map((e) => e.id) }))
  }
  return r
}

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      ...criarDadosDemo(),
      usuarioAtualId: 'usr-1',
      empresaSelecionada: EMPRESAS_GRUPO.map((e) => e.id),

      salvar: (colecao, item) => {
        const lista = get()[colecao] as Array<{ id: string }>
        const antes = lista.find((x) => x.id === item.id)
        const nova = antes ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item]
        useSync.getState().registrar({ acao: 'salvar', colecao, itemId: item.id, resumo: descrever(colecao, antes as Qualquer | undefined, item as unknown as Qualquer) })
        set({ [colecao]: colecao === 'produtos' ? (nova as Produto[]).map((p) => normalizarEstoque(p, get().empresas)) : nova } as Partial<Estado>)
      },

      remover: (colecao, id) => {
        const lista = get()[colecao] as Array<{ id: string }>
        useSync.getState().registrar({ acao: 'remover', colecao, itemId: id, resumo: descrever(colecao, lista.find((x) => x.id === id) as Qualquer | undefined, undefined, true) })
        set({ [colecao]: lista.filter((x) => x.id !== id) } as Partial<Estado>)
      },

      definirEmpresaSelecionada: (ids) => set({ empresaSelecionada: ids }),

      movimentarEstoque: ({ produtoId, tipo, quantidade, origem, valorUnit, empresaId }) => {
        const s = get()
        const p = s.produtos.find((x) => x.id === produtoId)
        if (!p || quantidade <= 0) return
        const delta = tipo === 'entrada' ? quantidade : -quantidade
        const emp = empresaId ?? (s.empresaSelecionada.length === 1 ? s.empresaSelecionada[0] : EMPRESA_PRINCIPAL_ID)
        const mov: Movimentacao = {
          id: novoId('mov'), empresaId: emp, produtoId, tipo, quantidade, data: new Date().toISOString(), origem,
          valorUnit: valorUnit ?? (tipo === 'entrada' ? p.custo : p.preco),
        }
        useSync.getState().registrar({ acao: 'estoque', colecao: 'produtos', itemId: produtoId, resumo: `${p.nome} — ${tipo === 'entrada' ? 'entrada' : 'saída'} de ${quantidade}` })
        set({
          produtos: s.produtos.map((x) => {
            if (x.id !== produtoId) return x
            const por = { ...(x.estoquePorEmpresa ?? {}) }
            por[emp] = Math.max(0, (por[emp] ?? 0) + delta)
            return { ...x, estoquePorEmpresa: por, estoque: somaEstoque(por) }
          }),
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
        set({ ...criarDadosDemo(), usuarioAtualId: 'usr-1', empresaSelecionada: EMPRESAS_GRUPO.map((e) => e.id) })
      },
    }),
    {
      name: 'aero-demo-v2',
      version: 3,
      storage: createJSONStorage(() => storage),
      // Estado antigo: mantém o que existe; coleções novas (compromissos, fornecedores, cotações, chamados) vêm do estado inicial no merge.
      migrate: (persistido) => persistido as Estado,
      merge: (persistido, atual) => mesclarComSeed((persistido as Partial<Estado>) ?? {}, atual),
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
