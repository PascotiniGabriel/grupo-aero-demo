import { useEffect, useMemo, useState } from 'react'
import { ScanLine } from 'lucide-react'
import { Button, Campo, Gaveta, Input, Select, cx, toast } from '@/components/ui'
import { useLeitorQR } from '@/components/qr/LeitorQR'
import { useStore, novoId } from '@/store'
import { brl } from '@/lib/format'
import type { CategoriaProduto, GrupoDiagrama, Produto } from '@/types'
import { CATEGORIAS, FAMILIAS, GRUPOS, ORDEM_GRUPOS, paraNumero, sugerirSku, tipoDaCategoria } from './comum'

const txt = (n: number) => (n ? String(n).replace('.', ',') : '')

interface Props {
  aberta: boolean
  aoFechar: () => void
  produto?: Produto
  codigoInicial?: string
  aoSalvar?: (p: Produto) => void
}

export function FormularioPeca({ aberta, aoFechar, produto, codigoInicial, aoSalvar }: Props) {
  const produtos = useStore((s) => s.produtos)
  const modelos = useStore((s) => s.modelos)
  const salvar = useStore((s) => s.salvar)
  const leitor = useLeitorQR()
  const edicao = !!produto

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState<CategoriaProduto>('Propulsão')
  const [grupo, setGrupo] = useState<GrupoDiagrama | ''>('')
  const [compat, setCompat] = useState<string[]>([])
  const [sku, setSku] = useState('')
  const [skuManual, setSkuManual] = useState(false)
  const [codFab, setCodFab] = useState('')
  const [custo, setCusto] = useState('')
  const [preco, setPreco] = useState('')
  const [estoque, setEstoque] = useState('0')
  const [minimo, setMinimo] = useState('')
  const [pesoG, setPesoG] = useState('')
  const [c, setC] = useState('')
  const [l, setL] = useState('')
  const [a, setA] = useState('')
  const [ncm, setNcm] = useState('')
  const [loc, setLoc] = useState('')
  const [forn, setForn] = useState('')
  const [serial, setSerial] = useState(false)
  const [tentou, setTentou] = useState(false)

  useEffect(() => {
    if (!aberta) return
    setTentou(false)
    if (produto) {
      setNome(produto.nome); setCategoria(produto.categoria); setGrupo(produto.grupo ?? ''); setCompat(produto.modelosCompativeis)
      setSku(produto.sku); setSkuManual(true); setCodFab(produto.codigoFabricante)
      setCusto(txt(produto.custo)); setPreco(txt(produto.preco)); setEstoque(String(produto.estoque)); setMinimo(String(produto.estoqueMinimo))
      setPesoG(txt(produto.pesoG)); setC(txt(produto.dimensoesCm.c)); setL(txt(produto.dimensoesCm.l)); setA(txt(produto.dimensoesCm.a))
      setNcm(produto.ncm); setLoc(produto.localizacao); setForn(produto.fornecedor); setSerial(produto.controlaSerial)
    } else {
      setNome(''); setCategoria('Propulsão'); setGrupo(''); setCompat([]); setSku(''); setSkuManual(false)
      setCodFab(codigoInicial ?? ''); setCusto(''); setPreco(''); setEstoque('0'); setMinimo('')
      setPesoG(''); setC(''); setL(''); setA(''); setNcm(''); setLoc(''); setForn(''); setSerial(false)
    }
  }, [aberta, produto, codigoInicial])

  const skuSugerido = useMemo(() => sugerirSku(categoria, grupo, compat, produtos), [categoria, grupo, compat, produtos])
  useEffect(() => { if (aberta && !skuManual) setSku(skuSugerido) }, [aberta, skuManual, skuSugerido])

  const fornecedores = useMemo(() => Array.from(new Set(produtos.map((p) => p.fornecedor))).sort(), [produtos])
  const custoN = paraNumero(custo)
  const precoN = paraNumero(preco)
  const margem = precoN > 0 ? ((precoN - custoN) / precoN) * 100 : null
  const alternar = (id: string) => setCompat((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))
  const pesoN = paraNumero(pesoG)

  function enviar() {
    setTentou(true)
    if (!nome.trim() || !sku.trim() || precoN <= 0) { toast.erro('Preencha nome, SKU e preço'); return }
    const novo: Produto = {
      id: produto?.id ?? novoId('prd'),
      sku: sku.trim(), codigoFabricante: codFab.trim(), nome: nome.trim(), categoria, tipo: tipoDaCategoria(categoria),
      modelosCompativeis: compat, grupo: grupo || undefined,
      custo: custoN, preco: precoN, estoque: Math.max(0, Math.round(paraNumero(estoque))), estoqueMinimo: Math.max(0, Math.round(paraNumero(minimo))),
      pesoG: pesoN, dimensoesCm: { c: paraNumero(c), l: paraNumero(l), a: paraNumero(a) },
      ncm: ncm.trim(), localizacao: loc.trim(), fornecedor: forn.trim(), controlaSerial: serial,
      seriais: produto?.seriais ?? [], observacao: produto?.observacao,
    }
    salvar('produtos', novo)
    toast.sucesso(edicao ? 'Peça atualizada' : 'Peça cadastrada')
    aoSalvar?.(novo)
    aoFechar()
  }

  const chip = (ativo: boolean) => cx(
    'min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors',
    ativo ? 'border-lavoura bg-lavoura text-white' : 'border-linha bg-papel text-mata hover:border-lavoura',
  )

  return (
    <Gaveta
      aberta={aberta} aoFechar={aoFechar} largura="lg" titulo={edicao ? 'Editar peça' : 'Nova peça'}
      rodape={<><Button variante="secundario" onClick={aoFechar}>Cancelar</Button><Button onClick={enviar}>{edicao ? 'Salvar alterações' : 'Cadastrar peça'}</Button></>}
    >
      <div className="grid gap-4">
        <Campo rotulo="Nome da peça" obrigatorio erro={tentou && !nome.trim() ? 'Informe o nome' : undefined}>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Motor 80100 (T40)" autoFocus />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Categoria">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaProduto)}>
              {CATEGORIAS.map((x) => <option key={x}>{x}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Grupo do diagrama" ajuda="Liga a peça à vista explodida do catálogo">
            <Select value={grupo} onChange={(e) => setGrupo(e.target.value as GrupoDiagrama | '')}>
              <option value="">Sem grupo (não aparece no desenho)</option>
              {ORDEM_GRUPOS.map((g) => <option key={g} value={g}>{GRUPOS[g]}</option>)}
            </Select>
          </Campo>
        </div>

        <fieldset className="rounded-painel border border-linha p-3">
          <legend className="px-1 text-sm font-medium">Serve em quais modelos?</legend>
          <div className="flex flex-wrap gap-2">
            {modelos.map((m) => (
              <button key={m.id} type="button" aria-pressed={compat.includes(m.id)} onClick={() => alternar(m.id)} className={chip(compat.includes(m.id))}>{m.nome}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-mata-suave">Atalhos:</span>
            <button type="button" className="min-h-10 text-ceu hover:underline" onClick={() => setCompat(modelos.map((m) => m.id))}>Todos</button>
            {FAMILIAS.map((f) => (
              <button key={f.rotulo} type="button" className="min-h-10 text-ceu hover:underline" onClick={() => setCompat(Array.from(new Set([...compat, ...f.ids])))}>+ {f.rotulo}</button>
            ))}
            <button type="button" className="min-h-10 text-mata-suave hover:underline" onClick={() => setCompat([])}>Limpar</button>
          </div>
          <p className="mt-1 text-xs text-mata-suave">
            {compat.length === 0 ? 'Nenhum modelo marcado: a peça é tratada como universal.' : compat.length === 1 ? 'Peça exclusiva de um modelo.' : `Peça compartilhada entre ${compat.length} modelos.`}
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="SKU" obrigatorio ajuda={skuManual && sku !== skuSugerido ? `Sugestão: ${skuSugerido}` : 'Sugerido automaticamente'} erro={tentou && !sku.trim() ? 'Informe o SKU' : undefined}>
            <Input value={sku} onChange={(e) => { setSku(e.target.value); setSkuManual(true) }} className="serial" />
          </Campo>
          <div className="flex items-end gap-2">
            <Campo rotulo="Código do fabricante" className="min-w-0 flex-1">
              <Input value={codFab} onChange={(e) => setCodFab(e.target.value)} className="serial" />
            </Campo>
            <Button variante="secundario" icone={<ScanLine size={16} />} onClick={() => leitor.abrir({ titulo: 'Ler código da peça', aoLer: (cod) => setCodFab(cod) })}>Ler QR</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Custo (R$)"><Input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} /></Campo>
          <Campo rotulo="Preço de venda (R$)" obrigatorio erro={tentou && precoN <= 0 ? 'Informe o preço' : undefined}>
            <Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
          </Campo>
          <div className="flex flex-col justify-end pb-2 text-sm">
            <span className="text-mata-suave">Margem</span>
            <span className={cx('num font-medium', margem !== null && margem < 20 ? 'text-barro-texto' : 'text-lavoura-texto')}>
              {margem === null ? '—' : `${margem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% (${brl(precoN - custoN)})`}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {!edicao && <Campo rotulo="Estoque inicial"><Input inputMode="numeric" value={estoque} onChange={(e) => setEstoque(e.target.value)} /></Campo>}
          <Campo rotulo="Estoque mínimo"><Input inputMode="numeric" value={minimo} onChange={(e) => setMinimo(e.target.value)} /></Campo>
          <Campo rotulo="Localização"><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Ex.: Prateleira A3" /></Campo>
        </div>

        <fieldset className="rounded-painel border border-linha p-3">
          <legend className="px-1 text-sm font-medium">Peso e dimensões (para o frete)</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Campo rotulo="Peso (g)" ajuda={pesoN ? `${(pesoN / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg` : undefined}>
              <Input inputMode="decimal" value={pesoG} onChange={(e) => setPesoG(e.target.value)} />
            </Campo>
            <Campo rotulo="Comprimento (cm)"><Input inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} /></Campo>
            <Campo rotulo="Largura (cm)"><Input inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} /></Campo>
            <Campo rotulo="Altura (cm)"><Input inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} /></Campo>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="NCM"><Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="0000.00.00" /></Campo>
          <Campo rotulo="Fornecedor">
            <Input value={forn} onChange={(e) => setForn(e.target.value)} list="lista-fornecedores" />
          </Campo>
          <datalist id="lista-fornecedores">{fornecedores.map((f) => <option key={f} value={f} />)}</datalist>
        </div>

        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={serial} onChange={(e) => setSerial(e.target.checked)} className="size-5 accent-lavoura" />
          Controla número de série (cada unidade tem o seu QR)
        </label>
      </div>
    </Gaveta>
  )
}
