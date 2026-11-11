import type { CategoriaProduto, GrupoDiagrama, ModeloDrone, Produto } from '@/types'
import { criarPRNG } from './util'

export const MODELOS: ModeloDrone[] = [
  { id: 't20p', nome: 'T20P', rotores: 4, tanqueL: 20, ano: 2022 },
  { id: 't25', nome: 'T25', rotores: 4, tanqueL: 20, ano: 2023 },
  { id: 't30', nome: 'T30', rotores: 4, tanqueL: 30, ano: 2021 },
  { id: 't40', nome: 'T40', rotores: 8, tanqueL: 40, ano: 2023 },
  { id: 't50', nome: 'T50', rotores: 4, tanqueL: 40, ano: 2024 },
  { id: 't55', nome: 'T55', rotores: 4, tanqueL: 50, ano: 2025 },
  { id: 't70p', nome: 'T70P', rotores: 8, tanqueL: 70, ano: 2025 },
  { id: 't100', nome: 'T100', rotores: 8, tanqueL: 100, ano: 2025 },
]

type Linha = [
  slug: string, nome: string, cat: CategoriaProduto, grupo: GrupoDiagrama | undefined,
  modelos: string, custo: number, mult: number, estoque: number, minimo: number,
  pesoG: number, dim: string, ncm: string, forn: string,
]

const F1 = 'Aerotec Distribuição'
const F2 = 'Agridrone Importação'
const F3 = 'Sulpeças Aeronáuticas'
const F4 = 'Nordeste Componentes'

