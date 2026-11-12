import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button, IconButton, Input, Painel, toast } from '@/components/ui'
import { useStore } from '@/store'
import { checklistDoServico, modelosAtendimento } from '@/lib/checklist'

/** Lista de itens editável (adicionar, remover, reordenar com setas); só grava ao clicar em Salvar. */
function EditorItens({ rotulo, itens, aoSalvar }: { rotulo: string; itens: string[]; aoSalvar: (itens: string[]) => void }) {
  const [rascunho, setRascunho] = useState(itens)
  const chave = JSON.stringify(itens)
  useEffect(() => { setRascunho(itens) }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  const limpo = rascunho.map((t) => t.trim()).filter(Boolean)
  const alterado = JSON.stringify(limpo) !== chave || rascunho.length !== limpo.length
  const mudar = (i: number, t: string) => setRascunho((l) => l.map((x, k) => (k === i ? t : x)))
  const mover = (i: number, d: -1 | 1) => setRascunho((l) => {
    const j = i + d
    if (j < 0 || j >= l.length) return l
    const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n
  })

  return (
    <div className="space-y-2">
      {rascunho.length === 0 && <p className="text-sm text-mata-suave">Nenhum item. Adicione as obrigações abaixo.</p>}
      <ul className="space-y-2">
        {rascunho.map((t, i) => (
          <li key={i} className="flex items-center gap-1">
            <Input aria-label={`${rotulo}, item ${i + 1}`} value={t} onChange={(e) => mudar(i, e.target.value)} />
            <IconButton icone={<ArrowUp size={16} />} aria-label="Subir item" disabled={i === 0} onClick={() => mover(i, -1)} />
            <IconButton icone={<ArrowDown size={16} />} aria-label="Descer item" disabled={i === rascunho.length - 1} onClick={() => mover(i, 1)} />
            <IconButton icone={<Trash2 size={16} />} aria-label="Remover item" onClick={() => setRascunho((l) => l.filter((_, k) => k !== i))} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button tamanho="sm" variante="secundario" icone={<Plus size={16} />} onClick={() => setRascunho((l) => [...l, ''])}>Adicionar item</Button>
        <Button tamanho="sm" disabled={!alterado} onClick={() => { aoSalvar(limpo); toast.sucesso('Checklist salvo') }}>Salvar</Button>
      </div>
    </div>
  )
}

export function AbaChecklists() {
  const servicos = useStore((s) => s.servicos)
  const empresa = useStore((s) => s.empresa)
  const salvar = useStore((s) => s.salvar)
  const salvarEmpresa = useStore((s) => s.salvarEmpresa)
  const modelos = modelosAtendimento(empresa)

  return (
    <div className="space-y-4">
      <p className="text-sm text-mata-suave">Estes itens entram sozinhos no checklist quando o gestor lança uma OS. Na hora de lançar, dá para desmarcar o que não se aplica e acrescentar itens avulsos.</p>
      <Painel titulo="Por tipo de atendimento">
        <div className="grid gap-6 lg:grid-cols-2">
          {(['campo', 'oficina'] as const).map((tipo) => (
            <section key={tipo} aria-label={tipo === 'campo' ? 'Atendimento em campo' : 'Atendimento na oficina'}>
              <h3 className="mb-2 text-sm">{tipo === 'campo' ? 'Atendimento em campo' : 'Atendimento na oficina'}</h3>
              <EditorItens
                rotulo={tipo === 'campo' ? 'Campo' : 'Oficina'} itens={modelos[tipo]}
                aoSalvar={(itens) => salvarEmpresa({ ...empresa, checklistAtendimento: { ...modelos, [tipo]: itens } })}
              />
            </section>
          ))}
        </div>
      </Painel>
      <Painel titulo="Por serviço" semPadding>
        <ul className="divide-y divide-linha">
          {servicos.map((s) => {
            const itens = checklistDoServico(s)
            return (
              <li key={s.id}>
                <details className="group">
                  <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm font-medium hover:bg-nevoa">
                    <span>{s.nome}</span>
                    <span className="num text-xs font-normal text-mata-suave">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
                  </summary>
                  <div className="px-4 pb-4 pt-2">
                    <EditorItens rotulo={s.nome} itens={itens} aoSalvar={(lista) => salvar('servicos', { ...s, checklist: lista })} />
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      </Painel>
    </div>
  )
}
