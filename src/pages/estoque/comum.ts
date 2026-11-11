import type { CategoriaProduto, GrupoDiagrama, Produto } from '@/types'

export const CATEGORIAS: CategoriaProduto[] = ['Propulsão', 'Pulverização', 'Estrutura', 'Eletrônica', 'Energia', 'Sensores', 'Acessórios', 'Drones']

export const GRUPOS: Record<GrupoDiagrama, string> = {
  tanque: 'Tanque de calda', bomba: 'Bomba', bico: 'Bicos e mangueiras', braco: 'Braços', motor: 'Motores',
  helice: 'Hélices', esc: 'ESC dos motores', placa: 'Placa controladora', radar: 'Radares', camera: 'Câmera FPV',
  bateria: 'Bateria', trem: 'Trem de pouso', controle: 'Controle remoto', carregador: 'Carregador',
}
export const ORDEM_GRUPOS = Object.keys(GRUPOS) as GrupoDiagrama[]

export const FAMILIAS: { rotulo: string; ids: string[] }[] = [
  { rotulo: 'T20P a T30', ids: ['t20p', 't25', 't30'] },
  { rotulo: 'T40 e T50', ids: ['t40', 't50'] },
  { rotulo: 'T55 a T100', ids: ['t55', 't70p', 't100'] },
]

const SIGLA_GRUPO: Record<string, string> = {
  motor: 'MOT', helice: 'HEL', braco: 'BRA', esc: 'ESC', tanque: 'TAN', bomba: 'BOM', bico: 'BIC', radar: 'RAD',
  bateria: 'BAT', trem: 'TRE', camera: 'CAM', placa: 'PLA', controle: 'CTR', carregador: 'CAR',
}
const SIGLA_CAT: Record<string, string> = {
  Propulsão: 'PRP', Pulverização: 'PUL', Estrutura: 'EST', Eletrônica: 'ELE', Energia: 'ENE', Sensores: 'SEN', Acessórios: 'ACE', Drones: 'DRO',
}

export function tipoDaCategoria(c: CategoriaProduto): Produto['tipo'] {
  return c === 'Acessórios' ? 'acessorio' : c === 'Drones' ? 'drone' : 'peca'
}

/** Sugere um SKU no padrão AER-<grupo>-<modelo>-NN que ainda não existe. */
export function sugerirSku(categoria: CategoriaProduto, grupo: GrupoDiagrama | '', modelos: string[], produtos: Produto[]): string {
  const sigla = grupo ? SIGLA_GRUPO[grupo] : SIGLA_CAT[categoria]
  const suf = modelos.length === 0 ? 'UNI' : modelos.length === 1 ? modelos[0].toUpperCase() : modelos[0].toUpperCase().replace(/P$/, '') + 'X'
  const prefixo = `AER-${sigla}-${suf}-`
  let n = produtos.filter((p) => p.sku.startsWith(prefixo)).length + 1
  while (produtos.some((p) => p.sku === `${prefixo}${String(n).padStart(2, '0')}`)) n++
  return `${prefixo}${String(n).padStart(2, '0')}`
}

export const ehExclusiva = (p: Produto) => p.modelosCompativeis.length === 1

/** Peso cubado (kg) pela regra de 6000 cm³/kg usada por transportadoras. */
export const pesoCubadoKg = (p: Produto) => (p.dimensoesCm.c * p.dimensoesCm.l * p.dimensoesCm.a) / 6000

export function situacaoEstoque(p: Produto): 'zerado' | 'abaixo' | 'ok' {
  return p.estoque === 0 ? 'zerado' : p.estoque < p.estoqueMinimo ? 'abaixo' : 'ok'
}

export function paraNumero(s: string): number {
  const n = Number(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
