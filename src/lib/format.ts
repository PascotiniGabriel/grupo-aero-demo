const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNum = new Intl.NumberFormat('pt-BR')

export const brl = (n: number) => fmtBRL.format(Number.isFinite(n) ? n : 0)
export const numero = (n: number, casas?: number) =>
  casas === undefined ? fmtNum.format(n) : n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function dataCurta(iso: string | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export function dataHora(iso: string | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/** "há 3 dias", "hoje", "amanhã", "em 5 dias". */
export function relativo(iso: string | undefined): string {
  if (!iso) return '-'
  const dias = Math.round((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias === -1) return 'amanhã'
  if (dias > 0) {
    if (dias < 30) return `há ${dias} dias`
    if (dias < 365) { const m = Math.round(dias / 30); return `há ${m} ${m === 1 ? 'mês' : 'meses'}` }
    const a = Math.round(dias / 365); return `há ${a} ${a === 1 ? 'ano' : 'anos'}`
  }
  const f = -dias
  if (f < 30) return `em ${f} dias`
  const m = Math.round(f / 30)
  return `em ${m} ${m === 1 ? 'mês' : 'meses'}`
}

/** 220 g, 1,4 kg. */
export function peso(g: number): string {
  if (g < 1000) return `${Math.round(g)} g`
  return `${(g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
}

export function normalizar(texto: string): string {
  return (texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
