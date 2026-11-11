import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, BookOpen, FilePlus2, Pencil, Printer, ScanLine, Trash2, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, CabecalhoPagina, ChipsModelos, Confirmar, EstadoVazio, Input, Painel, Selo, toast } from '@/components/ui'
import { EtiquetaQR } from '@/components/qr/EtiquetaQR'
import { useLeitorQR } from '@/components/qr/LeitorQR'
import { useStore } from '@/store'
import { brl, dataHora, numero, peso } from '@/lib/format'
import { GRUPOS, ehExclusiva, pesoCubadoKg, situacaoEstoque } from './comum'
import { FormularioPeca } from './FormularioPeca'
import { MovimentoModal } from './MovimentoModal'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-mata-suave">{rotulo}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children || '—'}</dd>
    </div>
  )
}

export default function ProdutoDetalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const produtos = useStore((s) => s.produtos)
  const modelos = useStore((s) => s.modelos)
  const movs = useStore((s) => s.movimentacoes)
  const ordens = useStore((s) => s.ordens)
  const orcamentos = useStore((s) => s.orcamentos)
  const clientes = useStore((s) => s.clientes)
  const salvar = useStore((s) => s.salvar)
  const remover = useStore((s) => s.remover)
  const leitor = useLeitorQR()

  const [editando, setEditando] = useState(false)
  const [mov, setMov] = useState<'entrada' | 'saida' | null>(null)
  const [excluir, setExcluir] = useState(false)
  const [novoSerial, setNovoSerial] = useState('')

  const p = produtos.find((x) => x.id === id)

  const historico = useMemo(() => movs.filter((m) => m.produtoId === id).sort((a, b) => b.data.localeCompare(a.data)), [movs, id])

  const porMes = useMemo(() => {
    const hoje = new Date()
    const lista = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1)
      return { chave: `${d.getFullYear()}-${d.getMonth()}`, mes: MESES[d.getMonth()], saidas: 0 }
    })
    for (const m of historico) {
      if (m.tipo !== 'saida') continue
      const d = new Date(m.data)
      const item = lista.find((x) => x.chave === `${d.getFullYear()}-${d.getMonth()}`)
      if (item) item.saidas += m.quantidade
    }
    return lista
  }, [historico])

  const usos = useMemo(() => {
    if (!id) return []
    const nomeCli = (cid: string) => clientes.find((c) => c.id === cid)?.nome ?? 'Cliente'
    return [
      ...ordens.filter((o) => o.itens.some((i) => i.produtoId === id)).map((o) => ({
        chave: o.id, rotulo: `OS ${o.numero}`, cliente: nomeCli(o.clienteId), qtd: o.itens.filter((i) => i.produtoId === id).reduce((s, i) => s + i.quantidade, 0), link: `/os/${o.id}`,
      })),
      ...orcamentos.filter((o) => o.itens.some((i) => i.produtoId === id)).map((o) => ({
        chave: o.id, rotulo: `Orçamento ${o.numero}`, cliente: nomeCli(o.clienteId), qtd: o.itens.filter((i) => i.produtoId === id).reduce((s, i) => s + i.quantidade, 0), link: `/orcamentos/${o.id}`,
      })),
    ]
  }, [id, ordens, orcamentos, clientes])

  if (!p) {
    return (
      <>
        <CabecalhoPagina titulo="Peça não encontrada" />
        <Painel><EstadoVazio titulo="Esta peça não existe mais" acao={<Button onClick={() => navegar('/estoque')}>Voltar ao estoque</Button>} /></Painel>
      </>
    )
  }

  const situ = situacaoEstoque(p)
  const margem = p.preco > 0 ? ((p.preco - p.custo) / p.preco) * 100 : 0
  const modeloCatalogo = p.modelosCompativeis[0]
  const nomes = (ids: string[]) => ids.map((m) => modelos.find((x) => x.id === m)?.nome ?? m).join(', ')

  function adicionarSerial(codigo: string) {
    const c = codigo.trim()
    if (!c || !p) return
    if (p.seriais.includes(c)) { toast.erro('Esse serial já está cadastrado nesta peça'); return }
    salvar('produtos', { ...p, seriais: [...p.seriais, c] })
    toast.sucesso('Serial adicionado')
    setNovoSerial('')
  }
  function removerSerial(s: string) {
    if (!p) return
    salvar('produtos', { ...p, seriais: p.seriais.filter((x) => x !== s) })
  }

  return (
    <>
      <div className="nao-imprimir">
        <p className="mb-2 text-sm"><Link to="/estoque" className="text-ceu hover:underline">Peças e produtos</Link> <span className="text-mata-suave">/ {p.sku}</span></p>
        <CabecalhoPagina
          titulo={p.nome}
          descricao={`${p.categoria}${p.grupo ? ` · ${GRUPOS[p.grupo]}` : ''}`}
          acoes={
            <>
              <Button variante="secundario" icone={<ArrowDownToLine size={16} />} onClick={() => setMov('entrada')}>Dar entrada</Button>
              <Button variante="secundario" icone={<ArrowUpFromLine size={16} />} disabled={p.estoque === 0} onClick={() => setMov('saida')}>Dar saída</Button>
              <Button variante="secundario" icone={<Pencil size={16} />} onClick={() => setEditando(true)}>Editar</Button>
            </>
          }
        />

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variante="secundario" icone={<FilePlus2 size={16} />} onClick={() => navegar(`/orcamentos/novo?add=${p.id}`)}>Adicionar a um orçamento</Button>
          {p.grupo && modeloCatalogo && (
            <Button variante="secundario" icone={<BookOpen size={16} />} onClick={() => navegar(`/catalogo/${modeloCatalogo}?grupo=${p.grupo}`)}>Ver no catálogo</Button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 lg:col-span-2">
            <Painel titulo="Dados da peça">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <Dado rotulo="SKU"><span className="serial">{p.sku}</span></Dado>
                <Dado rotulo="Código do fabricante"><span className="serial">{p.codigoFabricante}</span></Dado>
                <Dado rotulo="NCM">{p.ncm}</Dado>
                <Dado rotulo="Custo"><span className="num">{brl(p.custo)}</span></Dado>
                <Dado rotulo="Preço de venda"><span className="num">{brl(p.preco)}</span></Dado>
                <Dado rotulo="Margem"><span className="num">{margem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span></Dado>
                <Dado rotulo="Localização">{p.localizacao}</Dado>
                <Dado rotulo="Fornecedor">{p.fornecedor}</Dado>
                <Dado rotulo="Controla serial">{p.controlaSerial ? 'Sim' : 'Não'}</Dado>
              </dl>
              {p.observacao && <p className="mt-4 rounded-campo bg-nevoa p-3 text-sm">{p.observacao}</p>}
            </Painel>

            <Painel titulo="Serve em quais modelos">
              <div className="flex flex-wrap items-center gap-3">
                <ChipsModelos ids={p.modelosCompativeis} />
                {p.modelosCompativeis.length === 0 && <Selo cor="verde">Universal</Selo>}
                {ehExclusiva(p) && <Selo cor="ambar">Exclusiva do {nomes(p.modelosCompativeis)}</Selo>}
                {p.modelosCompativeis.length > 1 && <Selo cor="verde">Compartilhada entre {p.modelosCompativeis.length} modelos</Selo>}
              </div>
            </Painel>

            <Painel titulo="Peso e dimensões" >
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                <Dado rotulo="Peso"><span className="num">{peso(p.pesoG)}</span></Dado>
                <Dado rotulo="Comprimento × largura × altura"><span className="num">{p.dimensoesCm.c} × {p.dimensoesCm.l} × {p.dimensoesCm.a} cm</span></Dado>
                <Dado rotulo="Peso cubado (transportadora)"><span className="num">{pesoCubadoKg(p).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</span></Dado>
                <Dado rotulo="Peso a cobrar"><span className="num">{Math.max(p.pesoG / 1000, pesoCubadoKg(p)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</span></Dado>
              </dl>
              <p className="mt-3 text-xs text-mata-suave">Peso cubado = comprimento × largura × altura ÷ 6.000. A transportadora cobra o maior entre o peso real e o cubado.</p>
            </Painel>

            <Painel titulo="Saídas nos últimos 6 meses">
              <div className="h-52" role="img" aria-label="Gráfico de saídas por mês">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porMes} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#DDE5E0" vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={{ stroke: '#DDE5E0' }} tick={{ fontSize: 12, fill: '#4B5F57' }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#4B5F57' }} />
                    <Tooltip cursor={{ fill: 'rgba(16,35,28,0.05)' }} formatter={(v) => [`${v} un.`, 'Saídas']} />
                    <Bar dataKey="saidas" fill="#1F8A4C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel titulo="Histórico de movimentações" semPadding>
              {historico.length === 0 ? (
                <p className="p-4 text-sm text-mata-suave">Ainda não há movimentações desta peça.</p>
              ) : (
                <ul className="divide-y divide-linha">
                  {historico.slice(0, 15).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">{m.origem}</p>
                        <p className="text-xs text-mata-suave">{dataHora(m.data)}</p>
                      </div>
                      <Selo cor={m.tipo === 'entrada' ? 'verde' : 'neutro'}>{m.tipo === 'entrada' ? '+' : '−'}{numero(m.quantidade)} un.</Selo>
                    </li>
                  ))}
                </ul>
              )}
            </Painel>
          </div>

          <div className="grid content-start gap-4">
            <Painel titulo="Estoque">
              <p className={`titulo num text-4xl ${situ === 'zerado' ? 'text-barro' : situ === 'abaixo' ? 'text-[#7A5600]' : ''}`}>{numero(p.estoque)}</p>
              <p className="mt-1 text-sm text-mata-suave">Mínimo: <span className="num">{numero(p.estoqueMinimo)}</span> un.</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-mata/[0.08]" aria-hidden>
                <div className={`h-full ${situ === 'ok' ? 'bg-lavoura' : situ === 'abaixo' ? 'bg-ambar' : 'bg-barro'}`} style={{ width: `${Math.min(100, (p.estoque / Math.max(1, p.estoqueMinimo * 2)) * 100)}%` }} />
              </div>
              <div className="mt-3">
                {situ === 'zerado' && <Selo cor="vermelho">Zerado, repor</Selo>}
                {situ === 'abaixo' && <Selo cor="ambar">Abaixo do mínimo</Selo>}
                {situ === 'ok' && <Selo cor="verde">Estoque em dia</Selo>}
              </div>
              <p className="num mt-3 text-sm text-mata-suave">Valor parado: {brl(p.custo * p.estoque)} (custo)</p>
            </Painel>

            <Painel titulo="Etiqueta QR">
              <div className="flex flex-col items-center gap-3">
                <EtiquetaQR texto={p.sku} legenda={p.nome} sublegenda={p.sku} />
                <Button variante="secundario" icone={<Printer size={16} />} onClick={() => window.print()}>Imprimir etiqueta</Button>
              </div>
            </Painel>

            {(p.controlaSerial || p.seriais.length > 0) && (
              <Painel titulo={`Seriais (${p.seriais.length})`}>
                {p.seriais.length === 0 ? <p className="text-sm text-mata-suave">Nenhum serial cadastrado.</p> : (
                  <ul className="mb-3 grid gap-1.5">
                    {p.seriais.map((s) => (
                      <li key={s} className="flex items-center justify-between gap-2 rounded-campo bg-nevoa px-3 py-1.5">
                        <span className="serial truncate text-sm">{s}</span>
                        <button type="button" aria-label={`Remover serial ${s}`} onClick={() => removerSerial(s)} className="grid size-10 shrink-0 place-items-center text-mata-suave hover:text-barro"><X size={16} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Input value={novoSerial} onChange={(e) => setNovoSerial(e.target.value)} placeholder="Digitar serial" aria-label="Novo serial" className="serial min-w-0 flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') adicionarSerial(novoSerial) }} />
                  <Button variante="secundario" onClick={() => adicionarSerial(novoSerial)} disabled={!novoSerial.trim()}>Adicionar</Button>
                </div>
                <Button className="mt-2" bloco variante="secundario" icone={<ScanLine size={16} />} onClick={() => leitor.abrir({ titulo: 'Ler serial', aoLer: adicionarSerial })}>Adicionar lendo o QR</Button>
              </Painel>
            )}

            <Painel titulo="Onde foi usada">
              {usos.length === 0 ? <p className="text-sm text-mata-suave">Esta peça ainda não aparece em ordens de serviço nem orçamentos.</p> : (
                <ul className="grid gap-1">
                  {usos.map((u) => (
                    <li key={u.chave}>
                      <Link to={u.link} className="flex min-h-10 items-center justify-between gap-2 rounded-campo px-2 hover:bg-nevoa">
                        <span className="min-w-0"><span className="font-medium text-ceu">{u.rotulo}</span><span className="block truncate text-xs text-mata-suave">{u.cliente}</span></span>
                        <span className="num shrink-0 text-sm text-mata-suave">{u.qtd} un.</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Painel>

            <Button variante="fantasma" icone={<Trash2 size={16} />} onClick={() => setExcluir(true)} className="text-barro">Excluir peça</Button>
          </div>
        </div>
      </div>

      {/* Só aparece na impressão: a etiqueta sozinha na folha */}
      <div className="folha-impressao hidden">
        <EtiquetaQR texto={p.sku} legenda={p.nome} sublegenda={p.sku} tamanho={220} />
      </div>

      <FormularioPeca aberta={editando} aoFechar={() => setEditando(false)} produto={p} />
      <MovimentoModal produto={mov ? p : null} tipo={mov ?? 'entrada'} aoFechar={() => setMov(null)} />
      <Confirmar
        aberto={excluir} perigo titulo="Excluir esta peça?" texto="O cadastro e o histórico de movimentações ficam sem a peça. Isso não pode ser desfeito."
        rotuloConfirmar="Excluir peça" aoCancelar={() => setExcluir(false)}
        aoConfirmar={() => { remover('produtos', p.id); toast.sucesso('Peça excluída'); navegar('/estoque') }}
      />
    </>
  )
}
