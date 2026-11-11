import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cx } from './cx'
import { EstadoVazio } from './EstadoVazio'

export interface Coluna<T> {
  id: string
  titulo: string
  render: (linha: T) => ReactNode
  /** Valor usado para ordenar; sem isso a coluna não ordena. */
  valor?: (linha: T) => string | number
  alinhar?: 'esquerda' | 'direita' | 'centro'
  /** Coluna usada como título do cartão no mobile (padrão: a primeira). */
  principal?: boolean
  /** Não exibir no cartão mobile. */
  ocultarMobile?: boolean
  largura?: string
}

export interface TabelaProps<T> {
  colunas: Coluna<T>[]
  dados: T[]
  chave: (linha: T) => string
  aoClicar?: (linha: T) => void
  vazio?: ReactNode
  ordemInicial?: { coluna: string; direcao: 'asc' | 'desc' }
  className?: string
}

export function Tabela<T>({ colunas, dados, chave, aoClicar, vazio, ordemInicial, className }: TabelaProps<T>) {
  const [ordem, setOrdem] = useState(ordemInicial ?? null)

  const linhas = useMemo(() => {
    if (!ordem) return dados
    const col = colunas.find((c) => c.id === ordem.coluna)
    if (!col?.valor) return dados
    const v = col.valor
    const sinal = ordem.direcao === 'asc' ? 1 : -1
    return [...dados].sort((a, b) => {
      const x = v(a); const y = v(b)
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sinal
      return String(x).localeCompare(String(y), 'pt-BR', { numeric: true }) * sinal
    })
  }, [dados, ordem, colunas])

  const alternar = (c: Coluna<T>) => {
    if (!c.valor) return
    setOrdem((o) => (o?.coluna === c.id ? (o.direcao === 'asc' ? { coluna: c.id, direcao: 'desc' } : null) : { coluna: c.id, direcao: 'asc' }))
  }

  if (!linhas.length) return <div className={className}>{vazio ?? <EstadoVazio titulo="Nada por aqui" texto="Nenhum registro encontrado." />}</div>

  const principal = colunas.find((c) => c.principal) ?? colunas[0]
  const teclaLinha = (l: T) => (e: React.KeyboardEvent) => { if (aoClicar && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); aoClicar(l) } }

  return (
    <div className={className}>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-linha text-left text-xs text-mata-suave">
              {colunas.map((c) => {
                const ativa = ordem?.coluna === c.id
                return (
                  <th
                    key={c.id} scope="col" style={{ width: c.largura }}
                    aria-sort={ativa ? (ordem!.direcao === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cx('px-3 py-2.5 font-medium', c.alinhar === 'direita' && 'text-right', c.alinhar === 'centro' && 'text-center')}
                  >
                    {c.valor ? (
                      <button type="button" onClick={() => alternar(c)} className="inline-flex items-center gap-1 hover:text-mata">
                        {c.titulo}
                        {ativa ? (ordem!.direcao === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />) : <ChevronsUpDown size={12} className="opacity-40" aria-hidden />}
                      </button>
                    ) : c.titulo}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={chave(l)}
                onClick={aoClicar ? () => aoClicar(l) : undefined}
                onKeyDown={aoClicar ? teclaLinha(l) : undefined}
                tabIndex={aoClicar ? 0 : undefined}
                className={cx('border-b border-linha/70 last:border-0', aoClicar && 'cursor-pointer hover:bg-nevoa focus-visible:bg-nevoa')}
              >
                {colunas.map((c) => (
                  <td key={c.id} className={cx('px-3 py-3 align-middle', c.alinhar === 'direita' && 'text-right num', c.alinhar === 'centro' && 'text-center')}>{c.render(l)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cartões compactos */}
      <ul className="divide-y divide-linha md:hidden">
        {linhas.map((l) => (
          <li
            key={chave(l)}
            onClick={aoClicar ? () => aoClicar(l) : undefined}
            onKeyDown={aoClicar ? teclaLinha(l) : undefined}
            tabIndex={aoClicar ? 0 : undefined}
            role={aoClicar ? 'button' : undefined}
            className={cx('flex flex-col gap-1.5 px-4 py-3', aoClicar && 'cursor-pointer active:bg-nevoa')}
          >
            <div className="font-medium">{principal.render(l)}</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {colunas.filter((c) => c !== principal && !c.ocultarMobile).map((c) => (
                <div key={c.id} className="min-w-0">
                  <dt className="text-xs text-mata-suave">{c.titulo}</dt>
                  <dd className="num truncate">{c.render(l)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}
