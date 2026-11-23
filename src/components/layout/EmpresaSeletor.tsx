import { useEffect, useRef, useState } from 'react'
import { Building2, Check, ChevronDown, Repeat } from 'lucide-react'
import { useStore } from '@/store'
import { cx } from '@/components/ui'
import { useEmpresasAcessiveis, useEmpresasSelecionadas, useEscolhaEmpresa } from '@/lib/empresas'

/** Tela cheia "Qual empresa você quer ver?" (estilo perfis). Aparece uma vez por sessão se o usuário tem mais de uma empresa. */
export function EscolherEmpresa() {
  const acessiveis = useEmpresasAcessiveis()
  const escolhida = useEscolhaEmpresa((s) => s.escolhida)
  const confirmar = useEscolhaEmpresa((s) => s.confirmar)
  const definir = useStore((s) => s.definirEmpresaSelecionada)
  if (escolhida || acessiveis.length < 2) return null
  const ir = (ids: string[]) => { definir(ids); confirmar() }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-empresa" className="nao-imprimir fixed inset-0 z-[60] overflow-y-auto bg-nevoa">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-10">
        <h1 id="titulo-empresa" className="titulo mb-2 text-center text-2xl md:text-3xl">Qual empresa você quer ver?</h1>
        <p className="mb-8 text-center text-sm text-mata-suave">Você pode trocar a qualquer momento no topo da tela.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {acessiveis.map((e) => (
            <button key={e.id} type="button" onClick={() => ir([e.id])} className="flex min-h-[132px] flex-col justify-between gap-4 rounded-painel border border-linha bg-papel p-5 text-left transition-colors hover:border-lavoura focus-visible:outline-lavoura">
              <span className="flex h-11 w-11 items-center justify-center rounded-campo bg-forte text-sm font-semibold text-white">{e.nomeCurto}</span>
              <span>
                <span className="titulo block text-lg">{e.nome}</span>
                <span className="block text-sm text-mata-suave">{e.cidade}-{e.uf}</span>
                <span className="num block text-xs text-mata-suave">CNPJ {e.cnpj}</span>
              </span>
            </button>
          ))}
          <button type="button" onClick={() => ir(acessiveis.map((e) => e.id))} className="flex min-h-[132px] flex-col justify-between gap-4 rounded-painel border border-dashed border-mata-suave/50 bg-papel p-5 text-left transition-colors hover:border-lavoura focus-visible:outline-lavoura">
            <span className="flex h-11 w-11 items-center justify-center rounded-campo border border-linha text-mata"><Building2 size={20} aria-hidden /></span>
            <span>
              <span className="titulo block text-lg">Todas juntas</span>
              <span className="block text-sm text-mata-suave">{acessiveis.length} empresas somadas, com selo em cada item</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Seletor compacto da barra superior: marcar empresas, "Todas" e "Trocar empresa". */
export function SeletorEmpresa() {
  const acessiveis = useEmpresasAcessiveis()
  const selecionadas = useEmpresasSelecionadas()
  const definir = useStore((s) => s.definirEmpresaSelecionada)
  const reabrir = useEscolhaEmpresa((s) => s.reabrir)
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  if (acessiveis.length < 2) return null
  const todas = selecionadas.length === acessiveis.length
  const ids = selecionadas.map((e) => e.id)
  const rotulo = todas ? 'Todas' : selecionadas.length === 1 ? selecionadas[0].nome.replace('Aerobrasil ', '') : `${selecionadas.length} empresas`
  const rotuloCurto = todas ? 'Todas' : selecionadas.length === 1 ? selecionadas[0].nomeCurto : `${selecionadas.length} emp.`
  const alternar = (id: string) => {
    const novo = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    if (novo.length) definir(novo)
  }
  return (
    <div ref={caixa} className="relative">
      <button
        type="button" onClick={() => setAberto((a) => !a)} aria-haspopup="menu" aria-expanded={aberto} aria-label={`Empresa em vista: ${rotulo}`}
        className="inline-flex h-10 max-w-[8.5rem] items-center gap-1.5 rounded-campo border border-linha bg-papel px-2.5 text-sm text-mata hover:border-mata-suave/40 sm:max-w-[14rem]"
      >
        <Building2 size={16} className="hidden shrink-0 text-mata-suave sm:block" aria-hidden />
        <span className="truncate sm:hidden">{rotuloCurto}</span>
        <span className="hidden truncate sm:inline">{rotulo}</span>
        <ChevronDown size={14} className="shrink-0 text-mata-suave" aria-hidden />
      </button>
      {aberto && (
        <div role="menu" aria-label="Empresas em vista" className="anim-entrar absolute right-0 top-full z-40 mt-1 w-72 max-w-[calc(100vw-1rem)] rounded-painel border border-linha bg-papel p-1 text-mata shadow-xl">
          <button type="button" role="menuitemcheckbox" aria-checked={todas} onClick={() => definir(acessiveis.map((e) => e.id))} className="flex min-h-10 w-full items-center gap-2 rounded-campo px-2.5 text-left text-sm hover:bg-nevoa">
            <Caixa ligado={todas} /><span className="flex-1">Todas as empresas</span>
          </button>
          <div className="my-1 border-t border-linha" />
          {acessiveis.map((e) => (
            <button key={e.id} type="button" role="menuitemcheckbox" aria-checked={ids.includes(e.id)} onClick={() => alternar(e.id)} className="flex min-h-10 w-full items-center gap-2 rounded-campo px-2.5 text-left text-sm hover:bg-nevoa">
              <Caixa ligado={ids.includes(e.id)} />
              <span className="min-w-0 flex-1"><span className="block truncate">{e.nome}</span><span className="block text-xs text-mata-suave">{e.cidade}-{e.uf}</span></span>
              <span className="text-[11px] font-semibold text-mata-suave">{e.nomeCurto}</span>
            </button>
          ))}
          <div className="my-1 border-t border-linha" />
          <button type="button" role="menuitem" onClick={() => { setAberto(false); reabrir() }} className="flex min-h-10 w-full items-center gap-2 rounded-campo px-2.5 text-left text-sm hover:bg-nevoa">
            <Repeat size={15} className="text-mata-suave" aria-hidden />Trocar empresa
          </button>
        </div>
      )}
    </div>
  )
}

function Caixa({ ligado }: { ligado: boolean }) {
  return (
    <span aria-hidden className={cx('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border', ligado ? 'border-lavoura bg-lavoura text-white' : 'border-linha bg-papel')}>
      {ligado && <Check size={13} strokeWidth={3} />}
    </span>
  )
}
