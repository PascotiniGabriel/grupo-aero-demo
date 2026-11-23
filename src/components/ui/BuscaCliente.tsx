import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { useStore } from '@/store'
import { normalizar } from '@/lib/format'
import { nomeModelo } from '@/store/selectors'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { cx } from './cx'
import { campoBase } from './Input'
import type { Cliente } from '@/types'

/**
 * Seletor de cliente com busca: filtra por nome, cidade, telefone, documento e
 * por modelo ou serial dos drones do cliente. Teclado: setas, Enter e Esc.
 */
export function BuscaCliente({ valor, aoMudar, placeholder = 'Buscar cliente por nome, cidade, telefone ou serial', opcional, rotuloVazio = 'Sem cliente', aoCadastrar }: {
  valor: string; aoMudar: (id: string) => void; placeholder?: string
  /** Mostra opção "Sem cliente" ao limpar. */
  opcional?: boolean; rotuloVazio?: string
  /** Se informado, mostra "Cadastrar novo cliente" com o texto digitado. */
  aoCadastrar?: (nome: string) => void
}) {
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const [q, setQ] = useState('')
  const [aberta, setAberta] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const idLista = useId()
  const raiz = useRef<HTMLDivElement>(null)

  const drones = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const e of equipamentos) m.set(e.clienteId, [...(m.get(e.clienteId) ?? []), `${nomeModelo(e.modeloId, modelos)} ${e.serial}`])
    return m
  }, [equipamentos, modelos])

  const lista = useMemo(() => {
    const t = normalizar(q).trim()
    const base = clientes.filter((c) => !t || normalizar(`${c.nome} ${c.cidade} ${c.uf} ${c.fone} ${c.documento} ${(drones.get(c.id) ?? []).join(' ')}`).includes(t))
    return base.slice(0, 8)
  }, [q, clientes, drones])

  useEffect(() => { setAtivo(0) }, [q])
  useEffect(() => {
    if (!aberta) return
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberta(false) }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberta])

  const atual = clientes.find((c) => c.id === valor)
  const escolher = (c: Cliente) => { aoMudar(c.id); setQ(''); setAberta(false) }

  if (atual) {
    return (
      <div className="flex items-center gap-3 rounded-campo border border-linha bg-nevoa p-3">
        <Avatar nome={atual.nome} tamanho={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{atual.nome}</p>
          <p className="truncate text-xs text-mata-suave">{atual.cidade}/{atual.uf} · {atual.fone}</p>
        </div>
        <Button variante="secundario" tamanho="sm" onClick={() => aoMudar('')}>Trocar</Button>
      </div>
    )
  }

  const total = lista.length + (aoCadastrar && q.trim().length > 1 ? 1 : 0)
  return (
    <div ref={raiz} className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mata-suave" aria-hidden />
        <input
          role="combobox" aria-expanded={aberta} aria-controls={idLista} aria-autocomplete="list" autoComplete="off"
          value={q} placeholder={placeholder} aria-label="Buscar cliente"
          onChange={(e) => { setQ(e.target.value); setAberta(true) }}
          onFocus={() => setAberta(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAberta(true); setAtivo((a) => Math.min(a + 1, total - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter' && aberta) {
              e.preventDefault()
              if (ativo < lista.length) escolher(lista[ativo])
              else if (aoCadastrar) aoCadastrar(q.trim())
            } else if (e.key === 'Escape') setAberta(false)
          }}
          className={cx(campoBase, 'h-11 border-linha pl-9 pr-10')}
        />
        {q && (
          <button type="button" aria-label="Limpar busca" onClick={() => setQ('')} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-mata-suave hover:text-mata"><X size={16} /></button>
        )}
      </div>
      {aberta && (
        <ul id={idLista} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-campo border border-linha bg-papel shadow-lg">
          {opcional && (
            <li role="option" aria-selected={false}>
              <button type="button" onClick={() => { aoMudar(''); setAberta(false) }} className="flex min-h-11 w-full items-center px-3 text-left text-sm text-mata-suave hover:bg-nevoa">{rotuloVazio}</button>
            </li>
          )}
          {lista.map((c, i) => {
            const d = drones.get(c.id) ?? []
            return (
              <li key={c.id} role="option" aria-selected={i === ativo} className="border-t border-linha first:border-t-0">
                <button type="button" onClick={() => escolher(c)} onMouseEnter={() => setAtivo(i)}
                  className={cx('flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left', i === ativo ? 'bg-nevoa' : 'hover:bg-nevoa')}>
                  <Avatar nome={c.nome} tamanho={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.nome}</span>
                    <span className="block truncate text-xs text-mata-suave">{c.cidade}/{c.uf}{d.length ? ` · ${d.slice(0, 2).join(', ')}${d.length > 2 ? ` +${d.length - 2}` : ''}` : ''}</span>
                  </span>
                </button>
              </li>
            )
          })}
          {lista.length === 0 && <li className="px-3 py-3 text-sm text-mata-suave">Nenhum cliente encontrado.</li>}
          {aoCadastrar && q.trim().length > 1 && (
            <li className="border-t border-linha">
              <button type="button" onClick={() => aoCadastrar(q.trim())} className={cx('flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium text-lavoura-texto', ativo === lista.length ? 'bg-nevoa' : 'hover:bg-nevoa')}>
                <UserPlus size={16} aria-hidden /> Cadastrar novo cliente &quot;{q.trim()}&quot;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
