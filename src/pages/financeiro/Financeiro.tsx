import { useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Abas, Button, Campo, CampoBusca, CabecalhoPagina, EstadoVazio, Gaveta, Indicador, Input, Painel, Select, SeloStatus, Tabela, cx, statusLancamento, toast,
  type Coluna,
} from '@/components/ui'
import { useStore, novoId } from '@/store'
import { porId } from '@/store/selectors'
import { brl, dataCurta, normalizar, numero } from '@/lib/format'
import type { Lancamento } from '@/types'

type Aba = 'receber' | 'pagar' | 'resultado'
type Situacao = 'todos' | 'aberto' | 'vencido' | 'pago'
const DIA = 86400000
const CATEGORIAS = { receber: ['Vendas', 'Oficina', 'Treinamento', 'Outras receitas'], pagar: ['Fornecedores', 'Pessoal', 'Despesas fixas', 'Impostos', 'Outras despesas'] }
const FORMAS = ['PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro']

const t = (iso: string) => new Date(iso).getTime()
const inicioHoje = () => { const h = new Date(); h.setHours(0, 0, 0, 0); return h.getTime() }
const paraISO = (data: string) => new Date(`${data}T12:00:00`).toISOString()
const hojeInput = () => new Date().toISOString().slice(0, 10)

