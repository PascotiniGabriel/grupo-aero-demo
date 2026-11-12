import { useEffect, useMemo, useState } from 'react'
import { ListChecks, Plus, QrCode, X } from 'lucide-react'
import { novoId, useStore } from '@/store'
import { Button, Campo, Gaveta, Input, Select, toast } from '@/components/ui'
import { useLeitorQR, localizarCodigo } from '@/components/qr/LeitorQR'
import { nomeModelo } from '@/store/selectors'
import { agruparChecklist, montarChecklist } from '@/lib/checklist'
import { brl } from '@/lib/format'
import { diasAFrente } from '@/data/seed'
import { CampoDitado } from './CampoDitado'
import { EditorLocal, CartaoLocal } from './LocalUI'
import type { Compromisso, ItemComercial, Local, OrdemServico } from '@/types'

const diaISO = (iso: string) => iso.slice(0, 10)
const pad2 = (n: number) => String(n).padStart(2, '0')
const diaLocal = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** Padrão do agendamento: hoje, na próxima hora cheia, se ainda der tempo; senão amanhã às 8h. */
function agendaPadrao() {
  const agora = new Date()
  if (agora.getHours() < 15 && agora.getHours() >= 6) {
    const h = Math.max(8, agora.getHours() + 1)
    return { dia: diaLocal(agora), ini: `${pad2(h)}:00`, fim: `${pad2(h + 2)}:00` }
  }
  return { dia: diaLocal(new Date(diasAFrente(1, 8, 0))), ini: '08:00', fim: '10:00' }
}
const chaveItem = (t: string) => t.trim().toLowerCase()

