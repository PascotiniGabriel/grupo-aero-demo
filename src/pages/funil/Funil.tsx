import { useMemo, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, FilePlus2, MapPin, Plus, Trash2 } from 'lucide-react'
import type { EtapaLead, Lead } from '@/types'
import { Avatar, Button, Campo, CabecalhoPagina, Confirmar, Gaveta, Indicador, Input, Select, Textarea, cx, toast } from '@/components/ui'
import { useStore, novoId } from '@/store'
import { brl, relativo } from '@/lib/format'
import { diasAFrente } from '@/data/seed'

const ETAPAS: { id: EtapaLead; rotulo: string; peso: number; dica: string }[] = [
  { id: 'novo', rotulo: 'Novo', peso: 0.1, dica: 'Acabou de chegar' },
  { id: 'contato', rotulo: 'Em contato', peso: 0.25, dica: 'Conversando' },
  { id: 'demonstracao', rotulo: 'Demonstração', peso: 0.5, dica: 'Viu o drone voar' },
  { id: 'proposta', rotulo: 'Proposta', peso: 0.75, dica: 'Aguardando resposta' },
  { id: 'fechado', rotulo: 'Fechado', peso: 1, dica: 'Venda feita' },
  { id: 'perdido', rotulo: 'Perdido', peso: 0, dica: 'Não avançou' },
]
const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']
const ORIGENS = ['Instagram', 'Indicação', 'WhatsApp', 'Site', 'Feira agrícola', 'Cliente atual', 'Ligação']

const paraInput = (iso: string) => (iso ? iso.slice(0, 10) : '')
const deInput = (v: string) => (v ? new Date(`${v}T12:00:00`).toISOString() : new Date().toISOString())
const atrasada = (l: Lead) => {
  if (l.etapa === 'fechado' || l.etapa === 'perdido') return false
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return new Date(l.proximaData).getTime() < hoje.getTime()
}

