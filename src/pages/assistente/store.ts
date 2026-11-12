import { create } from 'zustand'
import { useStore, novoId } from '@/store'
import { responder, type LinkResposta } from '@/lib/ai/assistente'
import type { Papel } from '@/lib/acesso'
import { diasAtras } from '@/data/seed'

export interface MensagemChat {
  id: string
  papel: 'usuario' | 'ia'
  texto: string
  links?: LinkResposta[]
  fonte?: string
  continuacoes?: string[]
  erro?: boolean
}

export interface DocumentoBase {
  id: string
  nome: string
  tipo: 'Catálogo' | 'Manual' | 'Preços' | 'Procedimento'
  detalhe: string
  data: string
  situacao: 'lido' | 'lendo'
  progresso: number
  etapa?: string
}

function documentosIniciais(): DocumentoBase[] {
  const d = (id: string, nome: string, tipo: DocumentoBase['tipo'], detalhe: string, dias: number): DocumentoBase =>
    ({ id, nome, tipo, detalhe, data: diasAtras(dias), situacao: 'lido', progresso: 100 })
  return [
    d('doc-1', 'Catálogo de peças e vista explodida, T40 e T50', 'Catálogo', '186 páginas', 42),
    d('doc-2', 'Catálogo de peças e vista explodida, T25 e T30', 'Catálogo', '152 páginas', 42),
    d('doc-3', 'Catálogo de peças, T55, T70P e T100', 'Catálogo', '204 páginas', 18),
    d('doc-4', 'Manual de manutenção, Agras T40', 'Manual', '96 páginas', 40),
    d('doc-5', 'Manual de manutenção, Agras T50', 'Manual', '104 páginas', 40),
    d('doc-6', 'Tabela de preços de peças e serviços', 'Preços', 'atualizada pela gestão', 6),
    d('doc-7', 'Procedimento da oficina: recebimento e diagnóstico', 'Procedimento', '12 páginas', 75),
    d('doc-8', 'Procedimento da oficina: pós-queda e calibração', 'Procedimento', '9 páginas', 75),
  ]
}

/** Tipos de documento da base de conhecimento que cada papel enxerga (o técnico não vê tabela de preços). */
export const TIPOS_DOC_POR_PAPEL: Record<Papel, DocumentoBase['tipo'][]> = {
  Gestor: ['Catálogo', 'Manual', 'Preços', 'Procedimento'],
  Vendas: ['Catálogo', 'Preços'],
  Técnico: ['Catálogo', 'Manual', 'Procedimento'],
  Estoque: ['Catálogo', 'Manual', 'Procedimento'],
}

interface Estado {
  /** Usuário a quem pertence a conversa atual; trocar de perfil descarta a conversa. */
  dono?: string
  msgs: MensagemChat[]
  carregando: boolean
  docs: DocumentoBase[]
  enviar: (pergunta: string) => Promise<void>
  nova: () => void
  adicionarDocumento: (arquivo: { nome: string; tamanhoKb: number }) => void
}

export const useAssistente = create<Estado>()((set, get) => ({
  msgs: [],
  carregando: false,
  docs: documentosIniciais(),

  enviar: async (texto) => {
    const pergunta = texto.trim()
    if (!pergunta || get().carregando) return
    const estado = useStore.getState()
    const usuario = estado.usuarios.find((u) => u.id === estado.usuarioAtualId)
    const outroPerfil = get().dono !== undefined && get().dono !== usuario?.id
    const anteriores = outroPerfil ? [] : get().msgs
    const historico = anteriores.map((m) => ({ papel: m.papel, texto: m.texto }))
    set({ dono: usuario?.id, msgs: [...anteriores, { id: novoId('msg'), papel: 'usuario', texto: pergunta }], carregando: true })
    try {
      const r = await responder(pergunta, historico, estado, { papel: usuario?.papel ?? 'Gestor', usuario })
      set((s) => ({
        msgs: [...s.msgs, { id: novoId('msg'), papel: 'ia', texto: r.texto, links: r.links, fonte: r.fonte, continuacoes: r.continuacoes }],
      }))
    } catch {
      set((s) => ({
        msgs: [...s.msgs, { id: novoId('msg'), papel: 'ia', erro: true, texto: 'Não consegui responder agora. Tente de novo em instantes.' }],
      }))
    } finally {
      set({ carregando: false })
    }
  },

  nova: () => set({ msgs: [], carregando: false, dono: undefined }),

  adicionarDocumento: ({ nome, tamanhoKb }) => {
    const id = novoId('doc')
    const limpo = nome.replace(/\.[^.]+$/, '')
    const tipo: DocumentoBase['tipo'] = /manual/i.test(nome) ? 'Manual' : /pre[cç]o|tabela/i.test(nome) ? 'Preços' : /procedimento|norma/i.test(nome) ? 'Procedimento' : 'Catálogo'
    const doc: DocumentoBase = {
      id, nome: limpo, tipo, detalhe: tamanhoKb >= 1024 ? `${(tamanhoKb / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(tamanhoKb))} KB`,
      data: new Date().toISOString(), situacao: 'lendo', progresso: 0, etapa: 'Enviando o arquivo',
    }
    set((s) => ({ docs: [doc, ...s.docs] }))
    const etapas = [[0, 'Enviando o arquivo'], [30, 'Lendo as páginas'], [65, 'Indexando o conteúdo'], [90, 'Conferindo as peças citadas']] as const
    const t = setInterval(() => {
      const atual = get().docs.find((x) => x.id === id)
      if (!atual) { clearInterval(t); return }
      const prox = Math.min(100, atual.progresso + 7 + Math.round(Math.random() * 8))
      const etapa = [...etapas].reverse().find(([p]) => prox >= p)?.[1]
      set((s) => ({
        docs: s.docs.map((x) => (x.id === id ? { ...x, progresso: prox, etapa, situacao: prox >= 100 ? 'lido' : 'lendo' } : x)),
      }))
      if (prox >= 100) clearInterval(t)
    }, 380)
  },
}))
