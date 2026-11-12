import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore, novoId } from '@/store'
import { Button, Campo, Gaveta, Input, Select, Textarea, toast } from '@/components/ui'
import { diasAFrente } from '@/data/seed'
import type { Compromisso, ItemChecklist, TipoCompromisso } from '@/types'
import { EditorLocal, CartaoLocal } from '@/pages/os/LocalUI'
import { montarChecklist } from '@/lib/checklist'
import { BarraProgresso } from './ChecklistUI'
import { CHECKLIST_PADRAO, ROTULO_TIPO, deDatetimeLocal, paraDatetimeLocal } from './agendaUtil'

const atendimentoDe = (t: TipoCompromisso) => (t === 'atendimento_campo' ? 'campo' : t === 'manutencao_oficina' ? 'oficina' : undefined)

export type CompromissoInicial = Partial<Omit<Compromisso, 'id'>> & { id?: string }

/** Gaveta "Novo compromisso" (ou edição, quando `inicial.id` existe). */
export function CompromissoGaveta({ aberta, aoFechar, inicial, tecnicoFixoId }: {
  aberta: boolean; aoFechar: () => void; inicial?: CompromissoInicial; tecnicoFixoId?: string
}) {
  const usuarios = useStore((s) => s.usuarios)
  const clientes = useStore((s) => s.clientes)
  const ordens = useStore((s) => s.ordens)
  const salvar = useStore((s) => s.salvar)
  const empresa = useStore((s) => s.empresa)
  const servicosCad = useStore((s) => s.servicos)
  const remover = useStore((s) => s.remover)
  const tecnicos = useMemo(() => usuarios.filter((u) => u.papel === 'Técnico'), [usuarios])

  const [f, setF] = useState<Compromisso | null>(null)
  const [erro, setErro] = useState('')
  const checklistMexida = useRef(false)

  useEffect(() => {
    if (!aberta) return
    const ini = new Date(diasAFrente(1, 9, 0))
    const base: Compromisso = {
      id: inicial?.id ?? novoId('cmp'),
      tecnicoId: tecnicoFixoId ?? inicial?.tecnicoId ?? tecnicos[0]?.id ?? '',
      tipo: inicial?.tipo ?? 'atendimento_campo',
      titulo: inicial?.titulo ?? '',
      inicio: inicial?.inicio ?? ini.toISOString(),
      fim: inicial?.fim ?? new Date(ini.getTime() + 2 * 3600000).toISOString(),
      osId: inicial?.osId, clienteId: inicial?.clienteId, local: inicial?.local,
      status: inicial?.status ?? 'agendado', observacoes: inicial?.observacoes,
      checklist: inicial?.checklist ?? padraoDoTipo(inicial?.tipo ?? 'atendimento_campo'),
    }
    checklistMexida.current = !!inicial?.checklist
    setF(base); setErro('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta])

  const padraoDoTipo = (tipo: TipoCompromisso): ItemChecklist[] => {
    const at = atendimentoDe(tipo)
    return at ? montarChecklist({ servicoIds: [], atendimento: at, empresa }) : CHECKLIST_PADRAO[tipo].map((texto) => ({ texto, feito: false }))
  }

  if (!f) return null
  const editando = !!inicial?.id && useStore.getState().compromissos.some((c) => c.id === inicial.id)
  const set = (p: Partial<Compromisso>) => setF((x) => (x ? { ...x, ...p } : x))
  const cliente = clientes.find((c) => c.id === f.clienteId)
  const osDoCliente = ordens.filter((o) => !f.clienteId || o.clienteId === f.clienteId).sort((a, b) => b.numero - a.numero)

  const mudarTipo = (tipo: TipoCompromisso) => {
    set({ tipo, ...(checklistMexida.current ? {} : { checklist: padraoDoTipo(tipo) }) })
  }
  const mudarOS = (osId: string) => {
    const os = ordens.find((o) => o.id === osId)
    if (!os) { set({ osId: undefined }); return }
    const doOS = montarChecklist({ servicoIds: os.itens.map((i) => i.servicoId ?? ''), atendimento: atendimentoDe(f.tipo), servicos: servicosCad, empresa })
    set({ osId, clienteId: os.clienteId, local: f.local ?? os.local, titulo: f.titulo || `Atendimento, OS ${os.numero}`, ...(checklistMexida.current || doOS.length === 0 ? {} : { checklist: doOS }) })
  }
  const mexerLista = (lista: NonNullable<Compromisso['checklist']>) => { checklistMexida.current = true; set({ checklist: lista }) }

  const gravar = () => {
    if (!f.titulo.trim()) return setErro('Dê um título ao compromisso.')
    if (!f.tecnicoId) return setErro('Escolha o técnico.')
    if (new Date(f.fim) <= new Date(f.inicio)) return setErro('O fim precisa ser depois do início.')
    salvar('compromissos', {
      ...f, titulo: f.titulo.trim(),
      checklist: (f.checklist ?? []).filter((i) => i.texto.trim()),
    })
    toast.sucesso(editando ? 'Compromisso atualizado' : 'Compromisso criado')
    aoFechar()
  }

  return (
    <Gaveta
      aberta={aberta} aoFechar={aoFechar} titulo={editando ? 'Editar compromisso' : 'Novo compromisso'} largura="lg"
      rodape={<>
        {editando && <Button variante="perigo" className="mr-auto" onClick={() => { remover('compromissos', f.id); toast.info('Compromisso removido'); aoFechar() }}>Remover</Button>}
        <Button variante="secundario" onClick={aoFechar}>Cancelar</Button>
        <Button onClick={gravar}>{editando ? 'Salvar' : 'Criar compromisso'}</Button>
      </>}
    >
      <div className="space-y-4">
        {!tecnicoFixoId && (
          <Campo rotulo="Técnico" obrigatorio>
            <Select value={f.tecnicoId} onChange={(e) => set({ tecnicoId: e.target.value })}>
              {tecnicos.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Campo>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Tipo">
            <Select value={f.tipo} onChange={(e) => mudarTipo(e.target.value as TipoCompromisso)}>
              {(Object.keys(ROTULO_TIPO) as TipoCompromisso[]).map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Título" obrigatorio><Input value={f.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="Ex.: Vistoria na fazenda" /></Campo>
          <Campo rotulo="Início"><Input type="datetime-local" value={paraDatetimeLocal(f.inicio)} onChange={(e) => e.target.value && set({ inicio: deDatetimeLocal(e.target.value) })} /></Campo>
          <Campo rotulo="Fim"><Input type="datetime-local" value={paraDatetimeLocal(f.fim)} onChange={(e) => e.target.value && set({ fim: deDatetimeLocal(e.target.value) })} /></Campo>
          <Campo rotulo="Cliente">
            <Select value={f.clienteId ?? ''} onChange={(e) => set({ clienteId: e.target.value || undefined, osId: undefined })}>
              <option value="">Sem cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Ordem de serviço (opcional)">
            <Select value={f.osId ?? ''} onChange={(e) => mudarOS(e.target.value)}>
              <option value="">Sem OS</option>
              {osDoCliente.map((o) => <option key={o.id} value={o.id}>OS {o.numero}</option>)}
            </Select>
          </Campo>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Local</p>
          {f.local && <CartaoLocal local={f.local} titulo="Local do compromisso" semMapa />}
          <EditorLocal valor={f.local} aoMudar={(l) => set({ local: l })} locaisCliente={cliente?.locais} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Checklist</p>
          <BarraProgresso lista={f.checklist} />
          <ul className="mt-2 space-y-2">
            {(f.checklist ?? []).map((i, idx, arr) => (
              <li key={idx}>
                {i.origem && i.origem !== arr[idx - 1]?.origem && <p className="mb-1 mt-2 text-xs font-medium text-mata-suave">{i.origem}</p>}
                <div className="flex items-center gap-2">
                  <input type="checkbox" aria-label="Item feito" className="h-5 w-5 shrink-0 accent-lavoura" checked={i.feito} onChange={() => mexerLista((f.checklist ?? []).map((x, k) => (k === idx ? { ...x, feito: !x.feito } : x)))} />
                  <Input aria-label="Texto do item do checklist" value={i.texto} onChange={(e) => mexerLista((f.checklist ?? []).map((x, k) => (k === idx ? { ...x, texto: e.target.value } : x)))} />
                  <button type="button" aria-label="Remover item" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-campo border border-linha hover:bg-nevoa"
                    onClick={() => mexerLista((f.checklist ?? []).filter((_, k) => k !== idx))}><X size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
          <Button tamanho="sm" variante="secundario" className="mt-2" icone={<Plus size={16} />} onClick={() => mexerLista([...(f.checklist ?? []), { texto: '', feito: false }])}>Adicionar item</Button>
        </div>

        <Campo rotulo="Observações"><Textarea rows={3} value={f.observacoes ?? ''} onChange={(e) => set({ observacoes: e.target.value || undefined })} /></Campo>
        {erro && <p role="alert" className="text-sm text-barro-texto">{erro}</p>}
      </div>
    </Gaveta>
  )
}