export default function Funil() {
  const navegar = useNavigate()
  const leads = useStore((s) => s.leads)
  const usuarios = useStore((s) => s.usuarios)
  const usuarioAtualId = useStore((s) => s.usuarioAtualId)
  const salvar = useStore((s) => s.salvar)
  const remover = useStore((s) => s.remover)

  const [editando, setEditando] = useState<Lead | null>(null)
  const [ehNovo, setEhNovo] = useState(false)
  const [excluir, setExcluir] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<EtapaLead | null>(null)

  const porEtapa = useMemo(() => {
    const m: Record<EtapaLead, Lead[]> = { novo: [], contato: [], demonstracao: [], proposta: [], fechado: [], perdido: [] }
    for (const l of leads) m[l.etapa].push(l)
    for (const k of Object.keys(m) as EtapaLead[]) m[k].sort((a, b) => a.proximaData.localeCompare(b.proximaData))
    return m
  }, [leads])

  const emNegociacao = leads.filter((l) => !['fechado', 'perdido'].includes(l.etapa))
  const valorAberto = emNegociacao.reduce((s, l) => s + l.valorEstimado, 0)
  const ponderada = emNegociacao.reduce((s, l) => s + l.valorEstimado * (ETAPAS.find((e) => e.id === l.etapa)?.peso ?? 0), 0)
  const fechado = porEtapa.fechado.reduce((s, l) => s + l.valorEstimado, 0)
  const nAtrasadas = leads.filter(atrasada).length

  const mover = (id: string, etapa: EtapaLead) => {
    const l = leads.find((x) => x.id === id)
    if (!l || l.etapa === etapa) return
    salvar('leads', { ...l, etapa })
    const rotulo = ETAPAS.find((e) => e.id === etapa)?.rotulo
    if (etapa === 'fechado') toast.sucesso(`${l.nome}: venda fechada`)
    else toast.info(`${l.nome} movido para ${rotulo}`)
  }

  const soltar = (e: DragEvent, etapa: EtapaLead) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || arrastando
    setSobre(null); setArrastando(null)
    if (id) mover(id, etapa)
  }

  const novoContato = () => {
    const eu = usuarios.find((u) => u.id === usuarioAtualId)
    setEhNovo(true)
    setEditando({
      id: novoId('lead'), nome: '', cidade: '', uf: 'BA', fone: '', interesse: '', valorEstimado: 0, etapa: 'novo', origem: 'WhatsApp',
      responsavel: eu?.nome ?? usuarios[0]?.nome ?? '', proximaAcao: 'Fazer o primeiro contato', proximaData: diasAFrente(1), criadoEm: new Date().toISOString(),
    })
  }
  const abrir = (l: Lead) => { setEhNovo(false); setEditando({ ...l }) }
  const fechar = () => { setEditando(null); setExcluir(false) }
  const mudar = (p: Partial<Lead>) => setEditando((l) => (l ? { ...l, ...p } : l))

  const gravar = () => {
    if (!editando) return
    if (!editando.nome.trim()) { toast.erro('Informe o nome do contato'); return }
    salvar('leads', { ...editando, nome: editando.nome.trim() })
    toast.sucesso(ehNovo ? 'Contato criado' : 'Contato atualizado')
    fechar()
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Funil de vendas" descricao="Interessados em drones, da primeira conversa ao fechamento."
        acoes={<Button icone={<Plus size={16} />} onClick={novoContato}>Novo contato</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Em negociação" valor={brl(valorAberto)} detalhe={`${emNegociacao.length} contatos abertos`} />
        <Indicador rotulo="Previsão ponderada" valor={brl(ponderada)} detalhe="Cada etapa pesa pela chance de fechar" />
        <Indicador rotulo="Fechado" valor={brl(fechado)} cor="verde" detalhe={`${porEtapa.fechado.length} vendas`} />
        <Indicador rotulo="Ações atrasadas" valor={String(nAtrasadas)} cor={nAtrasadas ? 'vermelho' : undefined} detalhe={nAtrasadas ? 'Retome esses contatos primeiro' : 'Tudo em dia'} />
      </div>

      <div className="w-0 min-w-full overflow-x-auto pb-3">
        <div className="flex gap-3">
          {ETAPAS.map((et) => {
            const itens = porEtapa[et.id]
            const soma = itens.reduce((s, l) => s + l.valorEstimado, 0)
            return (
              <section
                key={et.id} aria-label={`Etapa ${et.rotulo}`}
                onDragOver={(e) => { e.preventDefault(); if (sobre !== et.id) setSobre(et.id) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null) }}
                onDrop={(e) => soltar(e, et.id)}
                className={cx(
                  'flex max-h-[68dvh] min-w-[264px] flex-1 flex-col rounded-painel border bg-nevoa transition-colors',
                  sobre === et.id ? 'border-lavoura bg-lavoura-claro/40' : 'border-linha', et.id === 'perdido' && 'opacity-85',
                )}
              >
                <header className="border-b border-linha px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="titulo text-sm">{et.rotulo}</h2>
                    <span className="num rounded-full bg-papel px-2 py-0.5 text-xs text-mata-suave">{itens.length}</span>
                  </div>
                  <p className="num mt-0.5 text-xs text-mata-suave">{brl(soma)}</p>
                </header>
                <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {itens.length === 0 && <li className="px-2 py-6 text-center text-xs text-mata-suave">{et.dica}. Arraste um contato para cá.</li>}
                  {itens.map((l) => (
                    <li
                      key={l.id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', l.id); e.dataTransfer.effectAllowed = 'move'; setArrastando(l.id) }}
                      onDragEnd={() => { setArrastando(null); setSobre(null) }}
                      className={cx('rounded-painel border border-linha bg-papel p-3 lg:cursor-grab', arrastando === l.id && 'opacity-40')}
                    >
                      <button type="button" onClick={() => abrir(l)} className="block w-full text-left">
                        <p className="flex items-start justify-between gap-2">
                          <span className="font-medium leading-snug">{l.nome}</span>
                          <span className="num shrink-0 text-sm">{brl(l.valorEstimado)}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-mata-suave"><MapPin size={12} aria-hidden />{l.cidade}/{l.uf}</p>
                        <p className="mt-2 text-sm leading-snug">{l.interesse}</p>
                        <p className={cx('mt-2 flex items-start gap-1.5 text-xs', atrasada(l) ? 'font-medium text-barro' : 'text-mata-suave')}>
                          <CalendarClock size={14} className="mt-px shrink-0" aria-hidden />
                          <span>{l.proximaAcao} · {atrasada(l) ? 'atrasada, ' : ''}{relativo(l.proximaData)}</span>
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-mata-suave"><Avatar nome={l.responsavel} tamanho={20} />{l.responsavel}</p>
                      </button>
                      <Select aria-label={`Mover ${l.nome} para`} value="" onChange={(e) => e.target.value && mover(l.id, e.target.value as EtapaLead)} className="mt-2 lg:hidden">
                        <option value="">Mover para…</option>
                        {ETAPAS.filter((x) => x.id !== l.etapa).map((x) => <option key={x.id} value={x.id}>{x.rotulo}</option>)}
                      </Select>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>

      <Gaveta
        aberta={!!editando} aoFechar={fechar} titulo={ehNovo ? 'Novo contato' : editando?.nome || 'Contato'}
        rodape={editando && (
          <>
            {!ehNovo && <Button variante="fantasma" icone={<Trash2 size={16} />} onClick={() => setExcluir(true)} className="mr-auto text-barro">Excluir</Button>}
            {!ehNovo && <Button variante="secundario" icone={<FilePlus2 size={16} />} onClick={() => navegar(`/orcamentos/novo?lead=${editando.id}`)}>Gerar orçamento</Button>}
            <Button onClick={gravar}>{ehNovo ? 'Criar contato' : 'Salvar'}</Button>
          </>
        )}
      >
        {editando && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome" obrigatorio className="sm:col-span-2"><Input value={editando.nome} onChange={(e) => mudar({ nome: e.target.value })} autoFocus={ehNovo} /></Campo>
            <Campo rotulo="Cidade"><Input value={editando.cidade} onChange={(e) => mudar({ cidade: e.target.value })} /></Campo>
            <Campo rotulo="Estado">
              <Select value={editando.uf} onChange={(e) => mudar({ uf: e.target.value })}>{UFS.map((u) => <option key={u}>{u}</option>)}</Select>
            </Campo>
            <Campo rotulo="Telefone"><Input value={editando.fone} inputMode="tel" onChange={(e) => mudar({ fone: e.target.value })} placeholder="(77) 90000-0000" /></Campo>
            <Campo rotulo="Origem">
              <Select value={editando.origem} onChange={(e) => mudar({ origem: e.target.value })}>
                {!ORIGENS.includes(editando.origem) && <option>{editando.origem}</option>}
                {ORIGENS.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </Campo>
            <Campo rotulo="Interesse" className="sm:col-span-2"><Input value={editando.interesse} onChange={(e) => mudar({ interesse: e.target.value })} placeholder="Ex.: Drone T40 para 500 ha de soja" /></Campo>
            <Campo rotulo="Valor estimado (R$)">
              <Input type="number" inputMode="decimal" min={0} className="num" value={editando.valorEstimado} onChange={(e) => mudar({ valorEstimado: Math.max(0, parseFloat(e.target.value) || 0) })} />
            </Campo>
            <Campo rotulo="Etapa">
              <Select value={editando.etapa} onChange={(e) => mudar({ etapa: e.target.value as EtapaLead })}>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}</Select>
            </Campo>
            <Campo rotulo="Cultura e área" className="sm:col-span-2"><Input value={editando.culturaHa ?? ''} onChange={(e) => mudar({ culturaHa: e.target.value })} placeholder="Ex.: Soja, 800 ha" /></Campo>
            <Campo rotulo="Próxima ação" className="sm:col-span-2"><Textarea rows={2} value={editando.proximaAcao} onChange={(e) => mudar({ proximaAcao: e.target.value })} /></Campo>
            <Campo rotulo="Data da próxima ação"><Input type="date" value={paraInput(editando.proximaData)} onChange={(e) => mudar({ proximaData: deInput(e.target.value) })} /></Campo>
            <Campo rotulo="Responsável">
              <Select value={editando.responsavel} onChange={(e) => mudar({ responsavel: e.target.value })}>
                {!usuarios.some((u) => u.nome === editando.responsavel) && <option>{editando.responsavel}</option>}
                {usuarios.map((u) => <option key={u.id}>{u.nome}</option>)}
              </Select>
            </Campo>
          </div>
        )}
      </Gaveta>

      <Confirmar
        aberto={excluir} titulo="Excluir este contato?" texto="Ele sai do funil. Essa ação não pode ser desfeita." rotuloConfirmar="Excluir" perigo
        aoConfirmar={() => { if (editando) remover('leads', editando.id); toast.sucesso('Contato excluído'); fechar() }} aoCancelar={() => setExcluir(false)}
      />
    </>
  )
}