export default function Financeiro() {
  const lancamentos = useStore((s) => s.lancamentos)
  const clientes = useStore((s) => s.clientes)
  const salvar = useStore((s) => s.salvar)
  const [aba, setAba] = useState<Aba>('receber')
  const [situacao, setSituacao] = useState<Situacao>('todos')
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState(90)
  const [gaveta, setGaveta] = useState(false)

  const resumo = useMemo(() => {
    const hoje = inicioHoje(); const lim = hoje + 31 * DIA
    const abertos = lancamentos.filter((l) => !l.pagoEm)
    const soma = (tp: Lancamento['tipo'], f: (v: number) => boolean) => abertos.filter((l) => l.tipo === tp && f(t(l.vencimento))).reduce((s, l) => s + l.valor, 0)
    const aReceber = soma('receber', (v) => v >= hoje && v < lim)
    const aPagar = soma('pagar', (v) => v >= hoje && v < lim)
    return { aReceber, aPagar, saldo: aReceber - aPagar, vencReceber: soma('receber', (v) => v < hoje), vencPagar: soma('pagar', (v) => v < hoje) }
  }, [lancamentos])

  const fluxo = useMemo(() => {
    const hoje = new Date(); const out: { mes: string; entradas: number; saidas: number; projecao?: boolean }[] = []
    for (let k = 5; k >= 0; k--) {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - k, 1).getTime()
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() - k + 1, 1).getTime()
      const mes = new Date(ini).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      const doMes = lancamentos.filter((l) => l.pagoEm && t(l.pagoEm) >= ini && t(l.pagoEm) < fim)
      out.push({ mes, entradas: doMes.filter((l) => l.tipo === 'receber').reduce((s, l) => s + l.valor, 0), saidas: doMes.filter((l) => l.tipo === 'pagar').reduce((s, l) => s + l.valor, 0) })
    }
    out.push({ mes: 'Próx. 30 dias', entradas: resumo.aReceber, saidas: resumo.aPagar, projecao: true })
    return out
  }, [lancamentos, resumo])

  const lista = useMemo(() => {
    const q = normalizar(busca)
    return lancamentos.filter((l) => {
      if (l.tipo !== aba) return false
      const st = statusLancamento(l)
      if (situacao === 'aberto' && st === 'pago') return false
      if (situacao === 'vencido' && st !== 'vencido') return false
      if (situacao === 'pago' && st !== 'pago') return false
      if (!q) return true
      return normalizar(`${l.descricao} ${l.categoria} ${porId(clientes, l.clienteId)?.nome ?? ''}`).includes(q)
    })
  }, [lancamentos, clientes, aba, situacao, busca])

  const dre = useMemo(() => {
    const corte = Date.now() - periodo * DIA
    const pagos = lancamentos.filter((l) => l.pagoEm && t(l.pagoEm) >= corte)
    const agrupar = (tp: Lancamento['tipo']) => {
      const m = new Map<string, number>()
      for (const l of pagos) if (l.tipo === tp) m.set(l.categoria, (m.get(l.categoria) ?? 0) + l.valor)
      return [...m.entries()].sort((a, b) => b[1] - a[1])
    }
    const receitas = agrupar('receber'); const despesas = agrupar('pagar')
    const tr = receitas.reduce((s, x) => s + x[1], 0); const td = despesas.reduce((s, x) => s + x[1], 0)
    return { receitas, despesas, tr, td, resultado: tr - td }
  }, [lancamentos, periodo])

  const marcarPago = (l: Lancamento) => {
    salvar('lancamentos', { ...l, pagoEm: new Date().toISOString() })
    toast.sucesso(l.tipo === 'receber' ? 'Marcado como recebido' : 'Marcado como pago')
  }

  const colunas: Coluna<Lancamento>[] = [
    { id: 'desc', titulo: 'Descrição', principal: true, valor: (l) => l.descricao, render: (l) => <span>{l.descricao}<span className="block text-xs text-mata-suave">{l.categoria} · {l.forma}</span></span> },
    { id: 'venc', titulo: 'Vencimento', valor: (l) => l.vencimento, render: (l) => <span className="num">{dataCurta(l.vencimento)}</span> },
    { id: 'valor', titulo: 'Valor', alinhar: 'direita', valor: (l) => l.valor, render: (l) => <span className="num font-medium">{brl(l.valor)}</span> },
    { id: 'sit', titulo: 'Situação', valor: (l) => statusLancamento(l), render: (l) => <SeloStatus tipo="lancamento" status={statusLancamento(l)} /> },
    {
      id: 'acao', titulo: '', alinhar: 'direita', render: (l) => l.pagoEm
        ? <span className="text-xs text-mata-suave">{aba === 'receber' ? 'Recebido' : 'Pago'} em {dataCurta(l.pagoEm)}</span>
        : <Button tamanho="sm" variante="secundario" icone={<Check size={14} />} onClick={(e) => { e.stopPropagation(); marcarPago(l) }}>{aba === 'receber' ? 'Marcar como recebido' : 'Marcar como pago'}</Button>,
    },
  ]

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro" descricao="O que entra, o que sai e o que está atrasado."
        acoes={<Button icone={<Plus size={16} />} onClick={() => setGaveta(true)}>Novo lançamento</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="A receber (30 dias)" valor={brl(resumo.aReceber)} cor="verde" />
        <Indicador rotulo="A pagar (30 dias)" valor={brl(resumo.aPagar)} />
        <Indicador rotulo="Saldo previsto" valor={brl(resumo.saldo)} cor={resumo.saldo < 0 ? 'vermelho' : 'verde'} detalhe="receber menos pagar" />
        <Indicador rotulo="Vencidos" valor={brl(resumo.vencReceber + resumo.vencPagar)} cor={resumo.vencReceber + resumo.vencPagar ? 'vermelho' : undefined} detalhe={`receber ${brl(resumo.vencReceber)} · pagar ${brl(resumo.vencPagar)}`} />
      </div>

      <Painel titulo="Fluxo de caixa" acoes={<span className="text-xs text-mata-suave">últimos 6 meses e projeção</span>} className="mt-4">
        <div className="h-64" role="img" aria-label="Entradas e saídas por mês, com projeção dos próximos 30 dias">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fluxo} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#DDE5E0" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={(v: number) => (v >= 1000 ? `${numero(v / 1000)} mil` : numero(v))} tickLine={false} axisLine={false} fontSize={12} width={48} />
              <Tooltip formatter={(v) => brl(Number(v))} cursor={{ fill: 'rgba(16,35,28,0.05)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entradas" name="Entradas" fill="#1F8A4C" radius={[4, 4, 0, 0]}>
                {fluxo.map((f) => <Cell key={f.mes} fillOpacity={f.projecao ? 0.45 : 1} />)}
              </Bar>
              <Bar dataKey="saidas" name="Saídas" fill="#D99A00" radius={[4, 4, 0, 0]}>
                {fluxo.map((f) => <Cell key={f.mes} fillOpacity={f.projecao ? 0.45 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-mata-suave">A última coluna, mais clara, é a previsão do que vence nos próximos 30 dias.</p>
      </Painel>

      <div className="mt-4">
        <Abas
          abas={[{ id: 'receber', rotulo: 'A receber' }, { id: 'pagar', rotulo: 'A pagar' }, { id: 'resultado', rotulo: 'Resultado' }]}
          ativa={aba} aoMudar={(id) => { setAba(id as Aba); setSituacao('todos'); setBusca('') }}
        />
        {aba !== 'resultado' ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1"><CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por descrição, categoria ou cliente" /></div>
              <Select value={situacao} onChange={(e) => setSituacao(e.target.value as Situacao)} aria-label="Situação" className="sm:w-48">
                <option value="todos">Todas as situações</option>
                <option value="aberto">Em aberto</option>
                <option value="vencido">Vencidos</option>
                <option value="pago">Pagos</option>
              </Select>
            </div>
            <Painel semPadding>
              <Tabela
                colunas={colunas} dados={lista} chave={(l) => l.id} ordemInicial={{ coluna: 'venc', direcao: 'desc' }}
                vazio={<EstadoVazio titulo="Nenhum lançamento encontrado" texto="Mude o filtro ou crie um novo lançamento." />}
              />
            </Painel>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-mata-suave">
              Período
              <Select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))} className="w-auto">
                <option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option>
                <option value={180}>Últimos 180 dias</option><option value={365}>Último ano</option>
              </Select>
            </label>
            <Painel titulo="Resultado simplificado" semPadding>
              <table className="w-full text-sm">
                <tbody>
                  <Grupo titulo="Receitas" linhas={dre.receitas} total={dre.tr} cor="text-lavoura-escuro" />
                  <Grupo titulo="Despesas" linhas={dre.despesas} total={dre.td} cor="text-mata" />
                  <tr className="border-t-2 border-linha bg-nevoa">
                    <td className="px-4 py-3 font-semibold">Resultado do período</td>
                    <td className="px-4 py-3 text-right text-xs text-mata-suave">{dre.tr > 0 ? `${numero((dre.resultado / dre.tr) * 100, 1)}% da receita` : ''}</td>
                    <td className={cx('num titulo px-4 py-3 text-right text-base', dre.resultado < 0 ? 'text-barro' : 'text-lavoura-escuro')}>{brl(dre.resultado)}</td>
                  </tr>
                </tbody>
              </table>
            </Painel>
            <p className="text-xs text-mata-suave">Considera só o que já foi recebido ou pago no período.</p>
          </div>
        )}
      </div>

      {gaveta && <NovoLancamento tipoInicial={aba === 'pagar' ? 'pagar' : 'receber'} aoFechar={() => setGaveta(false)} />}
    </>
  )
}

