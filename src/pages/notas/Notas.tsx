import { useMemo, useState } from 'react'
import { Download, FileCode2, FilePlus2, Printer } from 'lucide-react'
import {
  Abas, Button, CabecalhoPagina, CampoBusca, EstadoVazio, Gaveta, Painel, Select, SeloStatus, Tabela, toast, type Coluna,
} from '@/components/ui'
import { useStore } from '@/store'
import { porId } from '@/store/selectors'
import { brl, dataCurta, normalizar, numero } from '@/lib/format'
import type { NotaFiscal } from '@/types'
import EmitirNota from './EmitirNota'
import ImportarXML from './ImportarXML'
import { formatarChave } from './xml'

export default function Notas() {
  const notas = useStore((s) => s.notas)
  const clientes = useStore((s) => s.clientes)
  const [aba, setAba] = useState<'saida' | 'entrada'>('saida')
  const [situacao, setSituacao] = useState('todas')
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const [emitir, setEmitir] = useState(false)
  const [importar, setImportar] = useState(false)

  const nomeParte = (n: NotaFiscal) => (n.tipo === 'saida' ? porId(clientes, n.clienteId)?.nome : n.emitente) ?? '-'
  const lista = useMemo(() => {
    const q = normalizar(busca)
    return notas.filter((n) => n.tipo === aba && (situacao === 'todas' || n.status === situacao)
      && (!q || normalizar(`${n.numero} ${n.natureza} ${(n.tipo === 'saida' ? porId(clientes, n.clienteId)?.nome : n.emitente) ?? ''}`).includes(q)))
  }, [notas, clientes, aba, situacao, busca])
  const nota = notas.find((n) => n.id === aberta)

  const colunas: Coluna<NotaFiscal>[] = [
    { id: 'num', titulo: 'Nota', principal: true, valor: (n) => n.numero, render: (n) => <span><span className="num font-medium">{n.modelo} {n.numero}</span><span className="block text-xs text-mata-suave">{n.natureza}</span></span> },
    { id: 'parte', titulo: aba === 'saida' ? 'Cliente' : 'Fornecedor', valor: nomeParte, render: nomeParte },
    { id: 'data', titulo: 'Data', valor: (n) => n.data, render: (n) => <span className="num">{dataCurta(n.data)}</span> },
    { id: 'valor', titulo: 'Valor', alinhar: 'direita', valor: (n) => n.valor, render: (n) => <span className="num font-medium">{brl(n.valor)}</span> },
    { id: 'sit', titulo: 'Situação', valor: (n) => n.status, render: (n) => <SeloStatus tipo="nota" status={n.status} /> },
  ]
  const disponivel = () => toast.info('Disponível na versão final')

  return (
    <>
      <CabecalhoPagina
        titulo="Notas fiscais" descricao="Notas emitidas para clientes e notas de compra dos fornecedores."
        acoes={<>
          <Button variante="secundario" icone={<FileCode2 size={16} />} onClick={() => setImportar(true)}>Importar XML de compra</Button>
          <Button icone={<FilePlus2 size={16} />} onClick={() => setEmitir(true)}>Emitir nota</Button>
        </>}
      />
      <Abas
        abas={[{ id: 'saida', rotulo: 'Saída', contagem: notas.filter((n) => n.tipo === 'saida').length }, { id: 'entrada', rotulo: 'Entrada', contagem: notas.filter((n) => n.tipo === 'entrada').length }]}
        ativa={aba} aoMudar={(id) => { setAba(id as 'saida' | 'entrada'); setSituacao('todas'); setBusca('') }}
      />
      <div className="mt-3 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1"><CampoBusca valor={busca} aoMudar={setBusca} placeholder={aba === 'saida' ? 'Buscar por número, cliente ou natureza' : 'Buscar por número, fornecedor ou natureza'} /></div>
          <Select value={situacao} onChange={(e) => setSituacao(e.target.value)} aria-label="Situação" className="sm:w-48">
            <option value="todas">Todas as situações</option><option value="autorizada">Autorizadas</option><option value="pendente">Pendentes</option>
            <option value="rejeitada">Rejeitadas</option><option value="cancelada">Canceladas</option>
          </Select>
        </div>
        <Painel semPadding>
          <Tabela
            colunas={colunas} dados={lista} chave={(n) => n.id} aoClicar={(n) => setAberta(n.id)} ordemInicial={{ coluna: 'data', direcao: 'desc' }}
            vazio={<EstadoVazio titulo="Nenhuma nota encontrada" texto={aba === 'entrada' ? 'Use "Importar XML de compra" para dar entrada em uma nota de fornecedor.' : 'Use "Emitir nota" para criar uma a partir de um orçamento ou de uma OS.'} />}
          />
        </Painel>
      </div>

      <Gaveta
        aberta={!!nota} aoFechar={() => setAberta(null)} titulo={nota ? `${nota.modelo} ${nota.numero}` : ''} largura="lg"
        rodape={<><Button variante="secundario" icone={<Download size={16} />} onClick={disponivel}>Baixar XML</Button><Button variante="secundario" icone={<Printer size={16} />} onClick={disponivel}>Baixar DANFE</Button></>}
      >
        {nota && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2"><SeloStatus tipo="nota" status={nota.status} /><span className="text-sm text-mata-suave">emitida em {dataCurta(nota.data)} · série {nota.serie}</span></div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-mata-suave">{nota.tipo === 'saida' ? 'Cliente' : 'Fornecedor'}</dt><dd>{nomeParte(nota)}</dd></div>
              <div><dt className="text-xs text-mata-suave">Natureza da operação</dt><dd>{nota.natureza}</dd></div>
              <div><dt className="text-xs text-mata-suave">Valor total</dt><dd className="num font-semibold">{brl(nota.valor)}</dd></div>
              {nota.origem && <div><dt className="text-xs text-mata-suave">Origem</dt><dd>{nota.origem}</dd></div>}
            </dl>
            <div>
              <h3 className="mb-1 text-sm">Itens</h3>
              <ul className="divide-y divide-linha rounded-painel border border-linha">
                {nota.itens.map((i, k) => (
                  <li key={k} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0"><span className="block">{i.descricao}</span><span className="text-xs text-mata-suave">NCM {i.ncm} · {numero(i.quantidade)} x {brl(i.valorUnit)}</span></span>
                    <span className="num shrink-0 font-medium">{brl(i.quantidade * i.valorUnit)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1 text-sm">Chave de acesso</h3>
              <p className="serial break-all rounded-campo bg-nevoa p-2 text-xs">{formatarChave(nota.chave)}</p>
            </div>
          </div>
        )}
      </Gaveta>

      {emitir && <EmitirNota aoFechar={() => setEmitir(false)} />}
      {importar && <ImportarXML aoFechar={() => setImportar(false)} />}
    </>
  )
}
