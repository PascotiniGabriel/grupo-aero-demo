import { useState, type ReactNode } from 'react'
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button, Input, Textarea, cx } from '@/components/ui'
import { dataCurta, numero } from '@/lib/format'
import type { SecaoRelatorio } from '@/lib/ai/relatorio'
import { Marca } from '@/components/layout/Marca'
import type { Cliente, Empresa, Equipamento, FotoOS, ModeloDrone, OrdemServico, Produto, RelatorioOS } from '@/types'

type CampoTexto = SecaoRelatorio

function Texto({ valor }: { valor: string }) {
  const linhas = valor.split('\n').map((l) => l.trim()).filter(Boolean)
  const itens = linhas.filter((l) => l.startsWith('- '))
  if (linhas.length > 0 && itens.length === linhas.length) {
    return <ul className="list-disc space-y-1 pl-5">{itens.map((l, i) => <li key={i}>{l.slice(2)}</li>)}</ul>
  }
  return <div className="space-y-2">{linhas.map((l, i) => (l.startsWith('- ') ? <p key={i} className="pl-4">• {l.slice(2)}</p> : <p key={i}>{l}</p>))}</div>
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <h3 className="mb-1.5 border-b border-linha pb-1 text-[15px] text-mata">{titulo}</h3>
      {children}
    </section>
  )
}

