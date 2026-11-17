import type { Cliente, Equipamento, MensagemChamado, ModeloDrone } from '@/types'
import { MANUAIS, type TrechoManual } from '@/data/manuais'
import { normalizar } from '../format'
import { chamarGemini, esperar, iaReal } from './index'

export interface ContextoSuporte {
  equipamento: Equipamento
  modelo: ModeloDrone
  cliente: Cliente
  historico: MensagemChamado[]
}

export interface RespostaSuporte {
  texto: string
  passos?: string[]
  fonte?: string
  precisaEquipe: boolean
  assunto: string
}

const RISCO = ['queda', 'caiu', 'bateu', 'acidente', 'fogo', 'fumaca', 'incendio', 'pegou fogo', 'inchada', 'inchou', 'estufada', 'estufou', 'garantia', 'preco', 'quanto custa', 'orcamento', 'valor', 'cobranca', 'reembolso', 'faltou peca']
const PEDE_EQUIPE = ['falar com', 'atendente', 'humano', 'tecnico', 'pessoa', 'equipe']

export function pedeEquipe(texto: string): boolean {
  const t = normalizar(texto)
  return PEDE_EQUIPE.some((p) => t.includes(p))
}

function resumo(t: string): string {
  const s = t.trim().replace(/\s+/g, ' ')
  return s.length > 60 ? `${s.slice(0, 57)}...` : s
}

function achar(pergunta: string, modeloId: string): TrechoManual | null {
  const t = normalizar(pergunta)
  let melhor: { m: TrechoManual; s: number } | null = null
  for (const m of MANUAIS) {
    if (!m.modelos.includes(modeloId)) continue
    let s = 0
    for (const p of m.palavras) if (t.includes(normalizar(p))) s += normalizar(p).includes(' ') ? 2 : 1
    if (t.includes(normalizar(m.tema))) s += 2
    if (s > 0 && (!melhor || s > melhor.s)) melhor = { m, s }
  }
  return melhor && melhor.s >= 1 ? melhor.m : null
}

const MSG_EQUIPE = 'Para esse caso eu prefiro não arriscar: vou chamar a equipe técnica da Aerobrasil para falar com você. Enquanto isso, mantenha o drone desligado e em local seguro.'

function simulada(pergunta: string, ctx: ContextoSuporte): RespostaSuporte {
  const t = normalizar(pergunta)
  const assunto = resumo(pergunta)
  if (RISCO.some((r) => t.includes(r)) || pedeEquipe(pergunta)) {
    return { texto: pedeEquipe(pergunta) ? 'Certo, já chamei a equipe da Aerobrasil. Um técnico vai entrar na conversa em breve.' : MSG_EQUIPE, precisaEquipe: true, assunto }
  }
  const m = achar(pergunta, ctx.modelo.id)
  if (!m) {
    return { texto: 'Não encontrei esse assunto no manual do seu equipamento. Vou chamar a equipe técnica para te ajudar.', precisaEquipe: true, assunto }
  }
  return {
    texto: `Para o seu ${ctx.modelo.nome}, siga estes passos (${m.titulo.toLowerCase()}):`,
    passos: m.passos, fonte: m.fonte, precisaEquipe: false, assunto: m.titulo,
  }
}

async function viaGemini(pergunta: string, ctx: ContextoSuporte): Promise<RespostaSuporte> {
  const trechos = MANUAIS.filter((m) => m.modelos.includes(ctx.modelo.id))
  const base = trechos.map((m) => `[${m.id}] ${m.titulo} (${m.fonte})\n${m.passos.map((p, i) => `${i + 1}. ${p}`).join('\n')}`).join('\n\n')
  const hist = ctx.historico.slice(-8).map((h) => `${h.de}: ${h.texto}`).join('\n')
  const sistema = `Você é o agente de suporte da Aerobrasil Drones, falando com um cliente no campo que usa um ${ctx.modelo.nome}. Responda em pt-BR, simples e curto. Use SOMENTE os trechos de manual abaixo; não invente procedimentos. Se a pergunta não for coberta, envolver queda, fogo, bateria inchada, garantia ou preço, defina precisaEquipe=true. Responda JSON: {"texto":string,"trechoId":string|null,"precisaEquipe":boolean,"assunto":string}.\n\nMANUAIS:\n${base}`
  const bruto = await chamarGemini({ sistema, prompt: `Histórico:\n${hist}\n\nPergunta do cliente: ${pergunta}`, json: true })
  const j = JSON.parse(bruto.replace(/^```json|```$/g, '').trim()) as { texto: string; trechoId?: string | null; precisaEquipe?: boolean; assunto?: string }
  const t = trechos.find((x) => x.id === j.trechoId)
  const precisa = !!j.precisaEquipe || (!t && RISCO.some((r) => normalizar(pergunta).includes(r)))
  return { texto: j.texto, passos: precisa ? undefined : t?.passos, fonte: precisa ? undefined : t?.fonte, precisaEquipe: precisa, assunto: j.assunto || resumo(pergunta) }
}

/** Responde à dúvida do cliente com base nos manuais. Assinatura independente do provedor. */
export async function responderCliente(pergunta: string, ctx: ContextoSuporte): Promise<RespostaSuporte> {
  if (iaReal()) {
    try { return await viaGemini(pergunta, ctx) } catch { /* cai no simulado */ }
  }
  await esperar(700)
  return simulada(pergunta, ctx)
}
