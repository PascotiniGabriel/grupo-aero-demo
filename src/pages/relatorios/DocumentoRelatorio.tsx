import { useState, type ReactNode } from 'react'
import { Pencil, Sparkles } from 'lucide-react'
import { Button, Input, Textarea, cx } from '@/components/ui'
import { dataCurta, numero } from '@/lib/format'
import type { SecaoRelatorio } from '@/lib/ai/relatorio'
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
    <article className="folha-impressao rounded-painel border border-linha bg-papel p-5 sm:p-8" aria-label="Relatório de manutenção">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-mata pb-4">
        <div>
          <p className="titulo text-lg">{empresa.nome}</p>
          <p className="text-xs text-mata-suave">CNPJ {empresa.cnpj} · {empresa.cidade} · {empresa.fone}</p>
        </div>
        <div className="text-right">
          <h2 className="titulo text-xl">Relatório de manutenção</h2>
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
        <Secao titulo="Condição na chegada">{ed('condicaoChegada')}<Fotos fotos={por('chegada')} titulo="Fotos de chegada" /></Secao>
        <Secao titulo="Diagnóstico">{ed('diagnostico')}<Fotos fotos={por('dano')} titulo="Peças danificadas" /></Secao>
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
        <Secao titulo="Testes e condição de saída">{ed('testes')}<Fotos fotos={por('saida')} titulo="Fotos de saída" /></Secao>
        <Secao titulo="Recomendações">{ed('recomendacoes')}</Secao>
      </div>

      <footer className="mt-10 grid gap-8 break-inside-avoid sm:grid-cols-2">
        <div><div className="h-10 border-b border-mata" /><p className="mt-1 text-sm font-medium">{os.tecnico || 'Técnico responsável'}</p><p className="text-xs text-mata-suave">Técnico responsável · {empresa.nome}</p></div>
        <div><div className="h-10 border-b border-mata" /><p className="mt-1 text-sm font-medium">{cliente?.nome ?? 'Cliente'}</p><p className="text-xs text-mata-suave">Recebido pelo cliente</p></div>
      </footer>
    </article>
  )
}