// slug, nome, categoria, grupo, modelos, custo, multiplicador, estoque, mínimo, peso g, CxLxA cm, NCM, fornecedor
const PECAS: Linha[] = [
  ['mot-t40', 'Motor 80100 (T40)', 'Propulsão', 'motor', 't40', 1180, 1.6, 6, 4, 620, '12x12x9', '8501.31.10', F2],
  ['mot-t50', 'Motor de propulsão T50', 'Propulsão', 'motor', 't50', 1420, 1.6, 2, 4, 680, '13x13x9', '8501.31.10', F2],
  ['mot-t25', 'Motor 6215 (T25/T30)', 'Propulsão', 'motor', 't25,t30', 890, 1.65, 5, 3, 480, '11x11x8', '8501.31.10', F2],
  ['mot-t20p', 'Motor 5016 (T20P)', 'Propulsão', 'motor', 't20p', 640, 1.7, 0, 2, 390, '10x10x8', '8501.31.10', F3],
  ['mot-t70p', 'Motor de propulsão T70P/T100', 'Propulsão', 'motor', 't70p,t100', 1980, 1.55, 4, 4, 830, '14x14x10', '8501.31.10', F2],
  ['hel-t40', 'Hélices 62 pol. par CW/CCW (T40/T50)', 'Propulsão', 'helice', 't40,t50', 310, 1.9, 28, 12, 220, '85x12x4', '8803.30.00', F2],
  ['hel-t25', 'Hélices 54 pol. par CW/CCW (T25/T30)', 'Propulsão', 'helice', 't25,t30', 240, 1.9, 22, 10, 190, '74x11x4', '8803.30.00', F2],
  ['hel-t20p', 'Hélices 48 pol. par CW/CCW (T20P)', 'Propulsão', 'helice', 't20p', 180, 1.95, 9, 6, 160, '66x10x3', '8803.30.00', F3],
  ['hel-t70p', 'Hélices 70 pol. par CW/CCW (T55/T70P/T100)', 'Propulsão', 'helice', 't55,t70p,t100', 420, 1.85, 14, 8, 290, '96x13x5', '8803.30.00', F2],
  ['esc-t40', 'ESC do motor T40', 'Propulsão', 'esc', 't40', 760, 1.7, 5, 3, 140, '9x6x3', '8537.10.90', F2],
  ['esc-t50', 'ESC do motor T50', 'Propulsão', 'esc', 't50', 840, 1.7, 3, 3, 150, '9x6x3', '8537.10.90', F2],
  ['esc-t25', 'ESC (T25/T30)', 'Propulsão', 'esc', 't25,t30', 590, 1.7, 7, 3, 120, '8x5x3', '8537.10.90', F3],
  ['braco-t40', 'Braço dobrável T40 (conjunto)', 'Estrutura', 'braco', 't40', 1650, 1.55, 3, 2, 940, '60x14x12', '8803.30.00', F2],
  ['braco-t50', 'Braço dobrável T50 (conjunto)', 'Estrutura', 'braco', 't50', 1890, 1.55, 2, 2, 980, '62x14x12', '8803.30.00', F2],
  ['braco-t25', 'Braço dobrável (T25/T30)', 'Estrutura', 'braco', 't25,t30', 1320, 1.6, 4, 2, 780, '55x13x11', '8803.30.00', F3],
  ['braco-t70p', 'Braço dobrável T70P/T100', 'Estrutura', 'braco', 't70p,t100', 2350, 1.5, 2, 2, 1250, '70x16x14', '8803.30.00', F2],
  ['parafuso-helice', 'Parafuso de hélice M5 (pacote com 10)', 'Propulsão', undefined, 't25,t30,t40,t50', 38, 3.2, 120, 40, 25, '6x4x2', '7318.15.00', F4],
  ['parafuso-helice-g', 'Parafuso de hélice M6 (pacote com 10)', 'Propulsão', undefined, 't70p,t100,t55', 52, 3.1, 60, 30, 38, '6x4x2', '7318.15.00', F4],
  ['bomba-t25', 'Bomba peristáltica (T25/T30)', 'Pulverização', 'bomba', 't25,t30', 540, 1.8, 8, 4, 310, '14x9x9', '8413.50.90', F2],
  ['bomba-t40', 'Bomba de pulverização (T40/T50)', 'Pulverização', 'bomba', 't40,t50', 690, 1.8, 11, 5, 420, '16x10x10', '8413.50.90', F2],
  ['bomba-t70p', 'Bomba de pulverização T70P/T100', 'Pulverização', 'bomba', 't70p,t100,t55', 980, 1.75, 4, 3, 560, '18x11x11', '8413.50.90', F2],
  ['bico-t40', 'Bico centrífugo (T40/T50)', 'Pulverização', 'bico', 't40,t50', 410, 1.85, 18, 8, 150, '12x8x8', '8424.89.90', F2],
  ['bico-t25', 'Bico centrífugo (T25/T30)', 'Pulverização', 'bico', 't25,t30', 340, 1.9, 13, 8, 130, '11x7x7', '8424.89.90', F2],
  ['bico-t70p', 'Bico centrífugo (T55/T70P/T100)', 'Pulverização', 'bico', 't55,t70p,t100', 520, 1.8, 6, 6, 190, '13x9x9', '8424.89.90', F2],
  ['bico-leque', 'Bico de leque de reposição (T20P/T25)', 'Pulverização', 'bico', 't20p,t25', 95, 2.4, 40, 15, 40, '5x4x4', '8424.89.90', F4],
  ['mangueira', 'Mangueira de silicone 8 mm (metro)', 'Pulverização', undefined, 't25,t30,t40,t50,t55', 22, 2.8, 85, 30, 60, '100x4x4', '3917.39.00', F4],
  ['tanque-t40', 'Tanque de calda 40 L (T40)', 'Pulverização', 'tanque', 't40', 1450, 1.5, 3, 2, 3800, '60x40x30', '3926.90.90', F2],
  ['tanque-t50', 'Tanque de calda 40 L (T50)', 'Pulverização', 'tanque', 't50', 1580, 1.5, 2, 2, 3900, '60x40x30', '3926.90.90', F2],
  ['tanque-t25', 'Tanque de calda 20 L (T25)', 'Pulverização', 'tanque', 't25', 990, 1.55, 4, 2, 2400, '50x35x26', '3926.90.90', F3],
  ['filtro-tanque', 'Filtro do tanque (T25 a T50)', 'Pulverização', undefined, 't25,t30,t40,t50', 48, 3, 36, 15, 35, '8x8x6', '8421.99.99', F4],
  ['conector-rapido', 'Conector rápido de pulverização', 'Pulverização', undefined, 't25,t30,t40,t50,t55', 36, 3, 44, 20, 30, '6x4x4', '3917.40.00', F4],
  ['trem-t40', 'Trem de pouso T40 (par)', 'Estrutura', 'trem', 't40', 520, 1.7, 6, 3, 690, '55x12x10', '8803.30.00', F2],
  ['trem-t25', 'Trem de pouso (T25/T30, par)', 'Estrutura', 'trem', 't25,t30', 430, 1.7, 7, 3, 600, '50x11x9', '8803.30.00', F3],
  ['trem-t50', 'Trem de pouso T50 (par)', 'Estrutura', 'trem', 't50', 560, 1.7, 0, 3, 710, '56x12x10', '8803.30.00', F2],
  ['radar-frontal', 'Radar frontal (T40/T50)', 'Sensores', 'radar', 't40,t50', 1380, 1.6, 3, 2, 210, '10x8x4', '8526.10.90', F2],
  ['radar-traseiro', 'Radar traseiro (T40/T50)', 'Sensores', 'radar', 't40,t50', 1290, 1.6, 4, 2, 200, '10x8x4', '8526.10.90', F2],
  ['radar-t25', 'Radar de obstáculos (T25/T30)', 'Sensores', 'radar', 't25,t30', 1050, 1.65, 3, 2, 180, '9x7x4', '8526.10.90', F3],
  ['camera-fpv', 'Câmera FPV (T25 a T50)', 'Sensores', 'camera', 't25,t30,t40,t50', 560, 1.8, 7, 3, 85, '7x6x5', '8525.89.29', F2],
  ['camera-fpv-g', 'Câmera FPV (T55/T70P/T100)', 'Sensores', 'camera', 't55,t70p,t100', 720, 1.75, 2, 2, 95, '7x6x5', '8525.89.29', F2],
  ['placa-t40', 'Placa controladora de voo T40', 'Eletrônica', 'placa', 't40', 2850, 1.45, 2, 2, 160, '12x9x3', '8537.10.90', F2],
  ['placa-t50', 'Placa controladora de voo T50', 'Eletrônica', 'placa', 't50', 3150, 1.45, 1, 2, 165, '12x9x3', '8537.10.90', F2],
  ['placa-dist', 'Placa de distribuição de energia (T40/T50)', 'Eletrônica', 'placa', 't40,t50', 980, 1.6, 4, 2, 190, '14x10x2', '8537.10.90', F2],
  ['conector-xt90', 'Conector de bateria XT90 (par)', 'Eletrônica', undefined, 't25,t30,t40,t50,t55', 42, 3, 30, 12, 35, '5x4x3', '8536.69.90', F4],
  ['bat-db800', 'Bateria inteligente DB800', 'Energia', 'bateria', 't25,t30', 6900, 1.35, 6, 4, 9800, '32x18x18', '8507.60.00', F2],
  ['bat-db1560', 'Bateria inteligente DB1560', 'Energia', 'bateria', 't40,t50', 11800, 1.32, 5, 4, 12700, '34x20x19', '8507.60.00', F2],
  ['bat-db2160', 'Bateria inteligente DB2160', 'Energia', 'bateria', 't55,t70p,t100', 15900, 1.3, 3, 3, 16100, '38x22x20', '8507.60.00', F2],
  ['carregador-t25', 'Carregador de bateria rápido (DB800)', 'Energia', 'carregador', 't25,t30', 3800, 1.4, 2, 2, 4200, '30x20x12', '8504.40.90', F2],
  ['carregador-t40', 'Carregador de bateria rápido (DB1560/DB2160)', 'Energia', 'carregador', 't40,t50,t55,t70p,t100', 5400, 1.4, 3, 2, 5600, '34x22x14', '8504.40.90', F2],
  ['controle', 'Controle remoto com tela (T25 a T100)', 'Eletrônica', 'controle', 't25,t30,t40,t50,t55,t70p,t100', 4200, 1.4, 4, 2, 1180, '28x18x9', '8526.92.00', F2],
  ['bat-wb37', 'Bateria WB37 do controle remoto', 'Energia', 'bateria', 't20p,t25,t30', 520, 1.8, 9, 4, 280, '10x6x3', '8507.60.00', F2],
]

