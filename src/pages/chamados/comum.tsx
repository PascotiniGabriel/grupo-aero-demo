import { Selo, type CorSelo } from '@/components/ui'
import { useStore } from '@/store'
import { planoDoCliente, situacaoSuporte } from '@/lib/suporte'
import type { Chamado } from '@/types'

export const STATUS_CHAMADO: Record<Chamado['status'], { rotulo: string; cor: CorSelo }> = {
  aguardando_equipe: { rotulo: 'Precisa da equipe', cor: 'vermelho' },
  equipe: { rotulo: 'Com a equipe', cor: 'azul' },
  ia: { rotulo: 'Resolvido pela IA', cor: 'verde' },
  resolvido: { rotulo: 'Resolvido', cor: 'neutro' },
}
export const ORDEM: Record<Chamado['status'], number> = { aguardando_equipe: 0, equipe: 1, ia: 2, resolvido: 3 }

export function SeloChamado({ status }: { status: Chamado['status'] }) {
  const s = STATUS_CHAMADO[status]
  return <Selo cor={s.cor}>{s.rotulo}</Selo>
}

/** Selo do plano de suporte do cliente (ou aviso de vencido/sem plano). */
export function SeloPlano({ clienteId }: { clienteId: string }) {
  const cliente = useStore((s) => s.clientes.find((c) => c.id === clienteId))
  const empresa = useStore((s) => s.empresa)
  const sit = situacaoSuporte(cliente)
  const plano = planoDoCliente(cliente, empresa)
  if (sit === 'ativo' && plano) return <Selo cor={plano.precoMensal > 0 ? 'azul' : 'verde'}>Plano {plano.nome}</Selo>
  if (sit === 'vencido') return <Selo cor="vermelho">Plano vencido</Selo>
  if (sit === 'desativado') return <Selo>Suporte desativado</Selo>
  return <Selo cor="ambar">Sem plano</Selo>
}
