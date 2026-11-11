import type { Produto } from '@/types'
import { normalizar } from '../format'

export interface ConfigIA {
  provedor: 'simulada' | 'gemini'
  chaveGemini: string
  modeloGemini: string
}
const CHAVE = 'aero-ia'
const PADRAO: ConfigIA = { provedor: 'simulada', chaveGemini: '', modeloGemini: 'gemini-2.5-flash' }

export function lerConfigIA(): ConfigIA {
  try {
    const raw = localStorage.getItem(CHAVE)
    return raw ? { ...PADRAO, ...JSON.parse(raw) } : { ...PADRAO }
  } catch { return { ...PADRAO } }
}
export function salvarConfigIA(c: Partial<ConfigIA>): ConfigIA {
  const nova = { ...lerConfigIA(), ...c }
  try { localStorage.setItem(CHAVE, JSON.stringify(nova)) } catch { /* sem armazenamento */ }
  return nova
}
/** true quando há chave Gemini e o provedor real está selecionado. */
export function iaReal(): boolean {
  const c = lerConfigIA()
  return c.provedor === 'gemini' && c.chaveGemini.trim().length > 10
}

export const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface ChamadaGemini { sistema: string; prompt: string; imagens?: string[]; json?: boolean }

export async function chamarGemini({ sistema, prompt, imagens = [], json = false }: ChamadaGemini): Promise<string> {
  const c = lerConfigIA()
  if (!c.chaveGemini.trim()) throw new Error('Informe a chave da IA em Configurações.')
  const partes: unknown[] = [{ text: prompt }]
  for (const url of imagens) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(url)
    if (m) partes.push({ inline_data: { mime_type: m[1], data: m[2] } })
  }
  const corpo = {
    system_instruction: { parts: [{ text: sistema }] },
    contents: [{ role: 'user', parts: partes }],
    generationConfig: { temperature: 0.4, ...(json ? { responseMimeType: 'application/json' } : {}) },
  }
  let resp: Response
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.modeloGemini)}:generateContent?key=${encodeURIComponent(c.chaveGemini.trim())}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) },
    )
  } catch {
    throw new Error('Sem conexão com o serviço de IA. Verifique a internet.')
  }
  if (!resp.ok) {
    let detalhe = ''
    try { detalhe = (await resp.json())?.error?.message ?? '' } catch { /* ignora */ }
    if (resp.status === 400 && /api key/i.test(detalhe)) throw new Error('Chave de IA inválida. Confira em Configurações.')
    if (resp.status === 429) throw new Error('Limite de uso da IA atingido. Tente de novo em instantes.')
    throw new Error(`Erro da IA (${resp.status}). ${detalhe}`.trim())
  }
  const dados = await resp.json()
  const texto = dados?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  if (!texto) throw new Error('A IA não devolveu resposta. Tente reformular o pedido.')
  return texto
}

function tokens(t: string): string[] {
  return normalizar(t).split(/[^a-z0-9]+/).filter((x) => x.length > 0)
}

/** Similaridade 0..1 entre dois textos (tokens normalizados; considera prefixos). */
export function similaridade(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.length || !tb.length) return 0
  let acertos = 0
  for (const x of ta) {
    if (tb.some((y) => y === x)) acertos += 1
    else if (x.length >= 3 && tb.some((y) => y.startsWith(x) || (y.length >= 3 && x.startsWith(y)))) acertos += 0.6
  }
  return acertos / ta.length
}

/** Busca difusa por nome/sku/código/modelo, do mais ao menos relevante. */
export function buscarProdutos(texto: string, produtos: Produto[], limite = 8): Produto[] {
  const q = normalizar(texto).trim()
  if (!q) return []
  return produtos
    .map((p) => {
      const sku = normalizar(p.sku)
      const cod = normalizar(p.codigoFabricante)
      let s = similaridade(q, `${p.nome} ${p.modelosCompativeis.join(' ')} ${p.categoria}`)
      if (sku.includes(q) || cod.includes(q)) s += 2
      if (normalizar(p.nome).includes(q)) s += 1
      return { p, s }
    })
    .filter((x) => x.s >= 0.5)
    .sort((a, b) => b.s - a.s)
    .slice(0, limite)
    .map((x) => x.p)
}
