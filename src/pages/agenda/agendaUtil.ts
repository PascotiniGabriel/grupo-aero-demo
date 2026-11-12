import type { Compromisso, StatusCompromisso, TipoCompromisso } from '@/types'
import type { CorSelo } from '@/components/ui'

export const ROTULO_TIPO: Record<TipoCompromisso, string> = {
  atendimento_campo: 'Atendimento em campo',
  manutencao_oficina: 'Manutenção na oficina',
  entrega: 'Entrega',
  treinamento: 'Treinamento',
  revisao_programada: 'Revisão programada',
  outro: 'Outro',
}

export const ROTULO_STATUS: Record<StatusCompromisso, string> = {
  agendado: 'Agendado', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado',
}
export const COR_STATUS: Record<StatusCompromisso, CorSelo> = {
  agendado: 'azul', em_andamento: 'ambar', concluido: 'verde', cancelado: 'neutro',
}

/** Cor por técnico (índice na lista de técnicos). Só classes literais, para o Tailwind enxergar. */
export const CORES_TECNICO = [
  { barra: 'border-l-lavoura', ponto: 'bg-lavoura' },
  { barra: 'border-l-ceu', ponto: 'bg-ceu' },
  { barra: 'border-l-ambar', ponto: 'bg-ambar' },
  { barra: 'border-l-mata', ponto: 'bg-mata' },
]

export const CHECKLIST_PADRAO: Record<TipoCompromisso, string[]> = {
  atendimento_campo: ['Levar bateria reserva', 'Conferir bicos', 'Teste de vazão com água', 'Fotografar número de série'],
  manutencao_oficina: ['Separar peças da OS', 'Fotografar antes e depois', 'Teste em bancada'],
  entrega: ['Conferir etiqueta do QR', 'Imprimir relatório', 'Coletar assinatura'],
  treinamento: ['Levar apostila impressa', 'Separar 2 baterias de treino', 'Conferir lista de presença'],
  revisao_programada: ['Levar graxa e parafusos de hélice', 'Conferir bicos', 'Atualizar firmware'],
  outro: [],
}

export const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-11-11" no fuso local. */
export function chaveDia(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}
export const horaDe = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
export const faixaHora = (c: Compromisso) => `${horaDe(c.inicio)} às ${horaDe(c.fim)}`

/** Valor para <input type="datetime-local">. */
export function paraDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  return `${chaveDia(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const deDatetimeLocal = (v: string) => new Date(v).toISOString()

export function inicioSemana(d: Date): Date {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  const dow = (x.getDay() + 6) % 7 // segunda = 0
  x.setDate(x.getDate() - dow)
  return x
}
export function somarDias(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const nomeDia = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
export const diaLongo = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
/** "qui, 13/11 às 08:00" */
export function quando(iso: string): string {
  const d = new Date(iso)
  return `${nomeDia(d)}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${horaDe(iso)}`
}
export const pendente = (c: Compromisso) => c.status === 'agendado' || c.status === 'em_andamento'
