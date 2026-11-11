import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Mini renderizador: **negrito**, `código`, [texto](/rota), listas (- e 1.), tabelas (| a | b |) e parágrafos.

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(\/[^)\s]*\))/g

function inline(texto: string, chave: string): ReactNode[] {
  return texto.split(INLINE).filter((p) => p !== '').map((parte, i) => {
    const k = `${chave}-${i}`
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return <strong key={k} className="font-semibold">{inline(parte.slice(2, -2), k)}</strong>
    }
    if (parte.startsWith('`') && parte.endsWith('`') && parte.length > 2) {
      return <code key={k} className="serial rounded bg-mata/[0.06] px-1 py-0.5 text-[0.85em]">{parte.slice(1, -1)}</code>
    }
    const m = /^\[([^\]]+)\]\((\/[^)\s]*)\)$/.exec(parte)
    if (m) {
      return <Link key={k} to={m[2]} className="font-medium text-ceu underline decoration-ceu/30 underline-offset-2 hover:decoration-ceu">{m[1]}</Link>
    }
    return <Fragment key={k}>{parte}</Fragment>
  })
}

type Bloco =
  | { tipo: 'p'; linhas: string[] }
  | { tipo: 'ul'; itens: string[] }
  | { tipo: 'ol'; itens: string[] }
  | { tipo: 'tabela'; cab: string[]; alin: ('l' | 'r')[]; linhas: string[][] }

const celulas = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

function blocos(texto: string): Bloco[] {
  const linhas = texto.replace(/\r/g, '').split('\n')
  const out: Bloco[] = []
  let i = 0
  while (i < linhas.length) {
    const l = linhas[i]
    if (!l.trim()) { i += 1; continue }
    if (l.trim().startsWith('|')) {
      const grupo: string[] = []
      while (i < linhas.length && linhas[i].trim().startsWith('|')) { grupo.push(linhas[i]); i += 1 }
      const cab = celulas(grupo[0])
      const sep = grupo[1] && /^[\s|:-]+$/.test(grupo[1]) ? celulas(grupo[1]) : null
      const alin = cab.map((_, k) => (sep && /:$/.test(sep[k] ?? '') ? 'r' : 'l') as 'l' | 'r')
      out.push({ tipo: 'tabela', cab, alin, linhas: grupo.slice(sep ? 2 : 1).map(celulas) })
      continue
    }
    if (/^\s*-\s+/.test(l)) {
      const itens: string[] = []
      while (i < linhas.length && /^\s*-\s+/.test(linhas[i])) { itens.push(linhas[i].replace(/^\s*-\s+/, '')); i += 1 }
      out.push({ tipo: 'ul', itens }); continue
    }
    if (/^\s*\d+\.\s+/.test(l)) {
      const itens: string[] = []
      while (i < linhas.length && /^\s*\d+\.\s+/.test(linhas[i])) { itens.push(linhas[i].replace(/^\s*\d+\.\s+/, '')); i += 1 }
      out.push({ tipo: 'ol', itens }); continue
    }
    const par: string[] = []
    while (i < linhas.length && linhas[i].trim() && !linhas[i].trim().startsWith('|') && !/^\s*-\s+/.test(linhas[i]) && !/^\s*\d+\.\s+/.test(linhas[i])) { par.push(linhas[i]); i += 1 }
    out.push({ tipo: 'p', linhas: par })
  }
  return out
}

export function Markdown({ texto, className }: { texto: string; className?: string }) {
  return (
    <div className={['space-y-3 text-[15px] leading-relaxed', className].filter(Boolean).join(' ')}>
      {blocos(texto).map((b, i) => {
        const k = `b${i}`
        if (b.tipo === 'p') {
          return <p key={k}>{b.linhas.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${k}-${j}`)}</Fragment>)}</p>
        }
        if (b.tipo === 'ul') {
          return <ul key={k} className="list-disc space-y-1 pl-5 marker:text-mata-suave">{b.itens.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}</ul>
        }
        if (b.tipo === 'ol') {
          return <ol key={k} className="list-decimal space-y-1 pl-5 marker:text-mata-suave">{b.itens.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}</ol>
        }
        return (
          <div key={k} className="max-w-full overflow-x-auto rounded-campo border border-linha">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-nevoa text-xs text-mata-suave">
                <tr>{b.cab.map((c, j) => <th key={j} className={`whitespace-nowrap px-3 py-2 font-medium ${b.alin[j] === 'r' ? 'text-right' : 'text-left'}`}>{inline(c, `${k}-h${j}`)}</th>)}</tr>
              </thead>
              <tbody>
                {b.linhas.map((l, r) => (
                  <tr key={r} className="border-t border-linha align-top">
                    {l.map((c, j) => <td key={j} className={`px-3 py-2 ${b.alin[j] === 'r' ? 'num whitespace-nowrap text-right' : 'text-left'}`}>{inline(c, `${k}-${r}-${j}`)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
