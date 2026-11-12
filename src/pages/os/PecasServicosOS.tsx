import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, QrCode, Trash2 } from 'lucide-react'
import { novoId, useStore } from '@/store'
import { Button, CampoBusca, Confirmar, EstadoVazio, IconButton, Painel, Select, Selo, cx, toast } from '@/components/ui'
import { useLeitorQR, localizarCodigo } from '@/components/qr/LeitorQR'
import { buscarProdutos } from '@/lib/ai'
import { brl } from '@/lib/format'
import { diasAFrente } from '@/data/seed'
import { totalItens } from '@/store/selectors'
import { checklistDoServico, mesclarChecklist } from '@/lib/checklist'
import type { ItemComercial, OrdemServico, Produto, Servico } from '@/types'

export function PecasServicosOS({ os, modeloId }: { os: OrdemServico; modeloId: string | undefined }) {
  const produtos = useStore((s) => s.produtos)
  const servicos = useStore((s) => s.servicos)
  const usuarios = useStore((s) => s.usuarios)
  const usuarioId = useStore((s) => s.usuarioAtualId)
  const equipamentos = useStore((s) => s.equipamentos)
  const salvar = useStore((s) => s.salvar)
  const proximoNumero = useStore((s) => s.proximoNumero)
  const navegar = useNavigate()
  const { abrir } = useLeitorQR()
  const [busca, setBusca] = useState('')
  const [todas, setTodas] = useState(false)
  const compromissos = useStore((s) => s.compromissos)
  const [perguntaChecklist, setPerguntaChecklist] = useState<Servico | null>(null)

  const base = useMemo(
    () => produtos.filter((p) => p.tipo !== 'drone' && (todas || !modeloId || p.modelosCompativeis.length === 0 || p.modelosCompativeis.includes(modeloId))),
    [produtos, modeloId, todas],
  )
  const resultados = useMemo(() => (busca.trim() ? buscarProdutos(busca, base, 6) : []), [busca, base])

  const compromissoLigado = (compromissos ?? []).filter((c) => c.osId === os.id && (c.status === 'agendado' || c.status === 'em_andamento')).sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
  const gravar = (itens: ItemComercial[]) => salvar('ordens', { ...os, itens })
  function adicionarPeca(p: Produto) {
    const existente = os.itens.find((i) => i.produtoId === p.id)
    if (existente) gravar(os.itens.map((i) => (i.id === existente.id ? { ...i, quantidade: i.quantidade + 1 } : i)))
    else gravar([...os.itens, { id: novoId('it'), tipo: 'peca', produtoId: p.id, descricao: p.nome, quantidade: 1, valorUnit: p.preco }])
    setBusca('')
    toast.sucesso(`${p.nome} adicionada`)
  }
  function adicionarServico(id: string) {
    const s = servicos.find((x) => x.id === id)
    if (!s) return
    gravar([...os.itens, { id: novoId('it'), tipo: 'servico', servicoId: s.id, descricao: s.nome, quantidade: 1, valorUnit: s.preco }])
    if (compromissoLigado && checklistDoServico(s).length > 0) setPerguntaChecklist(s)
  }
  function levarParaChecklist() {
    const s = perguntaChecklist
    setPerguntaChecklist(null)
    if (!s || !compromissoLigado) return
    const novos = checklistDoServico(s).map((texto) => ({ texto, feito: false, origem: s.nome }))
    salvar('compromissos', { ...compromissoLigado, checklist: mesclarChecklist(compromissoLigado.checklist, novos) })
    toast.sucesso('Obrigações do serviço adicionadas ao checklist')
  }
  const alterar = (id: string, parcial: Partial<ItemComercial>) => gravar(os.itens.map((i) => (i.id === id ? { ...i, ...parcial } : i)))

  function lerQR() {
    abrir({
      titulo: 'Ler QR da peça',
      aoLer: (codigo) => {
        const r = localizarCodigo(codigo, produtos, equipamentos)
        if (r.tipo === 'produto') adicionarPeca(r.produto)
        else toast.erro('Esse código não é de uma peça cadastrada.')
      },
    })
  }

  function gerarOrcamento() {
    const numero = proximoNumero('orcamento')
    const id = `orc-${numero}`
    salvar('orcamentos', {
      id, numero, clienteId: os.clienteId, data: new Date().toISOString(), validade: diasAFrente(15), status: 'rascunho',
      itens: os.itens.map((i) => ({ ...i, id: novoId('it') })), desconto: 0, frete: 0,
      formaPagamento: 'A combinar', prazoEntrega: 'Conforme a previsão da OS', observacoes: `Referente à OS ${os.numero}.`,
      vendedor: usuarios.find((u) => u.id === usuarioId)?.nome ?? '', osId: os.id,
    })
    salvar('ordens', { ...os, orcamentoId: id, historico: [...os.historico, { data: new Date().toISOString(), texto: `Orçamento ${numero} gerado a partir da OS` }] })
    toast.sucesso(`Orçamento ${numero} criado`)
    navegar(`/orcamentos/${id}`)
  }

  const subPecas = totalItens(os.itens.filter((i) => i.tipo === 'peca'))
  const subServ = totalItens(os.itens.filter((i) => i.tipo !== 'peca'))

  return (
    <div className="space-y-4">
      <Painel titulo="Adicionar">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[220px] flex-1"><CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar peça por nome ou código" /></div>
            <Button variante="secundario" icone={<QrCode size={18} />} onClick={lerQR}>Ler QR da peça</Button>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-mata-suave">
            <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} className="h-4 w-4 accent-lavoura" />
            Mostrar também peças de outros modelos
          </label>
          {busca.trim() && (
            <ul className="divide-y divide-linha rounded-campo border border-linha">
              {resultados.length === 0 && <li className="p-3 text-sm text-mata-suave">Nenhuma peça encontrada{!todas ? ' para este modelo. Marque a opção acima para ver todas.' : '.'}</li>}
              {resultados.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => adicionarPeca(p)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-nevoa">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{p.nome}</span><span className="serial text-xs text-mata-suave">{p.sku}</span></span>
                    <span className="flex shrink-0 items-center gap-3 text-sm">
                      <Selo cor={p.estoque === 0 ? 'vermelho' : p.estoque <= p.estoqueMinimo ? 'ambar' : 'verde'}>{p.estoque} em estoque</Selo>
                      <span className="num">{brl(p.preco)}</span><Plus size={16} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Select value="" onChange={(e) => { adicionarServico(e.target.value); e.target.value = '' }} aria-label="Adicionar serviço do catálogo">
              <option value="">Adicionar serviço do catálogo…</option>
              {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome} · {brl(s.preco)}</option>)}
            </Select>
          </div>
        </div>
      </Painel>

      <Painel titulo="Itens da OS" acoes={os.itens.length > 0 && <Button variante="secundario" tamanho="sm" icone={<FileText size={16} />} onClick={gerarOrcamento}>{os.orcamentoId ? 'Gerar novo orçamento' : 'Gerar orçamento desta OS'}</Button>} semPadding>
        {os.itens.length === 0 ? (
          <EstadoVazio titulo="Nenhum item ainda" texto="Busque uma peça, leia o QR ou escolha um serviço do catálogo." />
        ) : (
          <ul className="divide-y divide-linha">
            {os.itens.map((i) => {
              const p = i.produtoId ? produtos.find((x) => x.id === i.produtoId) : undefined
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-[180px] flex-1">
                    <p className="text-sm font-medium">{i.descricao}</p>
                    <p className="text-xs text-mata-suave">
                      {i.tipo === 'peca' ? 'Peça' : 'Serviço'}
                      {p && <span className={cx('ml-2', p.estoque < i.quantidade && 'font-semibold text-barro-texto')}> · {p.estoque} em estoque{p.estoque < i.quantidade ? ' (insuficiente)' : ''}</span>}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-mata-suave">Qtd.
                    <input type="number" min={1} value={i.quantidade} onChange={(e) => alterar(i.id, { quantidade: Math.max(1, Number(e.target.value) || 1) })} className="num h-10 w-16 rounded-campo border border-linha px-2 text-sm text-mata" />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-mata-suave">Valor
                    <input type="number" min={0} step="0.01" value={i.valorUnit} onChange={(e) => alterar(i.id, { valorUnit: Math.max(0, Number(e.target.value) || 0) })} className="num h-10 w-24 rounded-campo border border-linha px-2 text-sm text-mata" />
                  </label>
                  <span className="num w-24 text-right text-sm font-medium">{brl(i.quantidade * i.valorUnit)}</span>
                  <IconButton icone={<Trash2 size={16} />} aria-label={`Remover ${i.descricao}`} onClick={() => gravar(os.itens.filter((x) => x.id !== i.id))} />
                </li>
              )
            })}
          </ul>
        )}
        {os.itens.length > 0 && (
          <div className="space-y-1 border-t border-linha px-4 py-3 text-sm">
            <p className="flex justify-between text-mata-suave"><span>Peças</span><span className="num">{brl(subPecas)}</span></p>
            <p className="flex justify-between text-mata-suave"><span>Serviços</span><span className="num">{brl(subServ)}</span></p>
            <p className="flex justify-between text-base font-semibold"><span>Total</span><span className="num">{brl(subPecas + subServ)}</span></p>
          </div>
        )}
      </Painel>
      <Confirmar
        aberto={!!perguntaChecklist} titulo="Adicionar as obrigações deste serviço ao checklist?"
        texto={perguntaChecklist ? `${perguntaChecklist.nome}: ${checklistDoServico(perguntaChecklist).length} itens entram no checklist do compromisso do técnico.` : undefined}
        rotuloConfirmar="Adicionar ao checklist" aoCancelar={() => setPerguntaChecklist(null)} aoConfirmar={levarParaChecklist}
      />
    </div>
  )
}
