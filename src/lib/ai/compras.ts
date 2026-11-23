import type { Cotacao, Fornecedor } from '@/types'
import { useStore } from '@/store'
import { chamarGemini, esperar, iaReal } from './index'

export interface ItemLido {
  /** Índice do item na cotação. */
  indiceItem: number
  descricaoLida: string
  precoUnit: number
  pesoKg?: number
  prazo?: number
  observacao?: string
}
export interface PropostaLida {
  itens: ItemLido[]
  frete: number
  outrasDespesas: number
  prazoDias: number
  /** Linhas da cotação que o documento não trouxe. */
  naoEncontrados: string[]
  /** 'gemini' quando a leitura veio da IA real; 'simulada' no modo de demonstração. */
  origem: 'gemini' | 'simulada'
}

export type ArquivoProposta = File | { exemplo: true }

const arred = (n: number) => Math.round(n * 100) / 100

function hash(t: string): number {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Leitura simulada, determinística: preços do estoque com variação pequena e pesos do cadastro. */
function simular(chave: string, cotacao: Cotacao, fornecedor: Fornecedor): PropostaLida {
  const produtos = useStore.getState().produtos
  const h0 = hash(`${chave}|${fornecedor.id}|${cotacao.id}`)
  const faltando = cotacao.itens.length > 2 && h0 % 3 === 0 ? h0 % cotacao.itens.length : -1
  const itens: ItemLido[] = []
  const naoEncontrados: string[] = []
  cotacao.itens.forEach((it, i) => {
    if (i === faltando) { naoEncontrados.push(it.descricao); return }
    const p = produtos.find((x) => x.id === it.produtoId)
    const h = hash(`${chave}|${fornecedor.id}|${i}`)
    const variacao = 0.9 + (h % 21) / 100 // 0,90 a 1,10
    const base = p ? (p.custo > 0 ? p.custo * 1.2 : p.preco * 0.8) : 90 + (h % 260)
    itens.push({
      indiceItem: i,
      descricaoLida: p ? `${p.nome}${p.codigoFabricante ? ` (${p.codigoFabricante})` : ''}` : it.descricao,
      precoUnit: arred(base * variacao),
      pesoKg: p && p.pesoG > 0 ? arred(p.pesoG / 1000) : undefined,
      prazo: fornecedor.prazoMedioDias + (h % 3),
      observacao: h % 7 === 0 ? 'Sob consulta de estoque' : undefined,
    })
  })
  const h = hash(`${chave}|${fornecedor.id}|frete`)
  return {
    itens, naoEncontrados, origem: 'simulada',
    frete: arred(35 + (h % 90)), outrasDespesas: h % 4 === 0 ? arred(12 + (h % 30)) : 0,
    prazoDias: fornecedor.prazoMedioDias + (h % 3),
  }
}

function paraDataUrl(f: File): Promise<string> {
  return new Promise((ok, erro) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => erro(new Error('Não consegui abrir o arquivo.'))
    r.readAsDataURL(f)
  })
}

const num = (v: unknown) => { const n = Number(typeof v === 'string' ? v.replace(/\./g, '').replace(',', '.') : v); return Number.isFinite(n) && n > 0 ? n : 0 }

async function viaGemini(arquivo: File, cotacao: Cotacao, fornecedor: Fornecedor): Promise<PropostaLida> {
  const url = await paraDataUrl(arquivo)
  const lista = cotacao.itens.map((it, i) => `${i}: ${it.descricao} (quantidade ${it.quantidade})`).join('\n')
  const sistema = 'Você lê propostas comerciais de fornecedores de peças para drones agrícolas e devolve somente JSON válido.'
  const prompt = `Leia o documento anexo, uma proposta do fornecedor "${fornecedor.nome}". Relacione cada linha do documento a um item da cotação abaixo (campo "indiceItem" = número antes dos dois pontos).\n\nItens da cotação:\n${lista}\n\n` +
    'Responda JSON estrito neste formato, números em ponto decimal, valores em reais, pesos em kg, prazos em dias: ' +
    '{"itens":[{"indiceItem":0,"descricaoLida":"","precoUnit":0,"pesoKg":0,"prazo":0,"observacao":""}],"frete":0,"outrasDespesas":0,"prazoDias":0,"naoEncontrados":["descrição do item da cotação que o documento não trouxe"]}. ' +
    'Use precoUnit unitário (divida pelo total se o documento só trouxer total da linha). Omita pesoKg, prazo ou observacao quando o documento não disser. Não invente valores.'
  const bruto = await chamarGemini({ sistema, prompt, imagens: [url], json: true })
  const j = JSON.parse(bruto.replace(/^```json\s*|```$/g, '').trim())
  const itens: ItemLido[] = (Array.isArray(j.itens) ? j.itens : [])
    .filter((x: { indiceItem?: unknown }) => Number.isInteger(x.indiceItem) && (x.indiceItem as number) >= 0 && (x.indiceItem as number) < cotacao.itens.length)
    .map((x: Record<string, unknown>) => ({
      indiceItem: x.indiceItem as number, descricaoLida: String(x.descricaoLida ?? ''), precoUnit: num(x.precoUnit),
      pesoKg: num(x.pesoKg) || undefined, prazo: num(x.prazo) || undefined, observacao: x.observacao ? String(x.observacao) : undefined,
    }))
  const lidos = new Set(itens.filter((x) => x.precoUnit > 0).map((x) => x.indiceItem))
  const naoEncontrados = cotacao.itens.filter((_, i) => !lidos.has(i)).map((it) => it.descricao)
  if (lidos.size === 0) throw new Error('A IA não encontrou preços no documento.')
  return { itens, naoEncontrados, frete: num(j.frete), outrasDespesas: num(j.outrasDespesas), prazoDias: num(j.prazoDias) || fornecedor.prazoMedioDias, origem: 'gemini' }
}

/**
 * Lê a proposta de um fornecedor (PDF ou foto) e devolve preços, pesos e condições por item da cotação.
 * Com chave Gemini lê o arquivo de verdade; sem chave (ou em erro) usa a leitura simulada.
 */
export async function lerPropostaFornecedor(arquivo: ArquivoProposta, cotacao: Cotacao, fornecedor: Fornecedor): Promise<PropostaLida> {
  const ehArquivo = arquivo instanceof File
  if (ehArquivo && iaReal()) {
    try { return await viaGemini(arquivo, cotacao, fornecedor) } catch { /* cai no simulado */ }
  }
  await esperar(1400)
  const chave = ehArquivo ? `${arquivo.name}|${arquivo.size}` : 'exemplo'
  return simular(chave, cotacao, fornecedor)
}
