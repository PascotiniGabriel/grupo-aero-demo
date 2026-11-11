import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { Button, CabecalhoPagina, EstadoVazio, Painel, Tabela, type Coluna } from '@/components/ui'
import { dataCurta } from '@/lib/format'
import { nomeModelo, porId } from '@/store/selectors'
import type { OrdemServico } from '@/types'

export default function RelatoriosLista() {
  const ordens = useStore((s) => s.ordens)
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const navegar = useNavigate()

  const prontas = useMemo(() => ordens.filter((o) => !o.relatorio && ['testes', 'pronto', 'entregue'].includes(o.status)).sort((a, b) => b.numero - a.numero), [ordens])
  const feitas = useMemo(() => ordens.filter((o) => o.relatorio).sort((a, b) => (b.relatorio!.geradoEm).localeCompare(a.relatorio!.geradoEm)), [ordens])

  const drone = (o: OrdemServico) => { const e = porId(equipamentos, o.equipamentoId); return e ? `${nomeModelo(e.modeloId, modelos)} · ${e.serial}` : '-' }
  const colunas: Coluna<OrdemServico>[] = [
    { id: 'os', titulo: 'OS', principal: true, valor: (o) => o.numero, render: (o) => <span className="num font-medium">#{o.numero}</span> },
    { id: 'data', titulo: 'Data', valor: (o) => o.relatorio?.geradoEm ?? '', render: (o) => <span className="num">{dataCurta(o.relatorio?.geradoEm)}</span> },
    { id: 'cli', titulo: 'Cliente', valor: (o) => porId(clientes, o.clienteId)?.nome ?? '', render: (o) => porId(clientes, o.clienteId)?.nome ?? '-' },
    { id: 'drone', titulo: 'Drone', render: drone },
  ]

  return (
    <>
      <CabecalhoPagina titulo="Relatórios de manutenção" descricao="Fotos e anotações viram o relatório pronto para o cliente." />

      {prontas.length > 0 && (
        <Painel titulo="Prontas para ganhar relatório" className="mb-4">
          <ul className="divide-y divide-linha">
            {prontas.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium"><Link to={`/os/${o.id}`} className="hover:underline">OS {o.numero}</Link> · {porId(clientes, o.clienteId)?.nome}</p>
                  <p className="text-sm text-mata-suave">{drone(o)} · {o.fotos.length} {o.fotos.length === 1 ? 'foto' : 'fotos'}</p>
                </div>
                <Button variante="ia" icone={<Sparkles size={16} />} onClick={() => navegar(`/relatorios/${o.id}`)}>Montar relatório</Button>
              </li>
            ))}
          </ul>
        </Painel>
      )}

      <Painel titulo={`Relatórios feitos (${feitas.length})`} semPadding>
        {feitas.length === 0
          ? <EstadoVazio icone={<FileText size={32} />} titulo="Nenhum relatório ainda" texto="Abra uma OS e escolha Montar relatório." />
          : <Tabela colunas={colunas} dados={feitas} chave={(o) => o.id} aoClicar={(o) => navegar(`/relatorios/${o.id}`)} />}
      </Painel>
    </>
  )
}
