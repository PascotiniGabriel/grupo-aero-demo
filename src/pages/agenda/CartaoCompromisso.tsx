import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, Pencil, Play, CheckCircle2, Wrench, User } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Confirmar, Selo, cx, toast } from '@/components/ui'
import type { Compromisso } from '@/types'
import { BotoesLocal, DadosLocal } from '@/pages/os/LocalUI'
import { BarraProgresso, ChecklistGrupos } from './ChecklistUI'
import { COR_STATUS, ROTULO_STATUS, ROTULO_TIPO, faixaHora } from './agendaUtil'

/** Cartão completo de um compromisso: horário, cliente, OS, local com Waze/Maps, checklist e ações. */
export function CartaoCompromisso({ c, destaque, rotuloDestaque, mostrarTecnico, aoEditar, corTecnico }: {
  c: Compromisso; destaque?: boolean; rotuloDestaque?: string; mostrarTecnico?: boolean; aoEditar?: () => void; corTecnico?: string
}) {
  const navegar = useNavigate()
  const salvar = useStore((s) => s.salvar)
  const clientes = useStore((s) => s.clientes)
  const ordens = useStore((s) => s.ordens)
  const usuarios = useStore((s) => s.usuarios)
  const [irOS, setIrOS] = useState(false)

  const cliente = clientes.find((x) => x.id === c.clienteId)
  const os = ordens.find((x) => x.id === c.osId)
  const tecnico = usuarios.find((u) => u.id === c.tecnicoId)

  const marcar = (idx: number) =>
    salvar('compromissos', { ...c, checklist: (c.checklist ?? []).map((i, k) => (k === idx ? { ...i, feito: !i.feito } : i)) })
  const iniciar = () => { salvar('compromissos', { ...c, status: 'em_andamento' }); toast.sucesso('Compromisso iniciado') }
  const concluir = () => {
    salvar('compromissos', { ...c, status: 'concluido' })
    toast.sucesso('Compromisso concluído')
    if (os) setIrOS(true)
  }

  return (
    <article className={cx('rounded-painel border bg-papel p-4', destaque ? 'border-2 border-lavoura' : 'border-linha', c.status === 'concluido' && 'opacity-80')}>
      {rotuloDestaque && <p className="mb-2 text-xs font-semibold text-lavoura-texto">{rotuloDestaque}</p>}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="num flex items-center gap-1.5 text-sm font-semibold"><Clock size={15} aria-hidden />{faixaHora(c)}</p>
          <h3 className="mt-0.5 text-base">{c.titulo}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Selo>{ROTULO_TIPO[c.tipo]}</Selo>
          <Selo cor={COR_STATUS[c.status]}>{ROTULO_STATUS[c.status]}</Selo>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {mostrarTecnico && tecnico && <span className="inline-flex items-center gap-1.5"><span className={cx('h-2.5 w-2.5 rounded-full', corTecnico)} aria-hidden /><User size={14} aria-hidden />{tecnico.nome}</span>}
        {cliente && <Link to={`/clientes/${cliente.id}`} className="font-medium text-ceu hover:underline">{cliente.nome}</Link>}
        {os && <Link to={`/os/${os.id}`} className="inline-flex items-center gap-1 font-medium text-ceu hover:underline"><Wrench size={14} aria-hidden />OS {os.numero}</Link>}
      </div>

      {c.local && (
        <div className="mt-3 space-y-3 rounded-campo bg-nevoa p-3">
          <DadosLocal local={c.local} />
          <BotoesLocal local={c.local} titulo={c.titulo} compacto />
        </div>
      )}

      {c.checklist && c.checklist.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-mata-suave">Checklist</p>
          <BarraProgresso lista={c.checklist} />
          <div className="mt-1"><ChecklistGrupos lista={c.checklist} aoMarcar={marcar} /></div>
        </div>
      )}
      {c.observacoes && <p className="mt-2 text-sm text-mata-suave">{c.observacoes}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {c.status === 'agendado' && <Button tamanho="lg" icone={<Play size={18} />} onClick={iniciar}>Iniciar</Button>}
        {(c.status === 'agendado' || c.status === 'em_andamento') && (
          <Button tamanho="lg" variante={c.status === 'em_andamento' ? 'primario' : 'secundario'} icone={<CheckCircle2 size={18} />} onClick={concluir}>Concluir</Button>
        )}
        {aoEditar && <Button tamanho="lg" variante="fantasma" icone={<Pencil size={16} />} onClick={aoEditar}>Editar</Button>}
      </div>

      <Confirmar
        aberto={irOS} titulo="Compromisso concluído"
        texto={os ? `Quer abrir a OS ${os.numero} para registrar fotos e montar o relatório?` : undefined}
        rotuloConfirmar="Ir para a OS" aoCancelar={() => setIrOS(false)}
        aoConfirmar={() => { setIrOS(false); if (os) navegar(`/os/${os.id}`) }}
      />
    </article>
  )
}
