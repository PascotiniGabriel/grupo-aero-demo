import { useMemo, useRef, useState } from 'react'
import { Check, FileCode2, PackagePlus, Search, Upload } from 'lucide-react'
import { Button, CampoBusca, Gaveta, Input, Select, Selo, cx, toast } from '@/components/ui'
import { useStore, novoId } from '@/store'
import { porId } from '@/store/selectors'
import { brl, normalizar, numero } from '@/lib/format'
import type { CategoriaProduto, NotaFiscal, Produto } from '@/types'
import { lerNFe, somarDias, xmlExemplo, type NotaXML } from './xml'

interface Linha {
  cProd: string; xProd: string; qtd: number; vUn: number
  produtoId: string | null // null = cadastrar como peça nova
  novo: { nome: string; ncm: string; custo: string; pesoG: string; categoria: CategoriaProduto }
  trocando: boolean; busca: string
}
interface Resumo { entradas: { nome: string; qtd: number; novo: boolean }[]; total: number; numero: number; emitente: string }

const CATEGORIAS: CategoriaProduto[] = ['Propulsão', 'Pulverização', 'Estrutura', 'Eletrônica', 'Energia', 'Sensores', 'Acessórios']

export default function ImportarXML({ aoFechar }: { aoFechar: () => void }) {
  const produtos = useStore((s) => s.produtos)
  const salvar = useStore((s) => s.salvar)
  const movimentar = useStore((s) => s.movimentarEstoque)
  const arquivo = useRef<HTMLInputElement>(null)
  const [nota, setNota] = useState<NotaXML | null>(null)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)

  const carregar = (texto: string) => {
    try {
      const n = lerNFe(texto)
      const somaQ = n.itens.reduce((s, i) => s + i.qtd, 0)
      const pesoUnitG = n.pesoKg > 0 && somaQ > 0 ? Math.round((n.pesoKg * 1000) / somaQ) : 0
      setLinhas(n.itens.map((i) => {
        const achou = produtos.find((p) => normalizar(p.codigoFabricante) === normalizar(i.cProd))
        return {
          cProd: i.cProd, xProd: i.xProd, qtd: i.qtd, vUn: i.vUn, produtoId: achou?.id ?? null, trocando: false, busca: '',
          novo: { nome: i.xProd, ncm: i.ncm, custo: String(i.vUn).replace('.', ','), pesoG: String(pesoUnitG), categoria: 'Propulsão' },
        }
      }))
      setNota(n)
    } catch (e) {
      toast.erro(e instanceof Error ? e.message : 'Não consegui ler este arquivo.')
    }
  }

  const aoEscolherArquivo = async (f: File | undefined) => {
    if (!f) return
    carregar(await f.text())
    if (arquivo.current) arquivo.current.value = ''
  }

  const mudar = (i: number, p: Partial<Linha>) => setLinhas((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const mudarNovo = (i: number, p: Partial<Linha['novo']>) => setLinhas((l) => l.map((x, k) => (k === i ? { ...x, novo: { ...x.novo, ...p } } : x)))

  const total = linhas.reduce((s, l) => s + l.qtd * l.vUn, 0)
  const qtdNovos = linhas.filter((l) => l.produtoId === null).length

  const darEntrada = () => {
    if (!nota) return
    const origem = `NF ${nota.numero}`
    const entradas: Resumo['entradas'] = []
    const itensNota: NotaFiscal['itens'] = []
    linhas.forEach((l, i) => {
      let id = l.produtoId; let nome = ''
      if (id === null) {
        const custo = Number(l.novo.custo.replace(',', '.')) || l.vUn
        const p: Produto = {
          id: novoId('prd'), sku: `AER-NOV-${String(Date.now()).slice(-5)}${i}`, codigoFabricante: l.cProd, nome: l.novo.nome.trim() || l.xProd,
          categoria: l.novo.categoria, tipo: l.novo.categoria === 'Acessórios' ? 'acessorio' : 'peca', modelosCompativeis: [],
          custo, preco: Math.round((custo * 2) / 5) * 5 - 0.1, estoque: 0, estoqueMinimo: 5,
          pesoG: Number(l.novo.pesoG) || 0, dimensoesCm: { c: 10, l: 10, a: 10 }, ncm: l.novo.ncm, localizacao: 'Recebimento',
          fornecedor: nota.emitente, controlaSerial: false, seriais: [],
        }
        salvar('produtos', p); id = p.id; nome = p.nome
      } else nome = porId(produtos, id)?.nome ?? l.xProd
      movimentar({ produtoId: id, tipo: 'entrada', quantidade: l.qtd, origem, valorUnit: l.vUn })
      entradas.push({ nome, qtd: l.qtd, novo: l.produtoId === null })
      itensNota.push({ descricao: nome, ncm: l.novo.ncm, quantidade: l.qtd, valorUnit: l.vUn, produtoId: id })
    })
    const valor = Math.round(total * 100) / 100
    salvar('notas', {
      id: novoId('nf'), numero: nota.numero, serie: nota.serie, tipo: 'entrada', modelo: 'NF-e', natureza: 'Compra para revenda',
      emitente: nota.emitente, data: new Date().toISOString(), valor, status: 'autorizada', chave: nota.chave, itens: itensNota, origem: 'Importada de XML',
    })
    salvar('lancamentos', {
      id: novoId('lan'), tipo: 'pagar', descricao: `Compra de peças, ${nota.emitente}`, categoria: 'Fornecedores', valor,
      vencimento: somarDias(30), forma: 'Boleto', origem: origem,
    })
    setResumo({ entradas, total: valor, numero: nota.numero, emitente: nota.emitente })
    toast.sucesso('Entrada no estoque concluída')
  }

  return (
    <Gaveta
      aberta aoFechar={aoFechar} titulo="Importar XML de compra" largura="xl"
      rodape={resumo
        ? <Button onClick={aoFechar}>Concluir</Button>
        : nota
          ? <><Button variante="fantasma" onClick={() => { setNota(null); setLinhas([]) }}>Voltar</Button><Button icone={<Check size={16} />} onClick={darEntrada}>Dar entrada no estoque</Button></>
          : <Button variante="fantasma" onClick={aoFechar}>Cancelar</Button>}
    >
      {resumo ? (
        <div className="space-y-4">
          <div className="rounded-painel border border-lavoura bg-lavoura-claro p-4">
            <p className="font-medium">Entrada concluída: NF {resumo.numero}, {resumo.emitente}</p>
            <p className="mt-1 text-sm">{resumo.entradas.length} itens deram entrada no estoque. Foi criada a conta a pagar de {brl(resumo.total)} (vence em 30 dias).</p>
          </div>
          <ul className="divide-y divide-linha rounded-painel border border-linha">
            {resumo.entradas.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">{e.nome}</span>
                <span className="flex shrink-0 items-center gap-2">{e.novo && <Selo cor="azul">Peça nova</Selo>}<span className="num font-medium">+{numero(e.qtd)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      ) : !nota ? (
        <div className="space-y-4">
          <p className="text-sm text-mata-suave">Envie o XML da nota do fornecedor. O sistema lê os itens, o peso e os dados da nota, e você só confere antes de dar entrada.</p>
          <input ref={arquivo} type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={(e) => aoEscolherArquivo(e.target.files?.[0])} />
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => arquivo.current?.click()} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-painel border-2 border-dashed border-linha p-4 text-center hover:border-lavoura">
              <Upload size={22} aria-hidden /><span className="font-medium">Escolher arquivo XML</span><span className="text-xs text-mata-suave">NF-e de compra, extensão .xml</span>
            </button>
            <button type="button" onClick={() => carregar(xmlExemplo(produtos))} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-painel border border-linha p-4 text-center hover:border-lavoura">
              <FileCode2 size={22} aria-hidden /><span className="font-medium">Usar XML de exemplo</span><span className="text-xs text-mata-suave">Fornecedor fictício, 5 itens</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-painel bg-nevoa p-3 text-sm">
            <p className="font-medium">{nota.emitente}</p>
            <p className="mt-0.5 text-mata-suave">NF {nota.numero} · série {nota.serie}{nota.pesoKg > 0 && <> · peso {numero(nota.pesoKg, 3)} kg</>} · <span className="num">{brl(total)}</span></p>
            <p className="mt-0.5 text-mata-suave">{linhas.length - qtdNovos} itens já cadastrados e {qtdNovos} para cadastrar como peça nova.</p>
          </div>
          <ul className="space-y-3">
            {linhas.map((l, i) => {
              const casado = l.produtoId ? porId(produtos, l.produtoId) : undefined
              const q = normalizar(l.busca)
              const achados = l.trocando ? produtos.filter((p) => !q || normalizar(`${p.nome} ${p.sku} ${p.codigoFabricante}`).includes(q)).slice(0, 5) : []
              return (
                <li key={i} className="rounded-painel border border-linha p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{l.xProd}</p>
                      <p className="text-xs text-mata-suave"><span className="serial">{l.cProd}</span> · {numero(l.qtd)} un. x {brl(l.vUn)}</p>
                    </div>
                    <span className="num shrink-0 text-sm font-medium">{brl(l.qtd * l.vUn)}</span>
                  </div>
                  <div className={cx('mt-2 rounded-campo p-2 text-sm', casado ? 'bg-lavoura-claro' : 'bg-ceu-claro')}>
                    {casado ? <p className="flex items-center gap-1.5"><Check size={14} aria-hidden />Casou com: <strong>{casado.nome}</strong> <span className="text-xs text-mata-suave">(estoque {numero(casado.estoque)})</span></p>
                      : <p className="flex items-center gap-1.5"><PackagePlus size={14} aria-hidden />Cadastrar como peça nova</p>}
                    <div className="mt-1 flex flex-wrap gap-x-3">
                      <button type="button" className="min-h-10 text-sm font-medium text-ceu hover:underline" onClick={() => mudar(i, { trocando: !l.trocando })}>{casado ? 'Trocar produto' : 'Escolher produto existente'}</button>
                      {casado && <button type="button" className="min-h-10 text-sm font-medium text-ceu hover:underline" onClick={() => mudar(i, { produtoId: null, trocando: false })}>Cadastrar como peça nova</button>}
                    </div>
                    {l.trocando && (
                      <div className="mt-1 space-y-1">
                        <CampoBusca valor={l.busca} aoMudar={(v) => mudar(i, { busca: v })} placeholder="Buscar por nome ou código" />
                        {achados.map((p) => (
                          <button key={p.id} type="button" onClick={() => mudar(i, { produtoId: p.id, trocando: false, busca: '' })} className="flex min-h-10 w-full items-center gap-2 rounded-campo bg-papel px-2 text-left text-sm hover:bg-nevoa">
                            <Search size={14} aria-hidden /><span className="truncate">{p.nome}</span>
                          </button>
                        ))}
                        {achados.length === 0 && <p className="px-1 text-xs text-mata-suave">Nenhum produto encontrado.</p>}
                      </div>
                    )}
                  </div>
                  {!casado && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="col-span-2 text-xs text-mata-suave">Nome<Input value={l.novo.nome} onChange={(e) => mudarNovo(i, { nome: e.target.value })} /></label>
                      <label className="text-xs text-mata-suave">NCM<Input value={l.novo.ncm} onChange={(e) => mudarNovo(i, { ncm: e.target.value })} /></label>
                      <label className="text-xs text-mata-suave">Categoria
                        <Select value={l.novo.categoria} onChange={(e) => mudarNovo(i, { categoria: e.target.value as CategoriaProduto })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</Select>
                      </label>
                      <label className="text-xs text-mata-suave">Custo (R$)<Input inputMode="decimal" value={l.novo.custo} onChange={(e) => mudarNovo(i, { custo: e.target.value })} /></label>
                      <label className="text-xs text-mata-suave">Peso por unidade (g)<Input inputMode="numeric" value={l.novo.pesoG} onChange={(e) => mudarNovo(i, { pesoG: e.target.value })} /></label>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-mata-suave">O peso por unidade vem do peso total da nota dividido pelas unidades. Ajuste se precisar.</p>
        </div>
      )}
    </Gaveta>
  )
}
