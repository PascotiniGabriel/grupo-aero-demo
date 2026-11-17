import { Selo, type CorSelo } from '@/components/ui'
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
