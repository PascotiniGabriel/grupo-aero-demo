import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { CornerDownLeft, FileText, Package, Plane, QrCode, Search, Settings, Sparkles, Users, Wrench, type LucideIcon } from 'lucide-react'
import { useStore } from '@/store'
import { nomeModelo } from '@/store/selectors'
import { normalizar } from '@/lib/format'
import { cx } from '@/components/ui'
import { useLeitorQR } from '@/components/qr/LeitorQR'
import { podeAcessar } from '@/lib/acesso'
import { gruposDoPapel, usePapel } from './nav'

interface EstadoBusca { aberta: boolean; abrir: () => void; fechar: () => void }
/** Abre a busca global de qualquer lugar: `useBuscaGlobal.getState().abrir()`. Atalho: Ctrl+K. */
export const useBuscaGlobal = create<EstadoBusca>((set) => ({
  aberta: false,
  abrir: () => set({ aberta: true }),
  fechar: () => set({ aberta: false }),
}))

interface Resultado {
  id: string
  grupo: string
  titulo: string
  detalhe?: string
  icone: LucideIcon
  para?: string
  acao?: () => void
}

const LIMITE = 5

export function BuscaGlobal() {
  const aberta = useBuscaGlobal((s) => s.aberta)
  const abrir = useBuscaGlobal((s) => s.abrir)
  const fechar = useBuscaGlobal((s) => s.fechar)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (useBuscaGlobal.getState().aberta) fechar()
        else abrir()
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [abrir, fechar])

  if (!aberta) return null
  return createPortal(<Paleta fechar={fechar} />, document.body)
}

