import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, PackageX, Wrench } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CabecalhoPagina, EstadoVazio, Indicador, Painel, SeloIA, SeloStatus, Select, cx, rotuloStatus } from '@/components/ui'
import { useStore } from '@/store'
import { usePapel } from '@/components/layout/nav'
import { porId, saidasPorProduto } from '@/store/selectors'
import { brl, dataCurta, numero } from '@/lib/format'
import type { StatusOS } from '@/types'
import { contaVencidos, diasMs, listarVendas, somaVendas, vendasPorMes, type Periodo } from './calculos'

const ETAPAS: [string, string][] = [['novo', 'Novo'], ['contato', 'Em contato'], ['demonstracao', 'Demonstração'], ['proposta', 'Proposta']]
const STATUS_FLUXO: StatusOS[] = ['recebido', 'diagnostico', 'aguardando_aprovacao', 'em_manutencao', 'testes', 'pronto']

function contar<T>(itens: T[], chave: (x: T) => string | undefined, peso: (x: T) => number = () => 1) {
  const m = new Map<string, number>()
  for (const x of itens) { const k = chave(x); if (k) m.set(k, (m.get(k) ?? 0) + peso(x)) }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function Ranking({ linhas, vazio }: { linhas: [string, number][]; vazio: string }) {
  if (linhas.length === 0) return <p className="py-4 text-center text-sm text-mata-suave">{vazio}</p>
  const max = linhas[0][1]
  return (
    <ul className="space-y-2.5">
      {linhas.map(([nome, n]) => (
        <li key={nome}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{nome}</span>
            <span className="num shrink-0 font-medium">{numero(n)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-mata/[0.06]"><div className="h-2 rounded-full bg-ceu" style={{ width: `${(n / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

export default function Inicio() {
  const navegar = useNavigate()
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const produtos = useStore((s) => s.produtos)
  const movs = useStore((s) => s.movimentacoes)
  const orcamentos = useStore((s) => s.orcamentos)
  const ordens = useStore((s) => s.ordens)
  const lancamentos = useStore((s) => s.lancamentos)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const leads = useStore((s) => s.leads)
  const conversas = useStore((s) => s.conversas)
  const papel = usePapel()
  const gestor = papel === 'Gestor', vendas = papel === 'Vendas', estoque = papel === 'Estoque'

  const d = useMemo(() => {
    const agora = Date.now()
    const corte = agora - diasMs(periodo)
    const vendas = listarVendas({ orcamentos, ordens })
    const fat = somaVendas(vendas, corte, agora + diasMs(1))
    const fatAnt = somaVendas(vendas, corte - diasMs(periodo), corte)
    const variacao = fatAnt > 0 ? ((fat - fatAnt) / fatAnt) * 100 : undefined

    const abertas = ordens.filter((o) => o.status !== 'entregue')
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const atrasadas = abertas.filter((o) => new Date(o.previsao).getTime() < hoje.getTime())
    const aguardando = orcamentos.filter((o) => o.status === 'enviado')
    const valorAguardando = aguardando.reduce((s, o) => s + o.itens.reduce((a, i) => a + i.quantidade * i.valorUnit, 0) - (o.desconto || 0) + (o.frete || 0), 0)
    const vencidos = contaVencidos(lancamentos, 'receber')

    const itens = produtos.filter((p) => p.tipo !== 'drone')
    const saidas = saidasPorProduto(movs, periodo)
    const saidas90 = saidasPorProduto(movs, 90)
    const top = Object.entries(saidas)
      .map(([id, q]) => ({ p: porId(produtos, id)!, q }))
      .filter((x) => x.p && x.p.tipo !== 'drone')
      .sort((a, b) => b.q - a.q).slice(0, 8)

    const paradas = itens.filter((p) => p.estoque > 0 && !saidas90[p.id])
      .map((p) => ({ p, valor: p.estoque * p.custo })).sort((a, b) => b.valor - a.valor)
    const valorParado = paradas.reduce((s, x) => s + x.valor, 0)

    const abaixo = itens.filter((p) => p.estoqueMinimo > 0 && p.estoque < p.estoqueMinimo).map((p) => {
      const giro = (saidas90[p.id] ?? 0) / 3
      const alvo = Math.max(p.estoqueMinimo, Math.ceil(giro * 2))
      const comprar = Math.max(1, alvo - p.estoque)
      const dura = giro > 0 ? Math.round(((p.estoque + comprar) / giro) * 30) : undefined
      return { p, comprar, dura, falta: p.estoqueMinimo - p.estoque }
    }).sort((a, b) => b.falta / b.p.estoqueMinimo - a.falta / a.p.estoqueMinimo)

    const osPeriodo = ordens.filter((o) => new Date(o.abertura).getTime() >= corte)
    const servicos = contar(osPeriodo.flatMap((o) => o.itens.filter((i) => i.tipo === 'servico')), (i) => i.descricao, (i) => i.quantidade).slice(0, 6)
    const modelosAt = contar(osPeriodo, (o) => porId(equipamentos, o.equipamentoId)?.modeloId)
      .map(([id, n]) => [`${porId(modelos, id)?.nome ?? id}`, n] as [string, number]).slice(0, 6)

    const porStatus = STATUS_FLUXO.map((s) => ({ s, n: abertas.filter((o) => o.status === s).length }))

    // leitura calculada
    const leitura: { area: 'estoque' | 'oficina' | 'financeiro' | 'vendas'; texto: string; acoes: { rotulo: string; to: string }[] }[] = []
    const acaba = itens.map((p) => {
      const giro = (saidas90[p.id] ?? 0) / 3
      return { p, giro, dias: giro > 0 ? (p.estoque / giro) * 30 : Infinity }
    }).filter((x) => x.dias < Infinity && x.p.estoque > 0 && x.giro >= 2).sort((a, b) => a.dias - b.dias)[0]
    if (acaba && acaba.dias <= 60) {
      const diasAcaba = Math.max(1, Math.round(acaba.dias))
      leitura.push({
        area: 'estoque',
        texto: `${acaba.p.nome} sai ${numero(Math.round(acaba.giro))} por mês e há ${numero(acaba.p.estoque)} em estoque: acaba em cerca de ${numero(diasAcaba)} ${diasAcaba === 1 ? 'dia' : 'dias'}.`,
        acoes: [{ rotulo: 'Ver peça', to: `/estoque/${acaba.p.id}` }, { rotulo: 'Perguntar mais', to: `/assistente?q=${encodeURIComponent(`Quanto devo comprar de ${acaba.p.nome}?`)}` }],
      })
    }
    if (paradas.length > 0) {
      leitura.push({
        area: 'estoque',
        texto: `${paradas.length} peças estão sem saída há mais de 90 dias e prendem ${brl(valorParado)} em estoque.`,
        acoes: [{ rotulo: 'Ver peça', to: `/estoque/${paradas[0].p.id}` }, { rotulo: 'Perguntar mais', to: `/assistente?q=${encodeURIComponent('Quais peças paradas posso colocar em promoção?')}` }],
      })
    }
    if (modelosAt[0] && servicos[0]) {
      leitura.push({
        area: 'oficina',
        texto: `O ${modelosAt[0][0]} é o drone mais atendido na oficina (${modelosAt[0][1]} OS) e o serviço mais feito é ${servicos[0][0].toLowerCase()}.`,
        acoes: [{ rotulo: 'Ver ordens', to: '/os' }, { rotulo: 'Perguntar mais', to: `/assistente?q=${encodeURIComponent(`Quais peças mais saem para o ${modelosAt[0][0]}?`)}` }],
      })
    }
    if (vencidos.qtd > 0) {
      leitura.push({
        area: 'financeiro',
        texto: `${vencidos.qtd} cobranças estão vencidas, somando ${brl(vencidos.valor)} a receber.`,
        acoes: [{ rotulo: 'Ver financeiro', to: '/financeiro' }, { rotulo: 'Perguntar mais', to: `/assistente?q=${encodeURIComponent('Quais clientes estão com pagamento atrasado?')}` }],
      })
    }
    if (aguardando.length > 0) {
      leitura.push({
        area: 'vendas',
        texto: `${aguardando.length} orçamentos aguardam resposta, ${brl(valorAguardando)} em jogo.`,
        acoes: [{ rotulo: 'Ver orçamentos', to: '/orcamentos' }],
      })
    }

    return { fat, variacao, abertas, atrasadas, aguardando, valorAguardando, vencidos, top, paradas, valorParado, abaixo, servicos, modelosAt, porStatus, meses: vendasPorMes(vendas), leitura: leitura.filter((l) => gestor || (vendas && l.area === 'vendas') || (estoque && l.area === 'estoque')).slice(0, 4),
      valorEstoque: itens.reduce((a, p) => a + p.estoque * p.custo, 0), qtdItens: itens.length,
      leadsAbertos: leads.filter((l) => l.etapa !== 'fechado' && l.etapa !== 'perdido'),
      porEtapa: ETAPAS.map(([id, nome]) => ({ nome, n: leads.filter((l) => l.etapa === id).length })) }
  }, [periodo, produtos, movs, orcamentos, ordens, lancamentos, equipamentos, modelos, leads, papel])
  const naoLidas = conversas.reduce((n, c) => n + c.naoLidas, 0)

  const tickBrl = (v: number) => (v >= 1000 ? `${numero(v / 1000)} mil` : numero(v))

  return (
    <>
      <CabecalhoPagina
        titulo="Início"
        descricao={gestor ? 'Resumo do dia: vendas, oficina e estoque.' : vendas ? 'Resumo do dia: orçamentos, funil e conversas.' : 'Resumo do dia: giro, mínimos e valor em estoque.'}
        acoes={
          <label className="flex items-center gap-2 text-sm text-mata-suave">
            Período
            <Select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value) as Periodo)} className="w-auto">
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={180}>Últimos 180 dias</option>
            </Select>
          </label>
        }
      />

      {vendas && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link to="/financeiro" className="block rounded-painel focus-visible:outline-2"><Indicador rotulo="Vendas fechadas no período" valor={brl(d.fat)} variacao={d.variacao} detalhe={d.variacao === undefined ? 'sem período anterior' : 'vs período anterior'} className="h-full hover:border-lavoura" /></Link>
        <Link to="/orcamentos" className="block rounded-painel"><Indicador rotulo="Orçamentos aguardando" valor={numero(d.aguardando.length)} detalhe={brl(d.valorAguardando)} className="h-full hover:border-lavoura" /></Link>
          <Link to="/funil" className="block rounded-painel"><Indicador rotulo="Leads em aberto" valor={numero(d.leadsAbertos.length)} detalhe={brl(d.leadsAbertos.reduce((a, l) => a + l.valorEstimado, 0))} className="h-full hover:border-lavoura" /></Link>
          <Link to="/conversas" className="block rounded-painel"><Indicador rotulo="Conversas não lidas" valor={numero(naoLidas)} cor={naoLidas ? 'ambar' : undefined} detalhe="no WhatsApp" className="h-full hover:border-lavoura" /></Link>
        </div>
      )}
      {estoque && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link to="/estoque" className="block rounded-painel"><Indicador rotulo="Valor em estoque" valor={brl(d.valorEstoque)} detalhe="a preço de custo" className="h-full hover:border-lavoura" /></Link>
          <Link to="/estoque" className="block rounded-painel"><Indicador rotulo="Abaixo do mínimo" valor={numero(d.abaixo.length)} cor={d.abaixo.length ? 'ambar' : undefined} detalhe="peças para repor" className="h-full hover:border-lavoura" /></Link>
          <Link to="/estoque" className="block rounded-painel"><Indicador rotulo="Peças paradas" valor={numero(d.paradas.length)} detalhe={brl(d.valorParado)} className="h-full hover:border-lavoura" /></Link>
          <Link to="/estoque" className="block rounded-painel"><Indicador rotulo="Itens cadastrados" valor={numero(d.qtdItens)} detalhe="peças e acessórios" className="h-full hover:border-lavoura" /></Link>
        </div>
      )}
      {gestor && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link to="/financeiro" className="block rounded-painel focus-visible:outline-2"><Indicador rotulo="Vendas fechadas no período" valor={brl(d.fat)} variacao={d.variacao} detalhe={d.variacao === undefined ? 'sem período anterior' : 'vs período anterior'} className="h-full hover:border-lavoura" /></Link>
        <Link to="/os" className="block rounded-painel"><Indicador rotulo="OS em aberto" valor={numero(d.abertas.length)} cor={d.atrasadas.length ? 'ambar' : undefined} detalhe={d.atrasadas.length ? `${d.atrasadas.length} atrasadas` : 'nenhuma atrasada'} className="h-full hover:border-lavoura" /></Link>
        <Link to="/orcamentos" className="block rounded-painel"><Indicador rotulo="Orçamentos aguardando" valor={numero(d.aguardando.length)} detalhe={brl(d.valorAguardando)} className="h-full hover:border-lavoura" /></Link>
        <Link to="/financeiro" className="block rounded-painel"><Indicador rotulo="A receber vencido" valor={brl(d.vencidos.valor)} cor={d.vencidos.qtd ? 'vermelho' : undefined} detalhe={`${d.vencidos.qtd} cobranças`} className="h-full hover:border-lavoura" /></Link>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="ia-borda rounded-painel p-4">
            <div className="mb-3 flex items-center gap-2"><SeloIA>Leitura da IA</SeloIA><span className="text-xs text-mata-suave">calculada com os dados de hoje</span></div>
            {d.leitura.length === 0 ? <p className="text-sm text-mata-suave">Sem alertas por enquanto.</p> : (
              <ul className="divide-y divide-linha">
                {d.leitura.map((l, i) => (
                  <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-sm">{l.texto}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4">
                      {l.acoes.map((a) => (
                        <Link key={a.rotulo} to={a.to} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-ceu hover:underline">{a.rotulo}<ArrowRight size={14} aria-hidden /></Link>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(gestor || estoque) && <Painel titulo="Peças que mais saem" acoes={<span className="text-xs text-mata-suave">saídas no período · estoque atual</span>}>
            {d.top.length === 0 ? <EstadoVazio titulo="Nenhuma saída no período" texto="Escolha um período maior para ver o giro." /> : (
              <ul className="space-y-1">
                {d.top.map(({ p, q }) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => navegar(`/estoque/${p.id}`)} className="block min-h-11 w-full rounded-campo px-1 py-1 text-left hover:bg-nevoa">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{p.nome}</span>
                        <span className="shrink-0 text-xs text-mata-suave">estoque <span className={cx('num font-medium', p.estoque < p.estoqueMinimo ? 'text-barro' : 'text-mata')}>{numero(p.estoque)}</span></span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2.5 flex-1 rounded-full bg-mata/[0.06]"><div className="h-2.5 rounded-full bg-lavoura" style={{ width: `${(q / d.top[0].q) * 100}%` }} /></div>
                        <span className="num w-10 text-right text-sm font-medium">{numero(q)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Painel>}

          {(gestor || vendas) && <Painel titulo="Vendas fechadas por mês" acoes={<span className="text-xs text-mata-suave">últimos 6 meses</span>}>
            <div className="h-64" role="img" aria-label="Vendas fechadas por mês, separado em drones, peças e serviços">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.meses} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#DDE5E0" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickFormatter={tickBrl} tickLine={false} axisLine={false} fontSize={12} width={48} />
                  <Tooltip formatter={(v) => brl(Number(v))} cursor={{ fill: 'rgba(16,35,28,0.05)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="drones" name="Drones" stackId="a" fill="#10231C" />
                  <Bar dataKey="pecas" name="Peças" stackId="a" fill="#1F8A4C" />
                  <Bar dataKey="servicos" name="Serviços" stackId="a" fill="#1E78C8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Painel>}
        </div>

        <div className="space-y-4">
          {vendas && (
            <>
              <Painel titulo="Funil de vendas" acoes={<Link to="/funil" className="text-sm font-medium text-ceu hover:underline">Abrir funil</Link>}>
                <Ranking linhas={d.porEtapa.map((e) => [e.nome, e.n] as [string, number]).filter((x) => x[1] > 0)} vazio="Nenhum lead em aberto." />
              </Painel>
              <Painel titulo="Orçamentos aguardando resposta" acoes={<Link to="/orcamentos" className="text-sm font-medium text-ceu hover:underline">Ver todos</Link>}>
                {d.aguardando.length === 0 ? <p className="text-sm text-mata-suave">Nenhum orçamento aguardando.</p> : (
                  <ul className="divide-y divide-linha">
                    {d.aguardando.slice(0, 6).map((o) => (
                      <li key={o.id}><Link to={`/orcamentos/${o.id}`} className="flex min-h-11 items-center justify-between gap-2 py-1.5 text-sm hover:text-ceu"><span className="truncate">Orçamento {o.numero}</span><span className="num shrink-0">{brl(o.itens.reduce((a, i) => a + i.quantidade * i.valorUnit, 0) - (o.desconto || 0) + (o.frete || 0))}</span></Link></li>
                    ))}
                  </ul>
                )}
              </Painel>
            </>
          )}
          {(gestor || estoque) && <section className={cx('rounded-painel border bg-papel', d.abaixo.length ? 'border-ambar' : 'border-linha')}>
            <header className="flex items-center gap-2 border-b border-linha px-4 py-3">
              <AlertTriangle size={16} className={d.abaixo.length ? 'text-ambar' : 'text-mata-suave'} aria-hidden />
              <h2 className="text-base">Abaixo do mínimo</h2>
              <span className="num ml-auto rounded-full bg-ambar-claro px-2 text-xs font-medium">{d.abaixo.length}</span>
            </header>
            {d.abaixo.length === 0 ? <p className="p-4 text-sm text-mata-suave">Todo o estoque está acima do mínimo.</p> : (
              <ul className="divide-y divide-linha">
                {d.abaixo.slice(0, 7).map(({ p, comprar, dura }) => (
                  <li key={p.id}>
                    <Link to={`/estoque/${p.id}`} className="block min-h-11 px-4 py-2.5 hover:bg-nevoa">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{p.nome}</span>
                        <span className="num shrink-0 text-barro">{numero(p.estoque)} / {numero(p.estoqueMinimo)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-mata-suave">Comprar {numero(comprar)}{dura ? `, dura ~${numero(dura)} dias` : ''}</p>
                    </Link>
                  </li>
                ))}
                {d.abaixo.length > 7 && <li className="px-4 py-2 text-xs text-mata-suave">e mais {d.abaixo.length - 7} peças</li>}
              </ul>
            )}
          </section>}

          {gestor && <Painel titulo="Oficina agora" acoes={<Link to="/os" className="text-sm font-medium text-ceu hover:underline">Ver todas</Link>}>
            <div className="grid grid-cols-3 gap-2">
              {d.porStatus.map(({ s, n }) => (
                <div key={s} className="rounded-campo bg-nevoa px-2 py-2 text-center">
                  <p className="num titulo text-lg">{n}</p>
                  <p className="text-[11px] leading-tight text-mata-suave">{rotuloStatus('os', s)}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-4 flex items-center gap-1.5 text-sm text-barro"><Wrench size={14} aria-hidden />Atrasadas ({d.atrasadas.length})</h3>
            {d.atrasadas.length === 0 ? <p className="mt-1 text-sm text-mata-suave">Nenhuma OS atrasada.</p> : (
              <ul className="mt-1 divide-y divide-linha">
                {d.atrasadas.map((o) => (
                  <li key={o.id}>
                    <Link to={`/os/${o.id}`} className="flex min-h-11 items-center justify-between gap-2 py-1.5 text-sm hover:text-ceu">
                      <span className="truncate">OS {o.numero} · {porId(modelos, porId(equipamentos, o.equipamentoId)?.modeloId)?.nome ?? ''}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-barro">previsto {dataCurta(o.previsao)}<SeloStatus tipo="os" status={o.status} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Painel>}
        </div>
      </div>

      {(gestor || estoque) && <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Painel titulo="Peças paradas" acoes={<span className="text-xs text-mata-suave">sem saída há 90+ dias</span>}>
          {d.paradas.length === 0 ? <EstadoVazio icone={<PackageX size={28} />} titulo="Nenhuma peça parada" /> : (
            <>
              <p className="mb-2 text-sm">Total parado: <strong className="num">{brl(d.valorParado)}</strong> em {d.paradas.length} peças</p>
              <ul className="divide-y divide-linha">
                {d.paradas.slice(0, 6).map(({ p, valor }) => (
                  <li key={p.id}>
                    <Link to={`/estoque/${p.id}`} className="flex min-h-11 items-center justify-between gap-3 py-1.5 text-sm hover:text-ceu">
                      <span className="truncate">{p.nome} <span className="text-xs text-mata-suave">({numero(p.estoque)} un.)</span></span>
                      <span className="num shrink-0">{brl(valor)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Painel>
        {gestor && <Painel titulo="Serviços mais feitos"><Ranking linhas={d.servicos} vazio="Nenhum serviço no período." /></Painel>}
        {gestor && <Painel titulo="Modelos mais atendidos"><Ranking linhas={d.modelosAt} vazio="Nenhuma OS no período." /></Painel>}
      </div>}
    </>
  )
}
