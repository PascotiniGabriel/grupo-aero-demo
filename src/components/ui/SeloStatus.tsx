import type { Lancamento } from '@/types'
import { Selo, type CorSelo } from './Selo'

export type TipoStatus = 'os' | 'orcamento' | 'nota' | 'lancamento'

const MAPA: Record<TipoStatus, Record<string, [string, CorSelo]>> = {
  os: {
    recebido: ['Recebido', 'neutro'],
    diagnostico: ['Em diagnóstico', 'azul'],
    aguardando_aprovacao: ['Aguardando aprovação', 'ambar'],
    em_manutencao: ['Em manutenção', 'azul'],
    testes: ['Em testes', 'azul'],
    pronto: ['Pronto para retirada', 'verde'],
    entregue: ['Entregue', 'neutro'],
  },
  orcamento: {
    rascunho: ['Rascunho', 'neutro'], enviado: ['Enviado', 'azul'], aprovado: ['Aprovado', 'verde'],
    recusado: ['Recusado', 'vermelho'], expirado: ['Expirado', 'ambar'],
  },
  nota: {
    autorizada: ['Autorizada', 'verde'], pendente: ['Pendente', 'ambar'], rejeitada: ['Rejeitada', 'vermelho'], cancelada: ['Cancelada', 'neutro'],
  },
  lancamento: { pago: ['Pago', 'verde'], a_vencer: ['A vencer', 'azul'], vencido: ['Vencido', 'vermelho'] },
}

export function rotuloStatus(tipo: TipoStatus, status: string): string {
  return MAPA[tipo][status]?.[0] ?? status
}
/** Situação de um lançamento: 'pago' | 'a_vencer' | 'vencido'. */
export function statusLancamento(l: Pick<Lancamento, 'pagoEm' | 'vencimento'>): 'pago' | 'a_vencer' | 'vencido' {
  if (l.pagoEm) return 'pago'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return new Date(l.vencimento).getTime() < hoje.getTime() ? 'vencido' : 'a_vencer'
}

export function SeloStatus({ tipo, status }: { tipo: TipoStatus; status: string }) {
  const [rotulo, cor] = MAPA[tipo][status] ?? [status, 'neutro' as CorSelo]
  return <Selo cor={cor}>{rotulo}</Selo>
}
