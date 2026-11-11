// Utilitários de dados fictícios: PRNG determinístico e datas relativas a hoje.
export function criarPRNG(semente: number) {
  let s = semente >>> 0
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    rand,
    int: (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min,
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)],
    chance: (p: number) => rand() < p,
  }
}
export type PRNG = ReturnType<typeof criarPRNG>

function base(): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d
}
/** ISO de n dias atrás (meio-dia local); `hora` ajusta a hora do dia. */
export function diasAtras(n: number, hora = 12, min = 0): string {
  const d = base()
  d.setDate(d.getDate() - n)
  d.setHours(hora, min, 0, 0)
  return d.toISOString()
}
export function diasAFrente(n: number, hora = 12, min = 0): string {
  return diasAtras(-n, hora, min)
}
