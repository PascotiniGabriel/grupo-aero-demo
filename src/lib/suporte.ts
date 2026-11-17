import type { Chamado, Cliente, Empresa, PlanoSuporte } from '@/types'
import { dataCurta } from './format'

export type SituacaoSuporte = 'sem_plano' | 'ativo' | 'vencido' | 'desativado'

export interface UsoSuporte { perguntas: number; chamados: number }

export function planoDoCliente(c: Cliente | undefined, empresa: Empresa): PlanoSuporte | undefined {
  return empresa.planosSuporte?.find((p) => p.id === c?.suporte?.planoId)
}

export function situacaoSuporte(c: Cliente | undefined): SituacaoSuporte {
  const s = c?.suporte
  if (!s) return 'sem_plano'
  if (!s.ativo) return 'desativado'
  return new Date(s.ativoAte).getTime() + 86399000 < Date.now() ? 'vencido' : 'ativo'
}

export function textoSituacao(c: Cliente | undefined): string {
  const sit = situacaoSuporte(c)
  if (sit === 'ativo') return `Ativo até ${dataCurta(c!.suporte!.ativoAte)}`
  if (sit === 'vencido') return `Vencido em ${dataCurta(c!.suporte!.ativoAte)}`
  if (sit === 'desativado') return 'Desativado'
  return 'Sem plano'
}

const noMes = (iso: string) => {
  const d = new Date(iso), h = new Date()
  return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth()
}

/** Uso deste mês: perguntas feitas à IA (mensagens do cliente) e chamados levados à equipe. */
export function usoSuporte(clienteId: string, chamados: Chamado[]): UsoSuporte {
  let perguntas = 0, escalados = 0
  for (const c of chamados) {
    if (c.clienteId !== clienteId) continue
    perguntas += c.mensagens.filter((m) => m.de === 'cliente' && m.tipo !== 'outro' && noMes(m.hora)).length
    if (noMes(c.abertoEm) && (c.status === 'aguardando_equipe' || c.status === 'equipe' || c.mensagens.some((m) => m.de === 'equipe'))) escalados++
  }
  return { perguntas, chamados: escalados }
}

export const apenasDigitos = (t: string) => t.replace(/\D/g, '')

export function gerarPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/** Acha o cliente pelo celular (com ou sem DDD) e confere a senha. */
export function entrarSuporte(clientes: Cliente[], celular: string, pin: string): Cliente | undefined {
  const d = apenasDigitos(celular)
  if (d.length < 8) return undefined
  return clientes.find((c) => c.suporte && c.suporte.pin === pin.trim() && apenasDigitos(c.fone).endsWith(d))
}

export function linkSuporte(): string {
  const base = typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''
  return `${base}#/suporte`
}

export function textoAcesso(c: Cliente): string {
  return `Olá, ${c.nome.split(' ')[0]}! Seu Suporte Aerobrasil está pronto.\n\nAcesse: ${linkSuporte()}\nCelular: ${c.fone}\nSenha: ${c.suporte?.pin}\n\nToque no link e depois em "Adicionar à tela inicial" para abrir como aplicativo.`
}

export function linkWhatsApp(fone: string, texto: string): string {
  const d = apenasDigitos(fone)
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}?text=${encodeURIComponent(texto)}`
}

/** Sessão do cliente no aparelho dele. */
const CHAVE = 'aero-suporte-sessao'
export const sessaoSuporte = {
  ler(): { clienteId: string; pin: string } | null {
    try { return JSON.parse(localStorage.getItem(CHAVE) ?? 'null') } catch { return null }
  },
  gravar(clienteId: string, pin: string) { try { localStorage.setItem(CHAVE, JSON.stringify({ clienteId, pin })) } catch { /* ignora */ } },
  limpar() { try { localStorage.removeItem(CHAVE) } catch { /* ignora */ } },
}
