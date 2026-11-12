import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, FileText, ListChecks, Plus, Wrench } from 'lucide-react'
import { useStore } from '@/store'
import { Button, CabecalhoPagina, EstadoVazio, Gaveta, Painel, Select, SeloStatus, cx } from '@/components/ui'
import { dataCurta } from '@/lib/format'
import { atrasada } from '@/pages/os/status'
import type { Compromisso, Usuario } from '@/types'
import { CartaoCompromisso } from './CartaoCompromisso'
import { CompromissoGaveta, type CompromissoInicial } from './CompromissoGaveta'
import { CORES_TECNICO, chaveDia, diaLongo, faixaHora, horaDe, inicioSemana, nomeDia, pendente, somarDias } from './agendaUtil'

export default function Agenda() {
  const usuarios = useStore((s) => s.usuarios)
  const usuarioAtualId = useStore((s) => s.usuarioAtualId)
  const compromissosRaw = useStore((s) => s.compromissos)
  const salvar = useStore((s) => s.salvar)

  const compromissos = useMemo(() => compromissosRaw ?? [], [compromissosRaw])
  const atual = usuarios.find((u) => u.id === usuarioAtualId)
  const tecnicos = useMemo(() => usuarios.filter((u) => u.papel === 'Técnico'), [usuarios])
  const ehTecnico = atual?.papel === 'Técnico'

  const [filtro, setFiltro] = useState('todos')
  const [dia, setDia] = useState(() => chaveDia(new Date()))
  const [gaveta, setGaveta] = useState<{ aberta: boolean; inicial?: CompromissoInicial }>({ aberta: false })
  const [detalheId, setDetalheId] = useState<string | null>(null)

  const hoje = chaveDia(new Date())
  const idsVisiveis = useMemo(
    () => (ehTecnico && atual ? [atual.id] : filtro === 'todos' ? tecnicos.map((t) => t.id) : [filtro]),
    [ehTecnico, atual, filtro, tecnicos],
  )
  const visiveis = useMemo(() => compromissos.filter((c) => idsVisiveis.includes(c.tecnicoId)).sort((a, b) => a.inicio.localeCompare(b.inicio)), [compromissos, idsVisiveis])
  const corDe = (tecnicoId: string) => CORES_TECNICO[Math.max(0, tecnicos.findIndex((t) => t.id === tecnicoId)) % CORES_TECNICO.length]

  const dataDia = new Date(`${dia}T12:00:00`)
  const semana = useMemo(() => { const ini = inicioSemana(dataDia); return Array.from({ length: 7 }, (_, i) => somarDias(ini, i)) }, [dia]) // eslint-disable-line react-hooks/exhaustive-deps
  const doDia = (k: string) => visiveis.filter((c) => chaveDia(c.inicio) === k)
  const listaDia = doDia(dia)
  const proximo = listaDia.find((c) => c.status === 'em_andamento') ?? listaDia.find((c) => c.status === 'agendado')
  const demais = listaDia.filter((c) => c !== proximo)

  const modoSemana = !ehTecnico && filtro === 'todos'
  const detalhe = compromissos.find((c) => c.id === detalheId)
  const novo = () => setGaveta({ aberta: true, inicial: { inicio: undefined, tecnicoId: ehTecnico ? atual?.id : filtro !== 'todos' ? filtro : undefined } })
  const editar = (c: Compromisso) => { setDetalheId(null); setGaveta({ aberta: true, inicial: c }) }
  const tecnicosObrig = idsVisiveis.map((id) => usuarios.find((u) => u.id === id)).filter((u): u is Usuario => !!u)

  const listaDoDia = (
    <div className="space-y-4">
      <h2 className="text-base first-letter:uppercase">{diaLongo(dataDia)}{dia === hoje ? ' (hoje)' : ''}</h2>
      {listaDia.length === 0 ? (
        <Painel><EstadoVazio icone={<CalendarDays size={28} />} titulo="Nada agendado neste dia" acao={<Button onClick={novo}>Novo compromisso</Button>} /></Painel>
      ) : (
        <>
          {proximo && (
            <CartaoCompromisso c={proximo} destaque rotuloDestaque={dia === hoje ? 'Próximo compromisso' : 'Primeiro compromisso do dia'}
              mostrarTecnico={!ehTecnico} corTecnico={corDe(proximo.tecnicoId).ponto} aoEditar={() => editar(proximo)} />
          )}
          {demais.length > 0 && (
            <div className="space-y-3">
              {proximo && <h3 className="text-sm text-mata-suave">Depois e já concluídos</h3>}
              {demais.map((c) => <CartaoCompromisso key={c.id} c={c} mostrarTecnico={!ehTecnico} corTecnico={corDe(c.tecnicoId).ponto} aoEditar={() => editar(c)} />)}
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <>
      <CabecalhoPagina
        titulo={ehTecnico ? 'Minha agenda' : 'Agenda dos técnicos'}
        descricao="Atendimentos, entregas, treinamentos e o que cada técnico precisa entregar."
        acoes={<Button icone={<Plus size={18} />} onClick={novo}>Novo compromisso</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {!ehTecnico && (
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por técnico" className="w-auto!">
            <option value="todos">Todos os técnicos</option>
            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome.split(' ')[0]}</option>)}
          </Select>
        )}
        {modoSemana && (
          <ul className="flex items-center gap-3 text-sm" aria-label="Cores dos técnicos">
            {tecnicos.map((t) => <li key={t.id} className="flex items-center gap-1.5"><span className={cx('h-2.5 w-2.5 rounded-full', corDe(t.id).ponto)} aria-hidden />{t.nome.split(' ')[0]}</li>)}
          </ul>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Semana anterior" onClick={() => setDia(chaveDia(somarDias(dataDia, -7)))} className="flex h-10 w-10 items-center justify-center rounded-campo border border-linha bg-papel hover:bg-nevoa"><ChevronLeft size={18} /></button>
          <Button variante="secundario" onClick={() => setDia(hoje)}>Hoje</Button>
          <button type="button" aria-label="Próxima semana" onClick={() => setDia(chaveDia(somarDias(dataDia, 7)))} className="flex h-10 w-10 items-center justify-center rounded-campo border border-linha bg-papel hover:bg-nevoa"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div role="group" aria-label="Dias da semana" className="mb-4 grid grid-cols-7 gap-1">
        {semana.map((d) => {
          const k = chaveDia(d)
          const qtd = doDia(k).length
          const sel = k === dia
          return (
            <button key={k} type="button" aria-pressed={sel} onClick={() => setDia(k)}
              className={cx('flex min-h-14 flex-col items-center justify-center rounded-campo border text-xs transition-colors', sel ? 'border-forte bg-forte text-white' : k === hoje ? 'border-lavoura bg-lavoura-claro' : 'border-linha bg-papel hover:bg-nevoa')}>
              <span className="capitalize">{nomeDia(d)}</span>
              <span className="num text-base font-semibold">{d.getDate()}</span>
              <span className={cx('num text-[11px]', !sel && 'text-mata-suave')}>{qtd > 0 ? `${qtd} ${qtd === 1 ? 'item' : 'itens'}` : ' '}</span>
            </button>
          )
        })}
      </div>

      {modoSemana ? (
        <>
          <div className="mb-5 hidden gap-2 lg:grid lg:grid-cols-7">
            {semana.map((d) => {
              const k = chaveDia(d)
              return (
                <div key={k} className={cx('min-h-40 rounded-painel border p-2', k === hoje ? 'border-lavoura bg-lavoura-claro/40' : 'border-linha bg-papel')}>
                  <p className="mb-2 px-1 text-xs capitalize text-mata-suave">{nomeDia(d)} <span className="num font-semibold text-mata">{d.getDate()}</span></p>
                  <ul className="space-y-1.5">
                    {doDia(k).map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => setDetalheId(c.id)}
                          className={cx('block min-h-10 w-full rounded-campo border border-linha border-l-4 bg-papel p-2 text-left text-xs hover:bg-nevoa', corDe(c.tecnicoId).barra, c.status === 'concluido' && 'opacity-60', c.status === 'cancelado' && 'line-through opacity-50')}>
                          <span className="num font-semibold">{horaDe(c.inicio)}</span>
                          <span className="mt-0.5 block leading-snug">{c.titulo}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="lg:hidden">{listaDoDia}</div>
        </>
      ) : listaDoDia}

      <div className="mt-6 space-y-4">
        {tecnicosObrig.map((u) => <Obrigacoes key={u.id} tecnico={u} propria={ehTecnico} compromissos={compromissos} aoMarcar={(c, idx) => salvar('compromissos', { ...c, checklist: (c.checklist ?? []).map((i, k) => (k === idx ? { ...i, feito: true } : i)) })} />)}
      </div>

      <Gaveta aberta={!!detalhe} aoFechar={() => setDetalheId(null)} titulo="Compromisso" largura="lg">
        {detalhe && <CartaoCompromisso c={detalhe} mostrarTecnico corTecnico={corDe(detalhe.tecnicoId).ponto} aoEditar={() => editar(detalhe)} />}
      </Gaveta>
      <CompromissoGaveta aberta={gaveta.aberta} aoFechar={() => setGaveta({ aberta: false })} inicial={gaveta.inicial} tecnicoFixoId={ehTecnico ? atual?.id : undefined} />
    </>
  )
}

function Obrigacoes({ tecnico, propria, compromissos, aoMarcar }: {
  tecnico: Usuario; propria: boolean; compromissos: Compromisso[]; aoMarcar: (c: Compromisso, idx: number) => void
}) {
  const ordens = useStore((s) => s.ordens)
  const clientes = useStore((s) => s.clientes)

  const minhas = useMemo(() => ordens.filter((o) => o.tecnico === tecnico.nome), [ordens, tecnico.nome])
  const abertas = minhas.filter((o) => o.status !== 'entregue').sort((a, b) => a.previsao.localeCompare(b.previsao))
  const semRelatorio = minhas.filter((o) => (o.status === 'pronto' || o.status === 'entregue') && !o.relatorio)
  const agora = Date.now()
  const pendencias = compromissos
    .filter((c) => c.tecnicoId === tecnico.id && c.status !== 'cancelado' && new Date(c.fim).getTime() < agora)
    .flatMap((c) => (c.checklist ?? []).map((i, idx) => ({ c, i, idx })).filter((x) => !x.i.feito))
  const nomeCli = (id: string) => clientes.find((c) => c.id === id)?.nome ?? ''

  return (
    <Painel titulo={propria ? 'Minhas obrigações' : `Obrigações de ${tecnico.nome.split(' ')[0]}`}>
      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-label="OS abertas">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm"><Wrench size={15} aria-hidden />OS abertas <span className="num text-mata-suave">({abertas.length})</span></h3>
          {abertas.length === 0 ? <p className="text-sm text-mata-suave">Nenhuma OS aberta.</p> : (
            <ul className="space-y-1">
              {abertas.map((o) => (
                <li key={o.id}>
                  <Link to={`/os/${o.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 rounded-campo px-2 py-1 text-sm hover:bg-nevoa">
                    <span><span className="num font-medium">OS {o.numero}</span> · {nomeCli(o.clienteId)}</span>
                    <span className="flex items-center gap-2">
                      <SeloStatus tipo="os" status={o.status} />
                      <span className={cx('num text-xs', atrasada(o) ? 'font-semibold text-barro-texto' : 'text-mata-suave')}>{atrasada(o) ? 'Atrasada · ' : ''}{dataCurta(o.previsao)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Relatórios pendentes">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm"><FileText size={15} aria-hidden />Relatórios pendentes <span className="num text-mata-suave">({semRelatorio.length})</span></h3>
          {semRelatorio.length === 0 ? <p className="text-sm text-mata-suave">Nenhum relatório pendente.</p> : (
            <ul className="space-y-1">
              {semRelatorio.map((o) => (
                <li key={o.id} className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-2 text-sm">
                  <span><span className="num font-medium">OS {o.numero}</span> · {nomeCli(o.clienteId)}</span>
                  <Link to={`/relatorios/${o.id}`} className="inline-flex h-10 items-center rounded-campo border border-linha px-3 text-sm font-medium hover:bg-nevoa">Montar relatório</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Itens de checklist pendentes">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm"><ListChecks size={15} aria-hidden />Checklist não feito <span className="num text-mata-suave">({pendencias.length})</span></h3>
          {pendencias.length === 0 ? <p className="text-sm text-mata-suave">Nada pendente em compromissos passados.</p> : (
            <ul className="space-y-1">
              {pendencias.map(({ c, i, idx }) => (
                <li key={`${c.id}-${idx}`}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 px-2 py-1.5 text-sm">
                    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-lavoura" checked={false} onChange={() => aoMarcar(c, idx)} />
                    <span>{i.texto}<span className="block text-xs text-mata-suave">{c.titulo} · {dataCurta(c.inicio)} {faixaHora(c).slice(0, 5)}</span></span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Painel>
  )
}