function Grupo({ titulo, linhas, total, cor }: { titulo: string; linhas: [string, number][]; total: number; cor: string }) {
  return (
    <>
      <tr className="bg-nevoa"><th colSpan={3} className="px-4 py-2 text-left text-sm font-semibold">{titulo}</th></tr>
      {linhas.length === 0 && <tr><td colSpan={3} className="px-4 py-3 text-mata-suave">Nada no período.</td></tr>}
      {linhas.map(([cat, v]) => (
        <tr key={cat} className="border-t border-linha">
          <td className="px-4 py-2.5">{cat}</td>
          <td className="num px-4 py-2.5 text-right text-xs text-mata-suave">{total > 0 ? `${numero((v / total) * 100, 1)}%` : ''}</td>
          <td className="num px-4 py-2.5 text-right">{brl(v)}</td>
        </tr>
      ))}
      <tr className="border-t border-linha">
        <td className="px-4 py-2.5 font-medium">Total de {titulo.toLowerCase()}</td><td />
        <td className={cx('num px-4 py-2.5 text-right font-semibold', cor)}>{brl(total)}</td>
      </tr>
    </>
  )
}

function NovoLancamento({ tipoInicial, aoFechar }: { tipoInicial: 'receber' | 'pagar'; aoFechar: () => void }) {
  const clientes = useStore((s) => s.clientes)
  const salvar = useStore((s) => s.salvar)
  const [tipo, setTipo] = useState(tipoInicial)
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS[tipoInicial][0])
  const [valor, setValor] = useState('')
  const [venc, setVenc] = useState(hojeInput())
  const [forma, setForma] = useState('PIX')
  const [clienteId, setClienteId] = useState('')
  const [jaPago, setJaPago] = useState(false)
  const [tentou, setTentou] = useState(false)

  const v = Number(valor.replace(',', '.'))
  const erroDesc = !descricao.trim(); const erroValor = !(v > 0)

  const confirmar = () => {
    setTentou(true)
    if (erroDesc || erroValor || !venc) return
    salvar('lancamentos', {
      id: novoId('lan'), tipo, descricao: descricao.trim(), categoria, valor: Math.round(v * 100) / 100, vencimento: paraISO(venc), forma,
      clienteId: tipo === 'receber' && clienteId ? clienteId : undefined, pagoEm: jaPago ? new Date().toISOString() : undefined,
    })
    toast.sucesso('Lançamento criado')
    aoFechar()
  }

  return (
    <Gaveta
      aberta aoFechar={aoFechar} titulo="Novo lançamento" largura="md"
      rodape={<><Button variante="fantasma" onClick={aoFechar}>Cancelar</Button><Button onClick={confirmar}>Salvar lançamento</Button></>}
    >
      <div className="space-y-4">
        <Campo rotulo="Tipo">
          <Select value={tipo} onChange={(e) => { const n = e.target.value as 'receber' | 'pagar'; setTipo(n); setCategoria(CATEGORIAS[n][0]) }}>
            <option value="receber">A receber</option><option value="pagar">A pagar</option>
          </Select>
        </Campo>
        <Campo rotulo="Descrição" obrigatorio erro={tentou && erroDesc ? 'Escreva uma descrição' : undefined}>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} invalido={tentou && erroDesc} placeholder={tipo === 'receber' ? 'Ex.: Peças pedido 2110, Fazenda Santa Luzia' : 'Ex.: Compra de peças, fornecedor'} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Valor (R$)" obrigatorio erro={tentou && erroValor ? 'Informe o valor' : undefined}>
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} invalido={tentou && erroValor} placeholder="0,00" />
          </Campo>
          <Campo rotulo="Vencimento" obrigatorio><Input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Categoria"><Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>{CATEGORIAS[tipo].map((c) => <option key={c}>{c}</option>)}</Select></Campo>
          <Campo rotulo="Forma"><Select value={forma} onChange={(e) => setForma(e.target.value)}>{FORMAS.map((c) => <option key={c}>{c}</option>)}</Select></Campo>
        </div>
        {tipo === 'receber' && (
          <Campo rotulo="Cliente">
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Sem cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
        )}
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} className="size-4 accent-lavoura" />
          {tipo === 'receber' ? 'Já foi recebido' : 'Já foi pago'}
        </label>
      </div>
    </Gaveta>
  )
}
