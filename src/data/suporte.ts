import type { Chamado, Cliente, MensagemChamado, PlanoSuporte } from '@/types'
import { diasAFrente, diasAtras } from './util'

export const PLANOS_SUPORTE: PlanoSuporte[] = [
  { id: 'plano-basico', nome: 'Básico', precoMensal: 0, perguntasIAMes: 30, chamadosEquipeMes: 2, atendimento: 'Horário comercial', incluso: 'Grátis por 12 meses na compra do drone' },
  { id: 'plano-completo', nome: 'Completo', precoMensal: 149, perguntasIAMes: 200, chamadosEquipeMes: 10, atendimento: 'Prioridade 24h' },
  { id: 'plano-frota', nome: 'Frota', precoMensal: 390, perguntasIAMes: 800, chamadosEquipeMes: 40, atendimento: 'Prioridade 24h, com técnico dedicado' },
]

const SUP: Record<string, { planoId: string; dias: number; pin: string; enviado?: number }> = {
  'cli-01': { planoId: 'plano-completo', dias: 200, pin: '1234', enviado: 20 },
  'cli-05': { planoId: 'plano-basico', dias: 120, pin: '4321', enviado: 9 },
  'cli-07': { planoId: 'plano-basico', dias: -15, pin: '2468', enviado: 400 },
  'cli-12': { planoId: 'plano-completo', dias: 60, pin: '1357' },
}

export function suporteDoCliente(id: string): Cliente['suporte'] {
  const s = SUP[id]
  if (!s) return undefined
  return { planoId: s.planoId, ativoAte: diasAFrente(s.dias), pin: s.pin, ativo: true, acessoEnviadoEm: s.enviado !== undefined ? diasAtras(s.enviado) : undefined }
}

const DUVIDAS = [
  'Como calibro a balança?', 'Qual tamanho de gota para herbicida?', 'O fluxômetro marcou errado', 'Como lavo o bico de pulverização?',
  'Qual a pressão ideal da bomba?', 'Como atualizo o aplicativo do controle?', 'O drone não conecta no controle', 'Como faço a rota em talhão irregular?',
]

/** Histórico do mês de Aerolavoura (cli-05): perto do limite do plano Básico (30 perguntas). */
export function chamadoUsoAlto(): Chamado {
  const d = new Date()
  const mensagens: MensagemChamado[] = []
  for (let i = 0; i < 27; i++) {
    const quando = new Date(d.getFullYear(), d.getMonth(), 1, 0, 1 + i * 2).toISOString()
    mensagens.push({ id: `cm-uso-${i}a`, de: 'cliente', texto: DUVIDAS[i % DUVIDAS.length], hora: quando })
    mensagens.push({ id: `cm-uso-${i}b`, de: 'ia', texto: 'Siga o passo a passo do manual do seu equipamento.', hora: quando, fonte: 'Manual Agras T40' })
  }
  return {
    id: 'cha-9', numero: 9, clienteId: 'cli-05', equipamentoId: 'eqp-06', assunto: 'Dúvidas de operação na safra', status: 'ia',
    abertoEm: mensagens[0].hora, atualizadoEm: mensagens[mensagens.length - 1].hora, mensagens,
  }
}
