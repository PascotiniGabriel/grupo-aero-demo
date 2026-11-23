/**
 * MULTIEMPRESA — guia rápido para quem aplica o filtro nos módulos (fase 2)
 * -------------------------------------------------------------------------
 * Modelo: o grupo tem várias empresas (CNPJs) em `store.empresas`. Catálogo de produtos e clientes
 * são do grupo; o resto dos registros tem `empresaId` (ausente = empresa principal).
 * O filtro global é `store.empresaSelecionada` (já restrito ao acesso do usuário em "Ver como").
 *
 *   const { ids, empresas, multiplas, filtrar } = useFiltroEmpresa()
 *   const lista = useMemo(() => filtrar(ordens), [ordens, filtrar])   // só as empresas em vista
 *   <SeloEmpresa empresaId={o.empresaId} />        // selo curto "SM"/"CA"/"BA"; só aparece se multiplas
 *   estoqueDe(produto, ids)                         // quantidade nas empresas em vista (produto.estoque = total do grupo)
 *   empresaPadraoParaNovo()                         // empresa padrão ao CRIAR registro (a selecionada, ou a principal);
 *                                                   // se multiplas, ofereça <SelectEmpresa> no formulário
 *   movimentarEstoque({ ..., empresaId: registro.empresaId })  // baixa/entrada no estoque da empresa do registro
 *   useEmpresaDoRegistro(r.empresaId)               // nome/CNPJ/cidade para o cabeçalho de documentos impressos
 *   outraEmpresaTem(produto, ids, empresas)         // aviso "Cruz Alta tem 8" quando a vista não tem a peça
 *
 * Regras: totais, gráficos e KPIs usam a lista já filtrada; use `estoqueDe` (nunca `p.estoque`) onde o número
 * é "o que a empresa em vista tem"; `p.estoque` continua sendo o total do grupo e é mantido pela store.
 */
import { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { useStore } from '@/store'
import { EMPRESA_PRINCIPAL_ID } from '@/data/empresas'
import type { Empresa, EmpresaGrupo, Produto } from '@/types'
import { cx } from '@/components/ui/cx'

export { EMPRESA_PRINCIPAL_ID }

const CHAVE_SESSAO = 'aero-empresa-escolhida'
const lerSessao = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) === '1' } catch { return false } }

/** Controle da tela "Qual empresa você quer ver?" (uma escolha por sessão do navegador). */
export const useEscolhaEmpresa = create<{ escolhida: boolean; reabrir: () => void; confirmar: () => void }>((set) => ({
  escolhida: lerSessao(),
  reabrir: () => set({ escolhida: false }),
  confirmar: () => { try { sessionStorage.setItem(CHAVE_SESSAO, '1') } catch { /* sem armazenamento */ } set({ escolhida: true }) },
}))

/** Empresas a que o usuário atual ("Ver como") tem acesso. */
export function useEmpresasAcessiveis(): EmpresaGrupo[] {
  const empresas = useStore((s) => s.empresas)
  const usuarios = useStore((s) => s.usuarios)
  const atualId = useStore((s) => s.usuarioAtualId)
  return useMemo(() => {
    const u = usuarios.find((x) => x.id === atualId)
    const lista = u?.empresaIds?.length ? empresas.filter((e) => u.empresaIds.includes(e.id)) : empresas
    return lista.length ? lista : empresas
  }, [empresas, usuarios, atualId])
}

/** Empresas em vista agora (seleção ∩ acesso; se vazia, todas as acessíveis). */
export function useEmpresasSelecionadas(): EmpresaGrupo[] {
  const acessiveis = useEmpresasAcessiveis()
  const sel = useStore((s) => s.empresaSelecionada)
  return useMemo(() => {
    const l = acessiveis.filter((e) => sel.includes(e.id))
    return l.length ? l : acessiveis
  }, [acessiveis, sel])
}