const ACESS: Linha[] = [
  ['rtk-base', 'Base D-RTK 3 com tripé', 'Acessórios', undefined, 't40,t50,t55,t70p,t100', 9800, 1.3, 3, 2, 3100, '40x30x22', '9015.10.00', F2],
  ['rtk-relay', 'Relay D-RTK 3', 'Acessórios', undefined, 't40,t50,t55,t70p,t100', 6200, 1.3, 2, 2, 1700, '30x22x16', '9015.10.00', F2],
  ['misturador-170', 'Misturador de calda 170 L', 'Acessórios', undefined, '', 5900, 1.4, 3, 1, 62000, '90x80x120', '8479.82.00', F1],
  ['misturador-300', 'Misturador de calda 300 L', 'Acessórios', undefined, '', 8700, 1.4, 2, 1, 88000, '110x95x130', '8479.82.00', F1],
  ['misturador-600', 'Misturador de calda 600 L', 'Acessórios', undefined, '', 13900, 1.4, 1, 1, 142000, '140x110x150', '8479.82.00', F1],
  ['dispersor', 'Dispersor de sólidos (T40/T50)', 'Acessórios', undefined, 't40,t50', 4300, 1.45, 3, 1, 4600, '60x45x40', '8432.40.00', F2],
  ['gerador', 'Gerador 15 kVA diesel', 'Acessórios', undefined, '', 38000, 1.25, 1, 1, 310000, '170x80x110', '8502.13.90', F1],
  ['maleta', 'Maleta rígida de transporte de bateria', 'Acessórios', undefined, 't40,t50,t55,t70p,t100', 780, 1.8, 5, 2, 6400, '55x40x30', '4202.12.20', F4],
  ['kit-vedacao', 'Kit de vedação e o-rings de pulverização', 'Acessórios', undefined, 't25,t30,t40,t50,t55', 64, 2.8, 52, 20, 120, '12x8x4', '4016.93.00', F4],
]

