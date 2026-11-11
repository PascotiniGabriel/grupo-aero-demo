import type { OrdemServico, StatusOS } from '@/types'

export const STATUS_ORDEM: StatusOS[] = ['recebido', 'diagnostico', 'aguardando_aprovacao', 'em_manutencao', 'testes', 'pronto', 'entregue']

export const ROTULO_COLUNA: Record<StatusOS, string> = {
  recebido: 'Recebido',
  diagnostico: 'Diagnóstico',
  aguardando_aprovacao: 'Aguardando aprovação',
  em_manutencao: 'Em manutenção',
  testes: 'Testes',
  pronto: 'Pronto',
  entregue: 'Entregue',
}

export function atrasada(os: OrdemServico): boolean {
  if (os.status === 'entregue' || os.status === 'pronto') return false
  return new Date(os.previsao).getTime() < Date.now() - 86400000
}

/** Devolve a OS no novo status, com registro no histórico. */
export function comStatus(os: OrdemServico, novo: StatusOS): OrdemServico {
  if (os.status === novo) return os
  const agora = new Date().toISOString()
  return {
    ...os,
    status: novo,
    conclusao: novo === 'pronto' || novo === 'entregue' ? os.conclusao ?? agora : undefined,
    historico: [...os.historico, { data: agora, texto: `Status alterado para "${ROTULO_COLUNA[novo]}"` }],
  }
}

export function temRelatorio(os: OrdemServico): boolean { return !!os.relatorio }