export function filtrarPorEmpresa<T extends { empresaId?: string }>(lista: T[], ids: string[]): T[] {
  return lista.filter((x) => ids.includes(x.empresaId ?? EMPRESA_PRINCIPAL_ID))
}

/** Hook principal: `ids`, `empresas`, `multiplas` (>1 em vista) e `filtrar(lista)`. */
export function useFiltroEmpresa() {
  const empresas = useEmpresasSelecionadas()
  const ids = useMemo(() => empresas.map((e) => e.id), [empresas])
  const filtrar = useCallback(<T extends { empresaId?: string }>(lista: T[]) => filtrarPorEmpresa(lista, ids), [ids])
  return { ids, empresas, multiplas: ids.length > 1, filtrar }
}

/** Quantidade do produto nas empresas em vista. */
export function estoqueDe(p: Produto, empresaIds: string[]): number {
  const por = p.estoquePorEmpresa
  if (!por) return p.estoque
  return empresaIds.reduce((s, id) => s + (por[id] ?? 0), 0)
}

/** Empresas fora da vista que têm a peça. Vazio se a vista já tem. */
export function outraEmpresaTem(p: Produto, empresaIds: string[], empresas: EmpresaGrupo[]): { empresa: EmpresaGrupo; qtd: number }[] {
  if (estoqueDe(p, empresaIds) > 0) return []
  return empresas
    .filter((e) => !empresaIds.includes(e.id))
    .map((empresa) => ({ empresa, qtd: p.estoquePorEmpresa?.[empresa.id] ?? 0 }))
    .filter((x) => x.qtd > 0)
}

/** Empresa padrão para um registro novo (use em handlers; fora de render). */
export function empresaPadraoParaNovo(): string {
  const s = useStore.getState()
  const u = s.usuarios.find((x) => x.id === s.usuarioAtualId)
  const acesso = u?.empresaIds?.length ? u.empresaIds : s.empresas.map((e) => e.id)
  const sel = s.empresaSelecionada.filter((id) => acesso.includes(id))
  if (sel.length === 1) return sel[0]
  return acesso.includes(EMPRESA_PRINCIPAL_ID) ? EMPRESA_PRINCIPAL_ID : acesso[0]
}

export function useEmpresaGrupo(id: string | undefined): EmpresaGrupo | undefined {
  const empresas = useStore((s) => s.empresas)
  return empresas.find((e) => e.id === (id ?? EMPRESA_PRINCIPAL_ID))
}

/** `Empresa` geral com nome/CNPJ/cidade da empresa do registro (cabeçalho de documentos impressos). */
export function useEmpresaDoRegistro(empresaId: string | undefined): Empresa {
  const geral = useStore((s) => s.empresa)
  const e = useEmpresaGrupo(empresaId)
  return useMemo(() => (e ? { ...geral, nome: e.nome, cnpj: e.cnpj, cidade: `${e.cidade} - ${e.uf}` } : geral), [geral, e])
}

/** Selo curto da empresa ("SM"). Só aparece quando há mais de uma empresa em vista. */
export function SeloEmpresa({ empresaId, className }: { empresaId?: string; className?: string }) {
  const { multiplas } = useFiltroEmpresa()
  const e = useEmpresaGrupo(empresaId)
  if (!multiplas || !e) return null
  return (
    <span title={e.nome} className={cx('inline-flex shrink-0 items-center rounded bg-mata/[0.08] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-mata-suave', className)}>
      {e.nomeCurto}
    </span>
  )
}

/** Campo "Empresa" para formulários de criação (restrito ao acesso do usuário). */
export function SelectEmpresa({ valor, aoMudar, className }: { valor: string; aoMudar: (id: string) => void; className?: string }) {
  const empresas = useEmpresasAcessiveis()
  return (
    <select value={valor} onChange={(e) => aoMudar(e.target.value)} aria-label="Empresa" className={cx('h-10 w-full rounded-campo border border-linha bg-papel px-3 text-sm', className)}>
      {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.cidade}-{e.uf})</option>)}
    </select>
  )
}