const DRONES: [string, string, string, number, number, number, string, string][] = [
  ['drone-t25', 'Kit completo Agras T25', 't25', 61000, 78900, 35000, '95x80x60', '8806.29.00'],
  ['drone-t40', 'Kit completo Agras T40', 't40', 98000, 124900, 52000, '115x95x70', '8806.29.00'],
  ['drone-t50', 'Kit completo Agras T50', 't50', 118000, 148000, 56000, '115x95x70', '8806.29.00'],
  ['drone-t55', 'Kit completo Agras T55', 't55', 132000, 163500, 60000, '120x100x72', '8806.29.00'],
  ['drone-t70p', 'Kit completo Agras T70P', 't70p', 148000, 179900, 68000, '130x105x75', '8806.29.00'],
  ['drone-t100', 'Kit completo Agras T100', 't100', 158000, 189900, 78000, '140x110x80', '8806.29.00'],
]

const SIGLA: Record<string, string> = {
  motor: 'MOT', helice: 'HEL', braco: 'BRA', esc: 'ESC', tanque: 'TAN', bomba: 'BOM', bico: 'BIC', radar: 'RAD',
  bateria: 'BAT', trem: 'TRE', camera: 'CAM', placa: 'PLA', controle: 'CTR', carregador: 'CAR',
}
const SIGLA_CAT: Record<string, string> = {
  Propulsão: 'PRP', Pulverização: 'PUL', Estrutura: 'EST', Eletrônica: 'ELE', Energia: 'ENE', Sensores: 'SEN', Acessórios: 'ACE', Drones: 'DRO',
}

export function idProduto(slug: string) { return `prd-${slug}` }

function dim(s: string) { const [c, l, a] = s.split('x').map(Number); return { c, l, a } }

