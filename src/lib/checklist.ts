import { CHECKLIST_ATENDIMENTO, CHECKLIST_SERVICO } from '@/data/checklists'
import { SERVICOS } from '@/data/pessoas'
import type { Empresa, ItemChecklist, Servico } from '@/types'

export type Atendimento = 'oficina' | 'campo'
export const ROTULO_ATENDIMENTO: Record<Atendimento, string> = { campo: 'Atendimento em campo', oficina: 'Atendimento na oficina' }

/** Obrigações do serviço (vem do cadastro; sem cadastro, do modelo padrão). */
export const checklistDoServico = (s: Pick<Servico, 'id' | 'checklist'>): string[] => s.checklist ?? CHECKLIST_SERVICO[s.id] ?? []

/** Modelos por tipo de atendimento (ausentes na empresa = padrão). */
export const modelosAtendimento = (e?: Pick<Empresa, 'checklistAtendimento'>) => e?.checklistAtendimento ?? CHECKLIST_ATENDIMENTO

const chave = (t: string) => t.trim().toLowerCase()

/** Monta o checklist: modelo do atendimento primeiro, depois cada serviço; sem repetir texto. */
export function montarChecklist({ servicoIds, atendimento, servicos, empresa }: {
  servicoIds: string[]; atendimento?: Atendimento; servicos?: Servico[]; empresa?: Pick<Empresa, 'checklistAtendimento'>
}): ItemChecklist[] {
  const vistos = new Set<string>()
  const saida: ItemChecklist[] = []
  const add = (textos: string[], origem: string) => {
    for (const t of textos) {
      if (!t.trim() || vistos.has(chave(t))) continue
      vistos.add(chave(t)); saida.push({ texto: t, feito: false, origem })
    }
  }
  if (atendimento) add(modelosAtendimento(empresa)[atendimento], ROTULO_ATENDIMENTO[atendimento])
  const lista = servicos ?? SERVICOS
  for (const id of servicoIds) {
    const s = lista.find((x) => x.id === id)
    if (s) add(checklistDoServico(s), s.nome)
  }
  return saida
}

/** Acrescenta itens novos a um checklist existente, sem duplicar texto. */
export function mesclarChecklist(atual: ItemChecklist[] | undefined, novos: ItemChecklist[]): ItemChecklist[] {
  const base = atual ?? []
  const vistos = new Set(base.map((i) => chave(i.texto)))
  return [...base, ...novos.filter((i) => !vistos.has(chave(i.texto)))]
}

export interface GrupoChecklist { origem: string; itens: { item: ItemChecklist; idx: number }[] }

/** Agrupa por origem mantendo a ordem; itens sem origem ficam em "Avulsos". Guarda o índice original. */
export function agruparChecklist(lista: ItemChecklist[]): GrupoChecklist[] {
  const grupos: GrupoChecklist[] = []
  lista.forEach((item, idx) => {
    const origem = item.origem ?? 'Avulsos'
    let g = grupos.find((x) => x.origem === origem)
    if (!g) { g = { origem, itens: [] }; grupos.push(g) }
    g.itens.push({ item, idx })
  })
  return grupos
}

export const progressoChecklist = (lista?: ItemChecklist[]) => ({ feitos: (lista ?? []).filter((i) => i.feito).length, total: (lista ?? []).length })