function TextoEditavel({ campo, valor, editavel, ocupado, aoSalvar, aoReescrever }: {
  campo: CampoTexto; valor: string; editavel: boolean; ocupado: boolean
  aoSalvar: (v: string) => void; aoReescrever: (instrucao: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(valor)
  const [pedindo, setPedindo] = useState(false)
  const [instrucao, setInstrucao] = useState('')

  if (editando) {
    return (
      <div className="nao-imprimir space-y-2">
        <Textarea autoFocus rows={Math.min(12, Math.max(4, rascunho.split('\n').length + 2))} value={rascunho} onChange={(e) => setRascunho(e.target.value)} aria-label={`Editar ${campo}`} />
        <div className="flex gap-2">
          <Button tamanho="sm" onClick={() => { aoSalvar(rascunho.trim()); setEditando(false) }}>Pronto</Button>
          <Button tamanho="sm" variante="fantasma" onClick={() => setEditando(false)}>Cancelar</Button>
        </div>
      </div>
    )
  }
  return (
    <div className="group relative">
      <div className={cx('text-sm leading-relaxed', ocupado && 'opacity-40')}>{valor.trim() ? <Texto valor={valor} /> : <p className="text-mata-suave">Sem texto. Clique em Editar para escrever.</p>}</div>
      {editavel && (
        <div className="nao-imprimir mt-1.5 flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => { setRascunho(valor); setEditando(true) }} className="inline-flex h-10 items-center gap-1 rounded-campo px-2 text-xs font-medium text-mata-suave hover:bg-mata/5 hover:text-mata">
            <Pencil size={14} />Editar
          </button>
          <button type="button" disabled={ocupado} onClick={() => setPedindo((p) => !p)} className="inline-flex h-10 items-center gap-1 rounded-campo px-2 text-xs font-medium text-ceu hover:bg-ceu-claro disabled:opacity-50">
            <Sparkles size={14} />Reescrever
          </button>
          {pedindo && (
            <form className="flex w-full flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setPedindo(false); aoReescrever(instrucao); setInstrucao('') }}>
              <Input value={instrucao} onChange={(e) => setInstrucao(e.target.value)} placeholder="Instrução opcional (ex.: mais curto, citar a calibração)" className="min-w-[200px] flex-1" autoFocus />
              <Button type="submit" variante="ia" tamanho="sm" icone={<Sparkles size={14} />}>Reescrever este trecho</Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function Fotos({ fotos, titulo }: { fotos: FotoOS[]; titulo: string }) {
  if (!fotos.length) return null
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-mata-suave">{titulo}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((f) => (
          <figure key={f.id} className="break-inside-avoid">
            <img src={f.url} alt={f.legenda || titulo} className="aspect-[4/3] w-full rounded-campo border border-linha object-cover" />
            {f.legenda && <figcaption className="mt-1 text-xs text-mata-suave">{f.legenda}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  )
}

type Problema = NonNullable<RelatorioOS['problemas']>[number]

function TabelaProblemas({ linhas, editavel, aoSalvar }: { linhas: Problema[]; editavel: boolean; aoSalvar: (l: Problema[]) => void }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState<Problema[]>(linhas)
  const mudar = (i: number, p: Partial<Problema>) => setRascunho((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)))

  if (editando) {
    return (
      <div className="nao-imprimir space-y-3">
        {rascunho.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-campo border border-linha p-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Textarea rows={2} value={l.problema} onChange={(e) => mudar(i, { problema: e.target.value })} placeholder="Problema encontrado" aria-label={`Problema ${i + 1}`} />
            <Textarea rows={2} value={l.solucao} onChange={(e) => mudar(i, { solucao: e.target.value })} placeholder="Solução aplicada" aria-label={`Solução ${i + 1}`} />
            <Textarea rows={2} value={l.pecas ?? ''} onChange={(e) => mudar(i, { pecas: e.target.value })} placeholder="Peças trocadas" aria-label={`Peças trocadas ${i + 1}`} />
            <button type="button" onClick={() => setRascunho((r) => r.filter((_, j) => j !== i))} aria-label={`Remover linha ${i + 1}`} className="inline-flex h-10 w-10 items-center justify-center rounded-campo text-barro-texto hover:bg-barro/10"><Trash2 size={16} /></button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button tamanho="sm" variante="secundario" icone={<Plus size={14} />} onClick={() => setRascunho((r) => [...r, { problema: '', solucao: '', pecas: '' }])}>Adicionar linha</Button>
          <Button tamanho="sm" onClick={() => { aoSalvar(rascunho.filter((l) => l.problema.trim() || l.solucao.trim()).map((l) => ({ ...l, pecas: l.pecas?.trim() || undefined }))); setEditando(false) }}>Pronto</Button>
          <Button tamanho="sm" variante="fantasma" onClick={() => setEditando(false)}>Cancelar</Button>
        </div>
      </div>
    )
  }
  return (
    <div>
      {linhas.length === 0 ? <p className="text-sm text-mata-suave">Nenhum problema listado. Gere o relatório ou adicione linhas.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-linha text-left text-xs text-mata-suave"><th className="py-1.5 pr-2 font-medium">Problema encontrado</th><th className="py-1.5 pr-2 font-medium">Solução aplicada</th><th className="py-1.5 font-medium">Peças trocadas</th></tr></thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i} className="break-inside-avoid border-b border-linha/60 align-top">
                  <td className="py-1.5 pr-2">{l.problema}</td><td className="py-1.5 pr-2">{l.solucao}</td><td className="py-1.5">{l.pecas || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editavel && (
        <button type="button" onClick={() => { setRascunho(linhas.length ? linhas : [{ problema: '', solucao: '', pecas: '' }]); setEditando(true) }} className="nao-imprimir mt-1.5 inline-flex h-10 items-center gap-1 rounded-campo px-2 text-xs font-medium text-mata-suave hover:bg-mata/5 hover:text-mata">
          <Pencil size={14} />Editar tabela
        </button>
      )}
    </div>
  )
}

export function DocumentoRelatorio({ os, cliente, equipamento, modelo, empresa, produtos, relatorio, editavel, reescrevendo, aoMudar, aoReescrever }: {
  os: OrdemServico; cliente?: Cliente; equipamento?: Equipamento; modelo?: ModeloDrone; empresa: Empresa; produtos: Produto[]
  relatorio: RelatorioOS; editavel: boolean; reescrevendo: SecaoRelatorio | null
  aoMudar: (parcial: Partial<RelatorioOS>) => void
  aoReescrever: (secao: SecaoRelatorio, instrucao: string) => void
}) {
  const pecas = os.itens.filter((i) => i.tipo === 'peca')
  const por = (fase: FotoOS['fase']) => os.fotos.filter((f) => f.fase === fase)
  const ed = (campo: SecaoRelatorio) => (
    <TextoEditavel
      campo={campo} valor={relatorio[campo]} editavel={editavel} ocupado={reescrevendo === campo}
      aoSalvar={(v) => aoMudar({ [campo]: v })} aoReescrever={(ins) => aoReescrever(campo, ins)}
    />
  )
  return (
    <article className="folha-impressao rounded-painel border border-linha bg-papel p-5 sm:p-8" aria-label="Relatório de entrega">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-mata pb-4">
        <div>
          <Marca largura={120} className="mb-1" />
          <p className="sr-only">{empresa.nome}</p>
          <p className="text-xs text-mata-suave">CNPJ {empresa.cnpj} · {empresa.cidade} · {empresa.fone}</p>
        </div>
        <div className="text-right">
          <h2 className="titulo text-xl">Relatório de entrega</h2>
          <p className="num text-sm font-medium">OS {os.numero}</p>
          <p className="num text-xs text-mata-suave">Entrada {dataCurta(os.abertura)}{os.conclusao ? ` · Conclusão ${dataCurta(os.conclusao)}` : ''} · Emitido {dataCurta(relatorio.geradoEm)}</p>
        </div>
      </header>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-mata-suave">Cliente</p>
          <p className="font-medium">{cliente?.nome ?? '-'}</p>
          {cliente && <p className="text-mata-suave">{cliente.cidade}/{cliente.uf} · {cliente.fone}</p>}
        </div>
        <div>
          <p className="text-xs font-medium text-mata-suave">Equipamento</p>
          <p className="font-medium">{modelo ? `DJI Agras ${modelo.nome.replace(/^(DJI\s*)?(Agras\s*)?/i, '')}` : '-'}</p>
          <p className="text-mata-suave">Série <span className="serial text-xs">{equipamento?.serial ?? '-'}</span> · <span className="num">{equipamento ? numero(equipamento.horasVoo) : '-'}</span> h de voo</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Secao titulo="Resumo">{ed('resumo')}</Secao>
        <Secao titulo="Como chegou">{ed('condicaoChegada')}<Fotos fotos={por('chegada')} titulo="Fotos de chegada" /><Fotos fotos={por('dano')} titulo="Peças danificadas" /></Secao>
        <Secao titulo="Diagnóstico">{ed('diagnostico')}</Secao>
        <Secao titulo="Problemas encontrados e soluções">
          <TabelaProblemas linhas={relatorio.problemas ?? []} editavel={editavel} aoSalvar={(l) => aoMudar({ problemas: l })} />
        </Secao>
        <Secao titulo="Serviços executados">{ed('servicosExecutados')}</Secao>
        <Secao titulo="Peças substituídas">
          {pecas.length === 0 ? <p className="text-sm text-mata-suave">Nenhuma peça substituída nesta OS.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-linha text-left text-xs text-mata-suave"><th className="py-1.5 pr-2 font-medium">Código</th><th className="py-1.5 pr-2 font-medium">Peça</th><th className="py-1.5 text-right font-medium">Qtd.</th></tr></thead>
              <tbody>
                {pecas.map((i) => {
                  const p = produtos.find((x) => x.id === i.produtoId)
                  return (
                    <tr key={i.id} className="border-b border-linha/60 break-inside-avoid">
                      <td className="serial py-1.5 pr-2 text-xs">{p?.codigoFabricante ?? p?.sku ?? '-'}</td>
                      <td className="py-1.5 pr-2">{i.descricao}</td>
                      <td className="num py-1.5 text-right">{i.quantidade}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Secao>
        {por('peca_nova').length > 0 && <Secao titulo="Peças novas instaladas"><Fotos fotos={por('peca_nova')} titulo="Fotos das peças novas" /></Secao>}
        <Secao titulo="Como saiu">{ed('testes')}<Fotos fotos={por('saida')} titulo="Fotos de saída" /></Secao>
        <Secao titulo="Recomendações">{ed('recomendacoes')}</Secao>
      </div>

      <footer className="mt-10 grid gap-8 break-inside-avoid sm:grid-cols-2">
        <div><div className="h-10 border-b border-mata" /><p className="mt-1 text-sm font-medium">{os.tecnico || 'Técnico responsável'}</p><p className="text-xs text-mata-suave">Técnico responsável · {empresa.nome}</p></div>
        <div><div className="h-10 border-b border-mata" /><p className="mt-1 text-sm font-medium">{cliente?.nome ?? 'Cliente'}</p><p className="text-xs text-mata-suave">Recebido pelo cliente</p></div>
      </footer>
    </article>
  )
}