export function criarProdutos(): Produto[] {
  const r = criarPRNG(7)
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const alfa = () => letras[r.int(0, letras.length - 1)]
  const dig = (n: number) => Array.from({ length: n }, () => r.int(0, 9)).join('')
  const serial = (formato: number) => {
    if (formato === 0) return `${r.int(10, 99)}${alfa()}${alfa()}${alfa()}${r.int(1, 9)}S${dig(3)}${alfa()}${alfa()}${r.int(1, 9)}${alfa()}`.slice(0, 14)
    if (formato === 1) return `${r.int(10, 99)}${alfa()}${alfa()}${alfa()}${alfa()}${dig(8)}`
    return `${r.int(1000, 1999)}${alfa()}${dig(3)}${alfa()}${r.int(1, 9)}${dig(2)}${alfa()}${dig(4)}${alfa()}`.slice(0, 20)
  }
  const codFab = (n: number) => `YC.DJ.SS00${dig(4)}.0${(n % 9) + 1}`
  const lista: Produto[] = []
  let n = 0
  const sufModelo = (m: string) => {
    const ms = m.split(',')
    return ms.length === 1 ? ms[0].toUpperCase() : ms[0].toUpperCase().replace(/P$/, '') + 'X'
  }
  const contagem: Record<string, number> = {}

  for (const [slug, nome, cat, grupo, modelos, custo, mult, estoque, minimo, pesoG, d, ncm, forn] of [...PECAS, ...ACESS]) {
    n++
    const sigla = grupo ? SIGLA[grupo] : SIGLA_CAT[cat]
    const suf = modelos ? sufModelo(modelos) : 'UNI'
    const chave = `${sigla}-${suf}`
    contagem[chave] = (contagem[chave] ?? 0) + 1
    const serializavel = (grupo === 'bateria' && slug.startsWith('bat-db')) || grupo === 'controle'
    lista.push({
      id: idProduto(slug),
      sku: `AER-${sigla}-${suf}-${String(contagem[chave]).padStart(2, '0')}`,
      codigoFabricante: codFab(n),
      nome, categoria: cat,
      tipo: cat === 'Acessórios' ? 'acessorio' : 'peca',
      modelosCompativeis: modelos ? modelos.split(',') : [],
      grupo,
      custo, preco: Math.round((custo * mult) / 5) * 5 - 0.1,
      estoque, estoqueMinimo: minimo,
      pesoG, dimensoesCm: dim(d), ncm,
      localizacao: `Prateleira ${'ABCDE'[n % 5]}${(n % 7) + 1}`,
      fornecedor: forn,
      controlaSerial: serializavel,
      seriais: serializavel ? Array.from({ length: Math.min(estoque, 3) }, () => serial(r.int(0, 1))) : [],
    })
  }
  DRONES.forEach(([slug, nome, modelo, custo, preco, pesoG, d, ncm], i) => {
    const estoque = [2, 1, 3, 1, 2, 1][i]
    lista.push({
      id: idProduto(slug),
      sku: `AER-DRO-${modelo.toUpperCase()}-01`,
      codigoFabricante: codFab(i + 3),
      nome, categoria: 'Drones', tipo: 'drone',
      modelosCompativeis: [modelo],
      custo, preco, estoque, estoqueMinimo: 1,
      pesoG, dimensoesCm: dim(d), ncm,
      localizacao: `Depósito - ${['Barra da Estiva', 'Santa Maria', 'Cruz Alta'][i % 3]}`,
      fornecedor: F2,
      controlaSerial: true,
      seriais: Array.from({ length: estoque }, (_, k) => serial(k % 3)),
      observacao: 'Kit com aeronave, controle remoto, 3 baterias, carregador e maleta.',
    })
  })
  // seriais fixos (usados na simulação de leitura de QR)
  lista.find((p) => p.id === idProduto('drone-t40'))!.seriais[0] = '58FBK5S001DKQ7'
  lista.find((p) => p.id === idProduto('drone-t25'))!.seriais[0] = '64UBLA90031127'
  lista.find((p) => p.id === idProduto('drone-t50'))!.seriais[0] = '1581F674B225M002148D'
  return lista
}

/** Produtos sem nenhuma saída nos últimos 90 dias (parados). */
export const SLUGS_PARADOS = ['bico-leque', 'mot-t20p', 'hel-t20p', 'bat-wb37', 'radar-t25', 'tanque-t25', 'carregador-t25', 'misturador-600', 'gerador', 'braco-t25', 'dispersor']
/** Produtos de alto giro (concentram saídas). */
export const SLUGS_GIRO = ['hel-t40', 'hel-t25', 'hel-t70p', 'bico-t40', 'bico-t25', 'bico-t70p', 'parafuso-helice', 'parafuso-helice-g', 'bomba-t40', 'bomba-t25', 'mangueira', 'filtro-tanque', 'conector-rapido', 'kit-vedacao']