export function NovaOSGaveta({ aberta, aoFechar, equipamentoInicial, aoCriar }: {
  aberta: boolean; aoFechar: () => void; equipamentoInicial?: string; aoCriar: (os: OrdemServico) => void
}) {
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const produtos = useStore((s) => s.produtos)
  const usuarios = useStore((s) => s.usuarios)
  const salvar = useStore((s) => s.salvar)
  const servicos = useStore((s) => s.servicos)
  const empresa = useStore((s) => s.empresa)
  const proximoNumero = useStore((s) => s.proximoNumero)
  const { abrir } = useLeitorQR()

  const tecnicos = useMemo(() => usuarios.filter((u) => u.papel === 'Técnico'), [usuarios])
  const [clienteId, setClienteId] = useState('')
  const [equipId, setEquipId] = useState('')
  const [relato, setRelato] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [dia, setDia] = useState('')
  const [hIni, setHIni] = useState('')
  const [hFim, setHFim] = useState('')
  const [servicoIds, setServicoIds] = useState<string[]>([])
  const [excluidos, setExcluidos] = useState<string[]>([])
  const [avulsos, setAvulsos] = useState<string[]>([])
  const [novoAvulso, setNovoAvulso] = useState('')
  const [previsao, setPrevisao] = useState(() => diaISO(diasAFrente(7)))
  const [erro, setErro] = useState('')
  const [atendimento, setAtendimento] = useState<'oficina' | 'campo'>('oficina')
  const [local, setLocal] = useState<Local | undefined>()

  useEffect(() => {
    if (!aberta) return
    const eq = equipamentos.find((e) => e.id === equipamentoInicial)
    setClienteId(eq?.clienteId ?? ''); setEquipId(eq?.id ?? ''); setRelato(''); setErro('')
    const ag = agendaPadrao()
    setTecnicoId(tecnicos[0]?.id ?? ''); setDia(ag.dia); setHIni(ag.ini); setHFim(ag.fim)
    setServicoIds([]); setExcluidos([]); setAvulsos([]); setNovoAvulso('')
    setPrevisao(diaISO(diasAFrente(7))); setAtendimento('oficina'); setLocal(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta, equipamentoInicial])

  const montados = useMemo(() => montarChecklist({ servicoIds, atendimento, servicos, empresa }), [servicoIds, atendimento, servicos, empresa])
  const grupos = useMemo(() => agruparChecklist(montados), [montados])
  const alternarServico = (id: string) => setServicoIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const alternarItem = (t: string) => setExcluidos((l) => (l.includes(chaveItem(t)) ? l.filter((x) => x !== chaveItem(t)) : [...l, chaveItem(t)]))
  const adicionarAvulso = () => {
    const t = novoAvulso.trim()
    if (!t) return
    if (!avulsos.some((a) => chaveItem(a) === chaveItem(t)) && !montados.some((m) => chaveItem(m.texto) === chaveItem(t))) setAvulsos((l) => [...l, t])
    setNovoAvulso('')
  }
  const totalChecklist = montados.filter((m) => !excluidos.includes(chaveItem(m.texto))).length + avulsos.length

  const dronesDoCliente = equipamentos.filter((e) => e.clienteId === clienteId)

  function lerQR() {
    abrir({
      titulo: 'Ler QR do drone',
      aoLer: (codigo) => {
        const r = localizarCodigo(codigo, produtos, equipamentos)
        if (r.tipo === 'equipamento') { setClienteId(r.equipamento.clienteId); setEquipId(r.equipamento.id); setErro(''); toast.sucesso('Drone identificado') }
        else toast.erro('Esse código não é de um drone cadastrado.')
      },
    })
  }

  function criar() {
    if (!clienteId) return setErro('Escolha o cliente.')
    if (!equipId) return setErro('Escolha o drone do cliente.')
    if (atendimento === 'campo' && !local) return setErro('Informe o local do atendimento em campo.')
    const tec = tecnicos.find((u) => u.id === tecnicoId)
    if (!tec) return setErro('Escolha o técnico responsável.')
    const inicio = new Date(`${dia}T${hIni}:00`)
    const fim = new Date(`${dia}T${hFim}:00`)
    if (!dia || !hIni || !hFim || isNaN(inicio.getTime()) || isNaN(fim.getTime())) return setErro('Informe o dia e o horário do agendamento.')
    if (fim <= inicio) return setErro('O horário final precisa ser depois do inicial.')
    const numero = proximoNumero('os')
    const agora = new Date().toISOString()
    const os: OrdemServico = {
      id: `os-${numero}`, numero, clienteId, equipamentoId: equipId, status: 'recebido',
      abertura: agora, previsao: new Date(`${previsao}T12:00:00`).toISOString(),
      tecnico: tec.nome, relatoCliente: relato.trim(), diagnostico: '', fotos: [],
      itens: servicoIds.flatMap((id): ItemComercial[] => { const sv = servicos.find((x) => x.id === id); return sv ? [{ id: novoId('it'), tipo: 'servico', servicoId: sv.id, descricao: sv.nome, quantidade: 1, valorUnit: sv.preco }] : [] }),
      historico: [{ data: agora, texto: atendimento === 'campo' ? 'OS aberta para atendimento em campo' : 'OS aberta' }],
      atendimento, local: atendimento === 'campo' ? local : undefined,
    }
    salvar('ordens', os)
    const campo = atendimento === 'campo'
    const cmp: Compromisso = {
      id: novoId('cmp'), tecnicoId: tec.id, tipo: campo ? 'atendimento_campo' : 'manutencao_oficina',
      titulo: `${campo ? 'Atendimento em campo' : 'Manutenção na oficina'}, OS ${numero}`,
      inicio: inicio.toISOString(), fim: fim.toISOString(), osId: os.id, clienteId, local: campo ? local : undefined, status: 'agendado',
      checklist: [
        ...montados.filter((m) => !excluidos.includes(chaveItem(m.texto))),
        ...avulsos.map((texto) => ({ texto, feito: false })),
      ],
    }
    salvar('compromissos', cmp)
    toast.sucesso(`OS ${numero} lançada para ${tec.nome.split(' ')[0]} — já está na agenda dele`)
    aoCriar(os)
  }

  return (
    <Gaveta
      aberta={aberta} aoFechar={aoFechar} titulo="Lançar ordem de serviço" largura="md"
      rodape={<><Button variante="secundario" onClick={aoFechar}>Cancelar</Button><Button onClick={criar}>Lançar OS</Button></>}
    >
      <div className="space-y-4">
        <Button variante="secundario" bloco icone={<QrCode size={18} />} onClick={lerQR}>Ler QR do drone</Button>
        <Campo rotulo="Cliente" obrigatorio>
          <Select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setEquipId(''); setErro('') }}>
            <option value="">Escolha o cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Drone" obrigatorio ajuda={clienteId && dronesDoCliente.length === 0 ? 'Este cliente ainda não tem drone cadastrado.' : undefined}>
          <Select value={equipId} onChange={(e) => { setEquipId(e.target.value); setErro('') }} disabled={!clienteId}>
            <option value="">{clienteId ? 'Escolha o drone' : 'Escolha o cliente primeiro'}</option>
            {dronesDoCliente.map((e) => (
              <option key={e.id} value={e.id}>{nomeModelo(e.modeloId, modelos)} · {e.serial}{e.apelido ? ` · ${e.apelido}` : ''}</option>
            ))}
          </Select>
        </Campo>
        <div role="group" aria-label="Onde será o atendimento" className="flex rounded-campo border border-linha bg-papel p-0.5">
          {([['oficina', 'Oficina'], ['campo', 'Campo']] as const).map(([id, rot]) => (
            <button key={id} type="button" aria-pressed={atendimento === id} onClick={() => setAtendimento(id)}
              className={`h-10 flex-1 rounded-[5px] text-sm font-medium ${atendimento === id ? 'bg-forte text-white' : 'text-mata-suave hover:text-mata'}`}>{rot}</button>
          ))}
        </div>
        {atendimento === 'campo' && (
          <div className="space-y-3">
            {local && <CartaoLocal local={local} titulo="Local do atendimento" semMapa />}
            <EditorLocal valor={local} aoMudar={(l) => { setLocal(l); setErro('') }} locaisCliente={clientes.find((c) => c.id === clienteId)?.locais} />
          </div>
        )}
        <Campo rotulo="O que o cliente relatou">
          <CampoDitado rotulo="Relato do cliente" valor={relato} aoMudar={setRelato} placeholder="Ex.: caiu na lavoura e o braço 3 trincou" />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Técnico responsável">
            <Select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
              {tecnicos.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Previsão de entrega">
            <Input type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
          </Campo>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Agendar na agenda do técnico</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Campo rotulo="Dia" className="col-span-2 sm:col-span-1"><Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
            <Campo rotulo="Início"><Input type="time" value={hIni} onChange={(e) => setHIni(e.target.value)} /></Campo>
            <Campo rotulo="Fim"><Input type="time" value={hFim} onChange={(e) => setHFim(e.target.value)} /></Campo>
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Serviços previstos</legend>
          <ul className="grid gap-1 sm:grid-cols-2">
            {servicos.map((sv) => (
              <li key={sv.id}>
                <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-campo border border-linha px-2 text-sm hover:bg-nevoa">
                  <input type="checkbox" className="h-5 w-5 shrink-0 accent-lavoura" checked={servicoIds.includes(sv.id)} onChange={() => alternarServico(sv.id)} />
                  <span className="min-w-0 flex-1">{sv.nome}</span><span className="num shrink-0 text-xs text-mata-suave">{brl(sv.preco)}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <div className="rounded-painel border border-linha p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><ListChecks size={16} aria-hidden />Checklist do compromisso <span className="num text-mata-suave">({totalChecklist} {totalChecklist === 1 ? 'item' : 'itens'})</span></p>
          <p className="mb-2 text-xs text-mata-suave">Desmarque o que não se aplica a esta OS. O técnico vê só o que ficar marcado.</p>
          <div className="space-y-2">
            {grupos.map((g) => (
              <div key={g.origem}>
                <p className="text-xs font-medium text-mata-suave">{g.origem}</p>
                <ul>
                  {g.itens.map(({ item }) => (
                    <li key={item.texto}>
                      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
                        <input type="checkbox" className="h-5 w-5 shrink-0 accent-lavoura" checked={!excluidos.includes(chaveItem(item.texto))} onChange={() => alternarItem(item.texto)} />
                        <span>{item.texto}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {avulsos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-mata-suave">Avulsos</p>
                <ul>
                  {avulsos.map((t) => (
                    <li key={t} className="flex min-h-10 items-center justify-between gap-2 text-sm">
                      <span>{t}</span>
                      <button type="button" aria-label={`Remover ${t}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-campo hover:bg-nevoa" onClick={() => setAvulsos((l) => l.filter((x) => x !== t))}><X size={16} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <Input aria-label="Novo item avulso" value={novoAvulso} placeholder="Adicionar item avulso" onChange={(e) => setNovoAvulso(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarAvulso() } }} />
            <Button variante="secundario" icone={<Plus size={16} />} onClick={adicionarAvulso}>Adicionar</Button>
          </div>
        </div>
        {erro && <p role="alert" className="text-sm text-barro-texto">{erro}</p>}
      </div>
    </Gaveta>
  )
}
