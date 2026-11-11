import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, Plus, ScanLine } from 'lucide-react'
import { Button, CabecalhoPagina, CampoBusca, ChipsModelos, Indicador, Painel, Select, Selo, Tabela, cx, type Coluna } from '@/components/ui'
import { useLeitorQR } from '@/components/qr/LeitorQR'
import { useStore } from '@/store'
import { saidasPorProduto } from '@/store/selectors'
import { brl, normalizar, numero, peso } from '@/lib/format'
import type { Produto } from '@/types'
import { CATEGORIAS, ehExclusiva, situacaoEstoque } from './comum'
import { FormularioPeca } from './FormularioPeca'
import { MovimentoModal } from './MovimentoModal'

type Situacao = 'todas' | 'abaixo' | 'zerado' | 'parado'

export default function EstoqueLista() {
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const produtos = useStore((s) => s.produtos)
  const modelos = useStore((s) => s.modelos)
  const movs = useStore((s) => s.movimentacoes)
  const leitor = useLeitorQR()

  const [modelo, setModelo] = useState('')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [situacao, setSituacao] = useState<Situacao>('todas')
  const [novaAberta, setNovaAberta] = useState(false)
  const [mov, setMov] = useState<{ produto: Produto; tipo: 'entrada' | 'saida' } | null>(null)

  const codigoNovo = params.get('novo') ?? undefined
  const formAberto = novaAberta || !!codigoNovo
  function fecharForm() {
    setNovaAberta(false)
    if (codigoNovo) { const p = new URLSearchParams(params); p.delete('novo'); setParams(p, { replace: true }) }
  }

  const saidas90 = useMemo(() => saidasPorProduto(movs, 90), [movs])
  const parado = (p: Produto) => p.estoque > 0 && !saidas90[p.id]

  const resumo = useMemo(() => ({
    valor: produtos.reduce((s, p) => s + p.custo * p.estoque, 0),
    abaixo: produtos.filter((p) => situacaoEstoque(p) === 'abaixo').length,
    zerados: produtos.filter((p) => p.estoque === 0).length,
    parados: produtos.filter(parado).length,
  }), [produtos, saidas90]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim())
    return produtos.filter((p) => {
      if (modelo && !(p.modelosCompativeis.includes(modelo) || p.modelosCompativeis.length === 0)) return false
      if (categoria && p.categoria !== categoria) return false
      if (situacao === 'abaixo' && situacaoEstoque(p) !== 'abaixo') return false
      if (situacao === 'zerado' && p.estoque !== 0) return false
      if (situacao === 'parado' && !parado(p)) return false
      if (q) {
        const alvo = normalizar([p.nome, p.sku, p.codigoFabricante, ...p.seriais].join(' '))
        if (!alvo.includes(q)) return false
      }
      return true
    })
  }, [produtos, modelo, categoria, situacao, busca, saidas90]) // eslint-disable-line react-hooks/exhaustive-deps

  const nomeModelo = modelos.find((m) => m.id === modelo)?.nome

  const colunas: Coluna<Produto>[] = [
    {
      id: 'nome', titulo: 'Peça', principal: true, valor: (p) => p.nome,
      render: (p) => (
        <div className="min-w-0">
          <p className="font-medium leading-snug">{p.nome}</p>
          <p className="serial text-xs text-mata-suave">{p.sku}</p>
        </div>
      ),
    },
    {
      id: 'compat', titulo: 'Serve no', render: (p) => (
        <div className="flex flex-col items-start gap-1">
          <ChipsModelos ids={p.modelosCompativeis} max={4} />
          {modelo && ehExclusiva(p) && <Selo cor="ambar">Exclusiva do {nomeModelo}</Selo>}
          {modelo && p.modelosCompativeis.length > 1 && <Selo cor="verde">Compartilhada</Selo>}
        </div>
      ),
    },
    {
      id: 'estoque', titulo: 'Estoque', alinhar: 'direita', valor: (p) => p.estoque,
      render: (p) => {
        const s = situacaoEstoque(p)
        return (
          <span className="inline-flex flex-col items-end gap-0.5">
            <span className={cx('num font-semibold', s === 'zerado' && 'text-barro', s === 'abaixo' && 'text-[#7A5600]')}>{numero(p.estoque)}</span>
            <span className="text-xs text-mata-suave">mín. {numero(p.estoqueMinimo)}</span>
            {s === 'zerado' && <Selo cor="vermelho">Zerado</Selo>}
            {s === 'abaixo' && <Selo cor="ambar">Abaixo do mínimo</Selo>}
          </span>
        )
      },
    },
    { id: 'loc', titulo: 'Localização', valor: (p) => p.localizacao, render: (p) => <span className="text-sm">{p.localizacao}</span> },
    { id: 'preco', titulo: 'Preço', alinhar: 'direita', valor: (p) => p.preco, render: (p) => <span className="num">{brl(p.preco)}</span> },
    { id: 'peso', titulo: 'Peso', alinhar: 'direita', valor: (p) => p.pesoG, render: (p) => <span className="num">{peso(p.pesoG)}</span> },
    {
      id: 'acoes', titulo: '', alinhar: 'direita',
      render: (p) => (
        <span className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button tamanho="sm" variante="secundario" icone={<ArrowDownToLine size={15} />} onClick={() => setMov({ produto: p, tipo: 'entrada' })}>Dar entrada</Button>
          <Button tamanho="sm" variante="secundario" icone={<ArrowUpFromLine size={15} />} disabled={p.estoque === 0} onClick={() => setMov({ produto: p, tipo: 'saida' })}>Dar saída</Button>
        </span>
      ),
    },
  ]

  const alternarSituacao = (s: Situacao) => setSituacao((atual) => (atual === s ? 'todas' : s))
  const filtroAtivo = !!(modelo || busca || categoria || situacao !== 'todas')

  const cartao = (rotulo: string, valor: string, s: Situacao, cor?: 'ambar' | 'vermelho') => (
    <button type="button" onClick={() => alternarSituacao(s)} aria-pressed={situacao === s}
      className={cx('rounded-painel text-left outline-offset-2 transition-shadow', situacao === s && 'ring-2 ring-lavoura')}>
      <Indicador rotulo={rotulo} valor={valor} cor={cor} detalhe={situacao === s ? 'Filtrando — toque para limpar' : 'Toque para filtrar'} />
    </button>
  )

  return (
    <>
      <CabecalhoPagina
        titulo="Peças e produtos"
        descricao="Estoque, compatibilidade por modelo e localização."
        acoes={
          <>
            <Button variante="secundario" icone={<ScanLine size={16} />} onClick={() => leitor.abrir()}>Ler QR</Button>
            <Button icone={<Plus size={16} />} onClick={() => setNovaAberta(true)}>Nova peça</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Valor em estoque (custo)" valor={brl(resumo.valor)} detalhe={`${numero(produtos.length)} itens cadastrados`} />
        {cartao('Abaixo do mínimo', numero(resumo.abaixo), 'abaixo', 'ambar')}
        {cartao('Zerados', numero(resumo.zerados), 'zerado', 'vermelho')}
        {cartao('Parados há 90 dias', numero(resumo.parados), 'parado')}
      </div>

      <Painel className="mb-4">
        <div className="grid gap-3">
          <div>
            <p className="mb-2 text-sm font-medium">Serve no</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!modelo} onClick={() => setModelo('')}
                className={cx('min-h-10 rounded-full border px-3.5 text-sm font-medium', !modelo ? 'border-lavoura bg-lavoura text-white' : 'border-linha bg-papel hover:border-lavoura')}>Todos</button>
              {modelos.map((m) => (
                <button key={m.id} type="button" aria-pressed={modelo === m.id} onClick={() => setModelo(modelo === m.id ? '' : m.id)}
                  className={cx('min-h-10 rounded-full border px-3.5 text-sm font-medium', modelo === m.id ? 'border-lavoura bg-lavoura text-white' : 'border-linha bg-papel hover:border-lavoura')}>{m.nome}</button>
              ))}
            </div>
            {modelo && <p className="mt-2 text-xs text-mata-suave">Mostrando as peças exclusivas do {nomeModelo} e as que ele divide com outros modelos.</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_200px]">
            <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome, SKU, código do fabricante ou serial" />
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Select value={situacao} onChange={(e) => setSituacao(e.target.value as Situacao)} aria-label="Situação">
              <option value="todas">Qualquer situação</option>
              <option value="abaixo">Abaixo do mínimo</option>
              <option value="zerado">Zerados</option>
              <option value="parado">Parados há 90 dias</option>
            </Select>
          </div>
          {filtroAtivo && (
            <div className="flex items-center justify-between text-sm text-mata-suave">
              <span>{numero(filtrados.length)} de {numero(produtos.length)} itens</span>
              <button type="button" className="min-h-10 text-ceu hover:underline" onClick={() => { setModelo(''); setBusca(''); setCategoria(''); setSituacao('todas') }}>Limpar filtros</button>
            </div>
          )}
        </div>
      </Painel>

      <Painel semPadding>
        <Tabela
          colunas={colunas} dados={filtrados} chave={(p) => p.id} aoClicar={(p) => navegar(`/estoque/${p.id}`)}
          ordemInicial={{ coluna: 'nome', direcao: 'asc' }}
          vazio={<p className="p-6 text-center text-sm text-mata-suave">Nenhuma peça encontrada com esses filtros.</p>}
        />
      </Painel>

      <FormularioPeca aberta={formAberto} aoFechar={fecharForm} codigoInicial={codigoNovo} aoSalvar={(p) => navegar(`/estoque/${p.id}`)} />
      <MovimentoModal produto={mov?.produto ?? null} tipo={mov?.tipo ?? 'entrada'} aoFechar={() => setMov(null)} />
    </>
  )
}
