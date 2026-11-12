import { useState } from 'react'
import { CalendarClock, UserCog } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Campo, Input, Modal, Painel, Select, Selo, toast } from '@/components/ui'
import { usePapel } from '@/components/layout/nav'
import { BarraProgresso, ChecklistGrupos } from '@/pages/agenda/ChecklistUI'
import { COR_STATUS, ROTULO_STATUS, deDatetimeLocal, faixaHora, paraDatetimeLocal, quando } from '@/pages/agenda/agendaUtil'
import type { OrdemServico } from '@/types'

/** Bloco "Agenda e checklist" da OS: técnico, data, status, progresso e checklist marcável. */
export function AgendaChecklistOS({ os }: { os: OrdemServico }) {
  const compromissos = useStore((s) => s.compromissos)
  const usuarios = useStore((s) => s.usuarios)
  const salvar = useStore((s) => s.salvar)
  const gestor = usePapel() === 'Gestor'
  const [modal, setModal] = useState<'reagendar' | 'trocar' | null>(null)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')

  const lista = (compromissos ?? []).filter((c) => c.osId === os.id && c.status !== 'cancelado').sort((a, b) => a.inicio.localeCompare(b.inicio))
  const c = lista.find((x) => x.status !== 'concluido') ?? lista[lista.length - 1]
  if (!c) return null
  const tecnico = usuarios.find((u) => u.id === c.tecnicoId)
  const tecnicos = usuarios.filter((u) => u.papel === 'Técnico')

  const marcar = (idx: number) => salvar('compromissos', { ...c, checklist: (c.checklist ?? []).map((i, k) => (k === idx ? { ...i, feito: !i.feito } : i)) })
  const abrirReagendar = () => { setInicio(paraDatetimeLocal(c.inicio)); setFim(paraDatetimeLocal(c.fim)); setModal('reagendar') }
  const abrirTrocar = () => { setTecnicoId(c.tecnicoId); setModal('trocar') }

  function reagendar() {
    if (!inicio || !fim || new Date(fim) <= new Date(inicio)) return toast.erro('O fim precisa ser depois do início.')
    salvar('compromissos', { ...c, inicio: deDatetimeLocal(inicio), fim: deDatetimeLocal(fim) })
    salvar('ordens', { ...os, historico: [...os.historico, { data: new Date().toISOString(), texto: 'Visita reagendada' }] })
    setModal(null); toast.sucesso('Visita reagendada')
  }
  function trocar() {
    const novo = usuarios.find((u) => u.id === tecnicoId)
    if (!novo || novo.id === c.tecnicoId) return setModal(null)
    salvar('compromissos', { ...c, tecnicoId: novo.id })
    salvar('ordens', { ...os, tecnico: novo.nome, historico: [...os.historico, { data: new Date().toISOString(), texto: `Técnico trocado para ${novo.nome}` }] })
    setModal(null); toast.sucesso(`OS ${os.numero} agora é de ${novo.nome.split(' ')[0]}`)
  }

  return (
    <Painel
      className="mb-4" titulo="Agenda e checklist"
      acoes={gestor && (
        <div className="flex flex-wrap gap-2">
          <Button tamanho="sm" variante="secundario" icone={<CalendarClock size={16} />} onClick={abrirReagendar}>Reagendar</Button>
          <Button tamanho="sm" variante="secundario" icone={<UserCog size={16} />} onClick={abrirTrocar}>Trocar técnico</Button>
        </div>
      )}
    >
      <dl className="mb-3 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-mata-suave">Técnico</dt><dd className="font-medium">{tecnico?.nome ?? os.tecnico}</dd></div>
        <div><dt className="text-xs text-mata-suave">Quando</dt><dd className="num font-medium">{quando(c.inicio)} <span className="font-normal text-mata-suave">({faixaHora(c)})</span></dd></div>
        <div><dt className="text-xs text-mata-suave">Status</dt><dd><Selo cor={COR_STATUS[c.status]}>{ROTULO_STATUS[c.status]}</Selo></dd></div>
      </dl>
      {(c.checklist?.length ?? 0) > 0 ? (
        <div>
          <BarraProgresso lista={c.checklist} />
          <div className="mt-1"><ChecklistGrupos lista={c.checklist ?? []} aoMarcar={marcar} /></div>
        </div>
      ) : <p className="text-sm text-mata-suave">Este compromisso ainda não tem checklist.</p>}

      <Modal
        aberto={modal === 'reagendar'} aoFechar={() => setModal(null)} titulo="Reagendar visita" largura="sm"
        rodape={<><Button variante="secundario" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={reagendar}>Reagendar</Button></>}
      >
        <div className="space-y-4">
          <Campo rotulo="Início"><Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} /></Campo>
          <Campo rotulo="Fim"><Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} /></Campo>
        </div>
      </Modal>
      <Modal
        aberto={modal === 'trocar'} aoFechar={() => setModal(null)} titulo="Trocar técnico" largura="sm"
        rodape={<><Button variante="secundario" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={trocar}>Trocar técnico</Button></>}
      >
        <Campo rotulo="Técnico responsável">
          <Select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
            {tecnicos.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
        </Campo>
      </Modal>
    </Painel>
  )
}
