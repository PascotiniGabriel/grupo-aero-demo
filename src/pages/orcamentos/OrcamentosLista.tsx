import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import type { Orcamento, StatusOrcamento } from '@/types'
import { Button, CabecalhoPagina, CampoBusca, EstadoVazio, Indicador, Painel, Select, SeloIA, SeloStatus, Tabela, cx, type Coluna } from '@/components/ui'
import { useStore } from '@/store'
import { totalOrcamento } from '@/store/selectors'
import { brl, dataCurta, normalizar } from '@/lib/format'

const SITUACOES: { id: 'todos' | StatusOrcamento; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todas as situações' }, { id: 'rascunho', rotulo: 'Rascunho' }, { id: 'enviado', rotulo: 'Enviado' },
  { id: 'aprovado', rotulo: 'Aprovado' }, { id: 'recusado', rotulo: 'Recusado' }, { id: 'expirado', rotulo: 'Expirado' },
]

export default function OrcamentosLista() {
  const navegar = useNavigate()
  const orcamentos = useStore((s) => s.orcamentos)
  const clientes = useStore((s) => s.clientes)
  const [busca, setBusca] = useState('')
  const [situacao, setSituacao] = useState<'todos' | StatusOrcamento>('todos')

  const nomeCliente = (o: Orcamento) => clientes.find((c) => c.id === o.clienteId)?.nome ?? 'Cliente removido'

  const resumo = useMemo(() => {
    const doMes = (iso: string) => Date.now() - new Date(iso).getTime() <= 30 * 86400000
    const aberto = orcamentos.filter((o) => o.status === 'rascunho' || o.status === 'enviado')
    const aprovMes = orcamentos.filter((o) => o.status === 'aprovado' && doMes(o.data))
    const decididos = orcamentos.filter((o) => ['aprovado', 'recusado', 'expirado'].includes(o.status))
    const aprovados = decididos.filter((o) => o.status === 'aprovado').length
    return {
      aberto: aberto.reduce((s, o) => s + totalOrcamento(o), 0), nAberto: aberto.length,
      aprovMes: aprovMes.reduce((s, o) => s + totalOrcamento(o), 0), nAprovMes: aprovMes.length,
      taxa: decididos.length ? Math.round((aprovados / decididos.length) * 100) : 0, decididos: decididos.length,
    }
  }, [orcamentos])

  const lista = useMemo(() => {
    const q = normalizar(busca).trim()
    return orcamentos.filter((o) => {
      if (situacao !== 'todos' && o.status !== situacao) return false
      if (!q) return true
      return normalizar(`${o.numero} ${nomeCliente(o)} ${o.vendedor}`).includes(q)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentos, clientes, busca, situacao])

  const vencido = (o: Orcamento) => (o.status === 'rascunho' || o.status === 'enviado') && new Date(o.validade).getTime() < Date.now()

  const colunas: Coluna<Orcamento>[] = [
    { id: 'numero', titulo: 'Número', valor: (o) => o.numero, render: (o) => <span className="num font-medium">{o.numero}</span> },
    {
      id: 'cliente', titulo: 'Cliente', principal: true, valor: (o) => nomeCliente(o),
      render: (o) => <span className="inline-flex items-center gap-2">{nomeCliente(o)}{o.criadoPorIA && <SeloIA />}</span>,
    },
    { id: 'data', titulo: 'Data', valor: (o) => o.data, render: (o) => dataCurta(o.data) },
    { id: 'validade', titulo: 'Validade', valor: (o) => o.validade, render: (o) => <span className={cx(vencido(o) && 'text-barro')}>{dataCurta(o.validade)}</span> },
    { id: 'total', titulo: 'Total', alinhar: 'direita', valor: (o) => totalOrcamento(o), render: (o) => <span className="num font-medium">{brl(totalOrcamento(o))}</span> },
    { id: 'status', titulo: 'Situação', valor: (o) => o.status, render: (o) => <SeloStatus tipo="orcamento" status={o.status} /> },
  ]

  return (
    <>
      <CabecalhoPagina
        titulo="Orçamentos" descricao="Propostas de peças, serviços e drones."
        acoes={<Button icone={<Plus size={16} />} onClick={() => navegar('/orcamentos/novo')}>Novo orçamento</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicador rotulo="Em aberto" valor={brl(resumo.aberto)} detalhe={`${resumo.nAberto} ${resumo.nAberto === 1 ? 'orçamento' : 'orçamentos'} aguardando resposta`} />
        <Indicador rotulo="Aprovados nos últimos 30 dias" valor={brl(resumo.aprovMes)} cor="verde" detalhe={`${resumo.nAprovMes} ${resumo.nAprovMes === 1 ? 'aprovado' : 'aprovados'}`} />
        <Indicador rotulo="Taxa de aprovação" valor={`${resumo.taxa}%`} detalhe={`de ${resumo.decididos} orçamentos respondidos`} />
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por número, cliente ou vendedor" className="sm:max-w-sm sm:flex-1" />
        <Select aria-label="Filtrar por situação" value={situacao} onChange={(e) => setSituacao(e.target.value as 'todos' | StatusOrcamento)} className="sm:w-56">
          {SITUACOES.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
        </Select>
      </div>

      <Painel semPadding>
        <Tabela
          colunas={colunas} dados={lista} chave={(o) => o.id} aoClicar={(o) => navegar(`/orcamentos/${o.id}`)}
          ordemInicial={{ coluna: 'numero', direcao: 'desc' }}
          vazio={<EstadoVazio icone={<FileText size={32} />} titulo="Nenhum orçamento encontrado" texto="Mude o filtro ou crie um novo orçamento." acao={<Button onClick={() => navegar('/orcamentos/novo')}>Novo orçamento</Button>} />}
        />
      </Painel>
    </>
  )
}
