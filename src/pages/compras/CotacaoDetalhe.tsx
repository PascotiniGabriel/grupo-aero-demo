import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCopy, FileText, Plus, Printer, Save, Send, Sparkles, Trash2 } from 'lucide-react'
import type { Cotacao, Fornecedor, ItemCotacao, RespostaCotacao } from '@/types'
import { Button, Campo, CabecalhoPagina, CampoBusca, IconButton, Input, Modal, Painel, Select, Selo, Textarea, cx, toast } from '@/components/ui'
import { brl, normalizar } from '@/lib/format'
import { lerPropostaFornecedor, type PropostaLida } from '@/lib/ai/compras'
import { useStore } from '@/store'
import { COR_STATUS, ROTULO_STATUS, lerNumero, novoId, totalDe } from './calculo'
import { Comparativo } from './Comparativo'
import { PedidoDoc, textoPedido } from './PedidoCotacao'
import { SelectEmpresa, SeloEmpresa, empresaPadraoParaNovo, useEmpresaDoRegistro, useFiltroEmpresa } from '@/lib/empresas'

const fone = (f: string) => {
  const d = f.replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
}
const num = (n: number) => (n > 0 ? String(n).replace('.', ',') : '')

function RespostaForm({ c, f, atual, aoSalvar }: { c: Cotacao; f: Fornecedor; atual?: RespostaCotacao; aoSalvar: (r: RespostaCotacao) => void }) {
  const [precos, setPrecos] = useState(() => c.itens.map((_, i) => num(atual?.precos[i] ?? 0)))
  const [frete, setFrete] = useState(num(atual?.frete ?? 0))
  const [outras, setOutras] = useState(num(atual?.outrasDespesas ?? 0))
  const [prazo, setPrazo] = useState(String(atual?.prazoDias ?? f.prazoMedioDias))
  const [obs, setObs] = useState(atual?.observacao ?? '')
  const [pesos, setPesos] = useState(() => c.itens.map((_, i) => num(atual?.pesos?.[i] ?? 0)))
  const [lendo, setLendo] = useState(false)
  const [leitura, setLeitura] = useState<PropostaLida | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)

  async function ler(arquivo: File | { exemplo: true }) {
    setLendo(true)
    try {
      const r = await lerPropostaFornecedor(arquivo, c, f)
      const novosPrecos = c.itens.map(() => ''); const novosPesos = c.itens.map(() => '')
      for (const it of r.itens) { novosPrecos[it.indiceItem] = num(it.precoUnit); novosPesos[it.indiceItem] = num(it.pesoKg ?? 0) }
      setPrecos(novosPrecos); setPesos(novosPesos); setFrete(num(r.frete)); setOutras(num(r.outrasDespesas)); setPrazo(String(r.prazoDias))
      setObs(r.itens.map((x) => x.observacao).filter(Boolean).join('; '))
      setLeitura(r)
      toast.sucesso('Proposta lida. Confira os valores antes de salvar.')
    } catch (e) { toast.erro(e instanceof Error ? e.message : 'Não consegui ler o documento.') }
    finally { setLendo(false); if (arquivoRef.current) arquivoRef.current.value = '' }
  }
  const temPeso = pesos.some((p) => lerNumero(p) > 0)
  const parcial = { fornecedorId: f.id, precos: precos.map(lerNumero), ...(temPeso ? { pesos: pesos.map(lerNumero) } : {}), frete: lerNumero(frete), outrasDespesas: lerNumero(outras), prazoDias: Number(prazo) || 0, observacao: obs.trim() || undefined, recebidaEm: atual?.recebidaEm ?? new Date().toISOString() }

  return (
    <Painel titulo={f.nome} acoes={atual ? <Selo cor="verde">Respondeu</Selo> : <Selo>Aguardando</Selo>}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-campo bg-nevoa p-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-mata-suave">Recebeu a proposta em PDF ou foto? A IA lê os itens, preços e pesos e preenche abaixo.</p>
          <input ref={arquivoRef} type="file" accept="application/pdf,image/*" className="sr-only" aria-label="Arquivo da proposta do fornecedor"
            onChange={(e) => { const a = e.target.files?.[0]; if (a) void ler(a) }} />
          <Button className="ia-gradiente border-0" icone={<Sparkles size={16} />} loading={lendo} onClick={() => arquivoRef.current?.click()}>Ler PDF do fornecedor</Button>
          <Button variante="secundario" disabled={lendo} onClick={() => void ler({ exemplo: true })}>Usar PDF de exemplo</Button>
        </div>
        {leitura && (
          <div className="rounded-campo border border-linha p-3" role="status">
            <p className="flex items-center gap-2 text-sm font-medium"><Sparkles size={14} className="text-ceu-texto" aria-hidden />A IA leu isto, confira antes de salvar{leitura.origem === 'simulada' && <span className="text-xs font-normal text-mata-suave">(leitura simulada)</span>}</p>
            {leitura.naoEncontrados.length > 0 && (
              <p className="mt-1 text-sm text-ambar-texto">Não encontrei no documento: {leitura.naoEncontrados.join(', ')}. Preencha à mão ou deixe em branco.</p>
            )}
          </div>
        )}
        <div className="grid grid-cols-[1fr_5.5rem_5rem] items-center gap-x-2 gap-y-2 text-xs text-mata-suave sm:grid-cols-[1fr_7rem_6rem]"><span>Item</span><span className="text-right">Preço unit.</span><span className="text-right">Peso (kg)</span></div>
        <ul className="flex flex-col gap-2">
          {c.itens.map((it, i) => {
            const lido = leitura?.itens.find((x) => x.indiceItem === i)
            const faltou = leitura && !lido
            return (
              <li key={i} className="grid grid-cols-[1fr_5.5rem_5rem] items-center gap-2 sm:grid-cols-[1fr_7rem_6rem]">
                <span className="min-w-0 text-sm">{it.descricao} <span className="num text-xs text-mata-suave">× {it.quantidade}</span>
                  {lido && lido.descricaoLida && lido.descricaoLida !== it.descricao && <span className="block truncate text-xs text-mata-suave">Lido: {lido.descricaoLida}</span>}
                  {faltou && <span className="block text-xs text-ambar-texto">Não encontrado no documento</span>}
                </span>
                <Input inputMode="decimal" placeholder="Preço" aria-label={`Preço unitário de ${it.descricao}`} className="num text-right" value={precos[i]} onChange={(e) => setPrecos(precos.map((p, j) => (j === i ? e.target.value : p)))} />
                <Input inputMode="decimal" placeholder="Peso" aria-label={`Peso unitário em kg de ${it.descricao}`} className="num text-right" value={pesos[i]} onChange={(e) => setPesos(pesos.map((p, j) => (j === i ? e.target.value : p)))} />
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-mata-suave">Deixe em branco o item que o fornecedor não tem. O peso é opcional.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Campo rotulo="Frete (R$)"><Input inputMode="decimal" className="num" value={frete} onChange={(e) => setFrete(e.target.value)} /></Campo>
          <Campo rotulo="Outras despesas (R$)"><Input inputMode="decimal" className="num" value={outras} onChange={(e) => setOutras(e.target.value)} /></Campo>
          <Campo rotulo="Prazo (dias)" className="col-span-2 sm:col-span-1"><Input inputMode="numeric" className="num" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></Campo>
        </div>
        <Campo rotulo="Observação"><Input value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
        <div className="flex items-center justify-between gap-2">
          <p className="num text-sm">Total: <strong>{brl(totalDe(c, parcial))}</strong></p>
          <Button icone={<Save size={16} />} onClick={() => aoSalvar(parcial)}>Salvar resposta</Button>
        </div>
      </div>
    </Painel>
  )
}

export default function CotacaoDetalhe() {
  const { id } = useParams()
  return <CotacaoForm key={id} />
}

function CotacaoForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const cotacoes = useStore((s) => s.cotacoes)
  const fornecedores = useStore((s) => s.fornecedores)
  const produtos = useStore((s) => s.produtos)
  const ordens = useStore((s) => s.ordens)
  const salvar = useStore((s) => s.salvar)

  const existente = cotacoes.find((x) => x.id === id)
  const [c, setC] = useState<Cotacao>(() => existente ?? {
    id: novoId('cot'), numero: Math.max(0, ...cotacoes.map((x) => x.numero)) + 1, titulo: '', criadaEm: new Date().toISOString(),
    status: 'rascunho', itens: [], fornecedorIds: [], respostas: [], empresaId: empresaPadraoParaNovo(),
  })
  const empresa = useEmpresaDoRegistro(c.empresaId)
  const { multiplas } = useFiltroEmpresa()
  const [q, setQ] = useState('')
  const [livre, setLivre] = useState('')
  const [previa, setPrevia] = useState<string | null | undefined>(undefined) // undefined = fechado; null = geral; string = fornecedor
  const [respForn, setRespForn] = useState('')

  const os = ordens.find((o) => o.id === c.osId)
  const osAbertas = ordens.filter((o) => o.status !== 'entregue' || o.id === c.osId)
  const sugeridos = useMemo(() => {
    const cats = new Set(c.itens.map((it) => produtos.find((p) => p.id === it.produtoId)?.categoria as string | undefined).filter(Boolean))
    return new Set(fornecedores.filter((f) => f.categorias.some((x) => cats.has(x))).map((f) => f.id))
  }, [c.itens, produtos, fornecedores])
  const achados = useMemo(() => {
    const n = normalizar(q)
    if (!n) return []
    return produtos.filter((p) => p.tipo !== 'drone' && normalizar(`${p.nome} ${p.sku} ${p.codigoFabricante}`).includes(n)).slice(0, 6)
  }, [q, produtos])

  const gravar = (prox: Cotacao, aviso?: string) => {
    setC(prox)
    salvar('cotacoes', prox)
    if (aviso) toast.sucesso(aviso)
    if (!existente) nav(`/compras/${prox.id}`, { replace: true })
  }
  const edit = (p: Partial<Cotacao>) => setC((x) => ({ ...x, ...p }))
  const bloqueada = c.status === 'fechada'

  const addItem = (it: ItemCotacao) => {
    if (it.produtoId && c.itens.some((x) => x.produtoId === it.produtoId)) { toast.erro('Esse produto já está na lista'); return }
    edit({ itens: [...c.itens, it] })
  }
  const setQtd = (i: number, v: number) => edit({ itens: c.itens.map((it, j) => (j === i ? { ...it, quantidade: Math.max(1, v || 1) } : it)) })
  const tirar = (i: number) => edit({ itens: c.itens.filter((_, j) => j !== i), respostas: c.respostas.map((r) => ({ ...r, precos: r.precos.filter((_, j) => j !== i), ...(r.pesos ? { pesos: r.pesos.filter((_, j) => j !== i) } : {}) })) })
  const importarOS = () => {
    if (!os) return
    const novos = os.itens.filter((it) => it.tipo === 'peca' && !c.itens.some((x) => x.produtoId && x.produtoId === it.produtoId))
      .map((it) => ({ produtoId: it.produtoId, descricao: it.descricao, quantidade: it.quantidade }))
    if (!novos.length) { toast.erro('A OS não tem peças novas para importar'); return }
    edit({ itens: [...c.itens, ...novos], titulo: c.titulo || `Peças para a OS ${os.numero}` })
    toast.sucesso(`${novos.length} peças importadas da OS ${os.numero}`)
  }
  const alternarFornecedor = (fid: string) =>
    edit({ fornecedorIds: c.fornecedorIds.includes(fid) ? c.fornecedorIds.filter((x) => x !== fid) : [...c.fornecedorIds, fid] })

  const validoParaEnviar = () => {
    if (c.itens.length === 0) { toast.erro('Adicione ao menos um item'); return false }
    if (c.fornecedorIds.length === 0) { toast.erro('Escolha ao menos um fornecedor'); return false }
    return true
  }
  const nomeDe = (fid: string) => fornecedores.find((f) => f.id === fid)
  const marcarEnviada = () => { if (c.status === 'rascunho') gravar({ ...c, status: 'enviada' }, 'Cotação marcada como enviada') }
  const copiar = async (f?: Fornecedor) => {
    try { await navigator.clipboard.writeText(textoPedido(c, empresa, f?.contato, os?.numero)); toast.sucesso('Texto copiado'); marcarEnviada() } catch { toast.erro('Não consegui copiar') }
  }
  const whats = (f: Fornecedor) => {
    window.open(`https://wa.me/${fone(f.fone)}?text=${encodeURIComponent(textoPedido(c, empresa, f.contato, os?.numero))}`, '_blank', 'noopener')
    marcarEnviada()
  }
  const salvarResposta = (r: RespostaCotacao) => {
    if (!r.precos.some((p) => p > 0)) { toast.erro('Informe o preço de ao menos um item'); return }
    const respostas = [...c.respostas.filter((x) => x.fornecedorId !== r.fornecedorId), r]
    gravar({ ...c, respostas, status: c.status === 'fechada' ? 'fechada' : 'respondida' }, 'Resposta salva')
  }
  const escolher = (fid: string) => gravar({ ...c, escolhidaId: fid, status: 'fechada' }, `Fechada com ${nomeDe(fid)?.nome ?? 'o fornecedor'}`)

  const sec = (n: number, t: string) => <span><span className="num mr-2 inline-flex size-6 items-center justify-center rounded-full bg-mata/[0.07] text-xs">{n}</span>{t}</span>
  const fornSel = c.fornecedorIds.map(nomeDe).filter((f): f is Fornecedor => !!f)
  const docFornecedor = typeof previa === 'string' ? nomeDe(previa)?.nome : undefined

  return (
    <>
      <div className="nao-imprimir flex flex-col gap-4 pb-24">
        <Link to="/compras" className="inline-flex min-h-10 items-center gap-1 text-sm text-ceu-texto"><ArrowLeft size={16} />Compras</Link>
        <CabecalhoPagina
          titulo={<>Cotação {c.numero} <Selo cor={COR_STATUS[c.status]} className="align-middle">{ROTULO_STATUS[c.status]}</Selo> <SeloEmpresa empresaId={c.empresaId} className="align-middle" /></>}
          descricao={os ? `Para a OS ${os.numero}` : 'Lista de peças para pedir preço aos fornecedores'}
          acoes={<Button icone={<Save size={16} />} onClick={() => { if (!c.titulo.trim()) { toast.erro('Dê um título à cotação'); return } gravar(c, 'Cotação salva') }}>Salvar</Button>}
        />

        <Painel titulo={sec(1, 'Itens')}>
          <div className="flex flex-col gap-3">
            {multiplas && !existente && <Campo rotulo="Empresa que compra"><SelectEmpresa valor={c.empresaId ?? empresaPadraoParaNovo()} aoMudar={(v) => edit({ empresaId: v })} /></Campo>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Título" obrigatorio><Input value={c.titulo} disabled={bloqueada} placeholder="Ex.: Hélices e bicos do T40" onChange={(e) => edit({ titulo: e.target.value })} /></Campo>
              <Campo rotulo="Ordem de serviço (opcional)">
                <Select value={c.osId ?? ''} disabled={bloqueada} onChange={(e) => edit({ osId: e.target.value || undefined })}>
                  <option value="">Sem vínculo</option>
                  {osAbertas.map((o) => <option key={o.id} value={o.id}>OS {o.numero}</option>)}
                </Select>
              </Campo>
            </div>
            {os && !bloqueada && <div><Button variante="secundario" icone={<FileText size={16} />} onClick={importarOS}>Importar peças da OS {os.numero}</Button></div>}

            {!bloqueada && (
              <div className="flex flex-col gap-2">
                <CampoBusca valor={q} aoMudar={setQ} placeholder="Buscar produto do estoque" />
                {achados.length > 0 && (
                  <ul className="rounded-campo border border-linha bg-papel">
                    {achados.map((p) => (
                      <li key={p.id} className="border-b border-linha last:border-b-0">
                        <button type="button" className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-nevoa" onClick={() => { addItem({ produtoId: p.id, descricao: p.nome, quantidade: Math.max(1, p.estoqueMinimo - p.estoque) }); setQ('') }}>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nome}</span>
                          <span className={cx('num shrink-0 text-xs', p.estoque < p.estoqueMinimo ? 'text-barro-texto' : 'text-mata-suave')}>{p.estoque} em estoque</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Input aria-label="Item fora do estoque" placeholder="Ou digite um item fora do estoque" value={livre} onChange={(e) => setLivre(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && livre.trim()) { addItem({ descricao: livre.trim(), quantidade: 1 }); setLivre('') } }} />
                  <Button variante="secundario" icone={<Plus size={16} />} disabled={!livre.trim()} onClick={() => { addItem({ descricao: livre.trim(), quantidade: 1 }); setLivre('') }}>Adicionar</Button>
                </div>
              </div>
            )}

            {c.itens.length === 0 ? <p className="text-sm text-mata-suave">Nenhum item ainda. Busque no estoque ou digite acima.</p> : (
              <ul className="rounded-campo border border-linha">
                {c.itens.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 border-b border-linha px-3 py-2 last:border-b-0">
                    <span className="min-w-0 flex-1 text-sm">{it.descricao}</span>
                    <div className="w-20 shrink-0"><Input type="number" min={1} aria-label={`Quantidade de ${it.descricao}`} className="num text-right" disabled={bloqueada} value={it.quantidade} onChange={(e) => setQtd(i, Number(e.target.value))} /></div>
                    {!bloqueada && <IconButton aria-label={`Remover ${it.descricao}`} icone={<Trash2 size={16} />} onClick={() => tirar(i)} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Painel>

        <Painel titulo={sec(2, 'Fornecedores')}>
          <p className="mb-2 text-sm text-mata-suave">Escolha quem vai receber o pedido. Os sugeridos atendem a categoria dos itens.</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fornecedores.map((f) => {
              const on = c.fornecedorIds.includes(f.id)
              return (
                <li key={f.id}>
                  <label className={cx('flex min-h-12 cursor-pointer items-center gap-3 rounded-campo border px-3 py-2', on ? 'border-lavoura bg-lavoura-claro' : 'border-linha bg-papel')}>
                    <input type="checkbox" className="size-5 accent-lavoura" checked={on} disabled={bloqueada} onChange={() => alternarFornecedor(f.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.nome}</span>
                      <span className="block truncate text-xs text-mata-suave">{f.cidade} · {f.categorias.join(', ')}</span>
                    </span>
                    {sugeridos.has(f.id) && <Selo cor="azul">Sugerido</Selo>}
                  </label>
                </li>
              )
            })}
          </ul>
          {fornecedores.length === 0 && <p className="text-sm text-mata-suave">Cadastre fornecedores na aba Fornecedores de Compras.</p>}
        </Painel>

        <Painel titulo={sec(3, 'Pedido de cotação')}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button icone={<FileText size={16} />} onClick={() => { if (validoParaEnviar()) setPrevia(null) }}>Gerar pedido de cotação</Button>
              <Button variante="secundario" icone={<ClipboardCopy size={16} />} onClick={() => { if (validoParaEnviar()) copiar() }}>Copiar texto</Button>
            </div>
            {fornSel.length > 0 && c.itens.length > 0 && (
              <ul className="rounded-campo border border-linha">
                {fornSel.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-2 border-b border-linha px-3 py-2 last:border-b-0">
                    <span className="min-w-0 flex-1 basis-40 text-sm"><span className="block truncate font-medium">{f.nome}</span><span className="text-xs text-mata-suave">{f.fone}</span></span>
                    <Button tamanho="sm" variante="secundario" icone={<Send size={14} />} onClick={() => whats(f)}>Enviar por WhatsApp</Button>
                    <Button tamanho="sm" variante="fantasma" icone={<ClipboardCopy size={14} />} onClick={() => copiar(f)}>Copiar texto</Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-mata-suave">Enviar ou copiar marca a cotação como enviada. O documento não mostra preços.</p>
          </div>
        </Painel>

        <Painel titulo={sec(4, 'Respostas dos fornecedores')}>
          {fornSel.length === 0 ? <p className="text-sm text-mata-suave">Escolha fornecedores no passo 2.</p> : c.itens.length === 0 ? <p className="text-sm text-mata-suave">Adicione itens no passo 1.</p> : (
            <div className="flex flex-col gap-3">
              <Campo rotulo="Lançar resposta de">
                <Select value={respForn} onChange={(e) => setRespForn(e.target.value)}>
                  <option value="">Escolha o fornecedor</option>
                  {fornSel.map((f) => <option key={f.id} value={f.id}>{f.nome}{c.respostas.some((r) => r.fornecedorId === f.id) ? ' (já respondeu)' : ''}</option>)}
                </Select>
              </Campo>
              {respForn && nomeDe(respForn) && (
                <RespostaForm key={`${respForn}-${c.itens.length}-${c.respostas.find((r) => r.fornecedorId === respForn)?.recebidaEm ?? ''}`} c={c} f={nomeDe(respForn)!} atual={c.respostas.find((r) => r.fornecedorId === respForn)} aoSalvar={salvarResposta} />
              )}
            </div>
          )}
        </Painel>

        <Painel titulo={sec(5, 'Comparativo')}>
          <Comparativo c={c} fornecedores={fornecedores} aoEscolher={escolher} />
          {c.status === 'fechada' && c.escolhidaId && (
            <p className="mt-3 rounded-campo bg-lavoura-claro p-3 text-sm text-lavoura-texto">
              Fechada com {nomeDe(c.escolhidaId)?.nome}. Quando as peças chegarem, dê entrada no <Link to="/estoque" className="font-medium underline">estoque</Link>.
            </p>
          )}
        </Painel>
      </div>

      <Modal
        aberto={previa !== undefined} aoFechar={() => setPrevia(undefined)} titulo="Pedido de cotação" largura="xl"
        rodape={<>
          <Button variante="secundario" onClick={() => setPrevia(undefined)}>Fechar</Button>
          <Button variante="secundario" icone={<ClipboardCopy size={16} />} onClick={() => copiar()}>Copiar texto</Button>
          <Button icone={<Printer size={16} />} onClick={() => { marcarEnviada(); window.print() }}>Imprimir / salvar PDF</Button>
        </>}
      >
        <div className="overflow-x-auto rounded-campo border border-linha"><PedidoDoc c={c} empresa={empresa} osNumero={os?.numero} fornecedorNome={docFornecedor} /></div>
      </Modal>
      {previa !== undefined && <div className="folha-impressao hidden"><PedidoDoc c={c} empresa={empresa} osNumero={os?.numero} fornecedorNome={docFornecedor} /></div>}
    </>
  )
}