function Paleta({ fechar }: { fechar: () => void }) {
  const navegar = useNavigate()
  const abrirQR = useLeitorQR((s) => s.abrir)
  const clientes = useStore((s) => s.clientes)
  const produtos = useStore((s) => s.produtos)
  const ordens = useStore((s) => s.ordens)
  const orcamentos = useStore((s) => s.orcamentos)
  const equipamentos = useStore((s) => s.equipamentos)
  const papel = usePapel()
  const [q, setQ] = useState('')
  const [ativo, setAtivo] = useState(0)
  const lista = useRef<HTMLDivElement>(null)

  const resultados = useMemo<Resultado[]>(() => {
    const termo = normalizar(q).trim()
    const paginas: Resultado[] = [
      ...gruposDoPapel(papel).flatMap((g) => g.itens).map((i) => ({ id: `pg-${i.para}`, grupo: 'Ir para', titulo: i.rotulo, icone: i.icone, para: i.para })),
      { id: 'pg-assistente', grupo: 'Ir para', titulo: 'Assistente', detalhe: 'Perguntar à IA', icone: Sparkles, para: '/assistente' },
      { id: 'pg-config', grupo: 'Ir para', titulo: papel === 'Gestor' ? 'Configurações' : 'Meu perfil', icone: Settings, para: '/config' },
    ]
    const lerQR: Resultado = { id: 'ac-qr', grupo: 'Ações', titulo: 'Ler QR code', detalhe: 'Peça ou drone', icone: QrCode, acao: () => abrirQR() }
    if (!termo) return [lerQR, ...paginas]

    const tem = (...campos: (string | number | undefined)[]) => campos.some((c) => c !== undefined && normalizar(String(c)).includes(termo))
    const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? ''
    const out: Resultado[] = []

    const ok = (rota: string) => podeAcessar(papel, rota)
    if (ok('/clientes')) clientes.filter((c) => tem(c.nome, c.documento, c.cidade, c.fone)).slice(0, LIMITE).forEach((c) =>
      out.push({ id: c.id, grupo: 'Clientes', titulo: c.nome, detalhe: `${c.cidade} - ${c.uf}`, icone: Users, para: `/clientes/${c.id}` }))

    if (ok('/estoque')) produtos.filter((p) => tem(p.nome, p.sku, p.codigoFabricante, ...p.seriais)).slice(0, LIMITE).forEach((p) =>
      out.push({ id: p.id, grupo: 'Peças e produtos', titulo: p.nome, detalhe: `${p.sku}, ${p.estoque} em estoque`, icone: Package, para: `/estoque/${p.id}` }))

    if (ok('/os')) ordens.filter((o) => {
      const eq = equipamentos.find((e) => e.id === o.equipamentoId)
      return tem(o.numero, `os ${o.numero}`, nomeCliente(o.clienteId), eq?.serial)
    }).slice(0, LIMITE).forEach((o) => {
      const eq = equipamentos.find((e) => e.id === o.equipamentoId)
      out.push({ id: o.id, grupo: 'Ordens de serviço', titulo: `OS ${o.numero}`, detalhe: `${nomeCliente(o.clienteId)}${eq ? `, ${nomeModelo(eq.modeloId)}` : ''}`, icone: Wrench, para: `/os/${o.id}` })
    })

    if (ok('/orcamentos')) orcamentos.filter((o) => tem(o.numero, `orcamento ${o.numero}`, nomeCliente(o.clienteId))).slice(0, LIMITE).forEach((o) =>
      out.push({ id: o.id, grupo: 'Orçamentos', titulo: `Orçamento ${o.numero}`, detalhe: nomeCliente(o.clienteId), icone: FileText, para: `/orcamentos/${o.id}` }))

    if (ok('/clientes')) equipamentos.filter((e) => tem(e.serial, e.apelido, nomeModelo(e.modeloId))).slice(0, LIMITE).forEach((e) =>
      out.push({ id: e.id, grupo: 'Drones de clientes', titulo: `${nomeModelo(e.modeloId)}${e.apelido ? ` (${e.apelido})` : ''}`, detalhe: `${e.serial}, ${nomeCliente(e.clienteId)}`, icone: Plane, para: `/clientes/${e.clienteId}` }))

    out.push(...paginas.filter((p) => tem(p.titulo, p.detalhe)))
    if (tem('ler qr code')) out.push(lerQR)
    return out
  }, [q, clientes, produtos, ordens, orcamentos, equipamentos, abrirQR, papel])

  useEffect(() => { setAtivo(0) }, [q])
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-indice="${ativo}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  const executar = (r: Resultado | undefined) => {
    if (!r) return
    fechar()
    if (r.acao) r.acao()
    else if (r.para) navegar(r.para)
  }

  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((i) => Math.min(i + 1, resultados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); executar(resultados[ativo]) }
    else if (e.key === 'Escape') { e.preventDefault(); fechar() }
  }

  let grupoAnterior = ''
  return (
    <div className="nao-imprimir fixed inset-0 z-50 flex items-start justify-center sm:px-4 sm:pt-[10vh]" role="presentation">
      <div className="absolute inset-0 bg-mata/50" onClick={fechar} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Busca" className="anim-entrar relative flex max-h-dvh w-full flex-col bg-papel shadow-2xl sm:max-h-[70vh] sm:max-w-xl sm:rounded-painel">
        <div className="flex items-center gap-3 border-b border-linha px-4">
          <Search size={18} className="shrink-0 text-mata-suave" aria-hidden />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={tecla}
            placeholder="Buscar cliente, peça, ordem de serviço ou serial" aria-label="Buscar em todo o sistema"
            role="combobox" aria-expanded="true" aria-controls="busca-global-lista" aria-activedescendant={resultados[ativo] ? `busca-${resultados[ativo].id}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-base placeholder:text-mata-suave/70 focus:outline-none"
          />
          <button type="button" onClick={fechar} className="h-10 shrink-0 rounded-campo px-2 text-sm text-mata-suave hover:bg-mata/5 hover:text-mata">Fechar</button>
        </div>

        <div ref={lista} id="busca-global-lista" role="listbox" className="flex-1 overflow-y-auto p-2">
          {resultados.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-mata-suave">
              Nada encontrado para "{q}". Tente o nome do cliente, o código da peça ou o número da ordem.
            </p>
          )}
          {resultados.map((r, i) => {
            const cabecalho = r.grupo !== grupoAnterior
            grupoAnterior = r.grupo
            const I = r.icone
            return (
              <div key={r.id}>
                {cabecalho && <p className={cx('px-3 pb-1 text-xs font-medium text-mata-suave', i === 0 ? 'pt-1' : 'pt-3')}>{r.grupo}</p>}
                <button
                  type="button" role="option" id={`busca-${r.id}`} aria-selected={i === ativo} data-indice={i}
                  onMouseMove={() => setAtivo(i)} onClick={() => executar(r)}
                  className={cx('flex min-h-11 w-full items-center gap-3 rounded-campo px-3 py-2 text-left text-sm', i === ativo && 'bg-nevoa')}
                >
                  <I size={17} className="shrink-0 text-mata-suave" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{r.titulo}</span>
                    {r.detalhe && <span className="ml-2 text-mata-suave">{r.detalhe}</span>}
                  </span>
                  {i === ativo && <CornerDownLeft size={14} className="hidden shrink-0 text-mata-suave sm:block" aria-hidden />}
                </button>
              </div>
            )
          })}
        </div>

        <p className="hidden border-t border-linha px-4 py-2 text-xs text-mata-suave sm:block">
          Use as setas para escolher, Enter para abrir e Esc para fechar.
        </p>
      </div>
    </div>
  )
}
