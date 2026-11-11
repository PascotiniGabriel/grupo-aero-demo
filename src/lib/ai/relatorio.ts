import type { Cliente, Equipamento, ItemComercial, ModeloDrone, OrdemServico, Produto, RelatorioOS, Servico } from '@/types'
import { dataCurta, normalizar, numero } from '../format'
import { chamarGemini, esperar, iaReal, similaridade } from './index'

export type SecaoRelatorio = 'resumo' | 'condicaoChegada' | 'diagnostico' | 'servicosExecutados' | 'testes' | 'recomendacoes'

export interface ContextoRelatorio {
  os: OrdemServico
  cliente?: Cliente
  equipamento?: Equipamento
  modelo?: ModeloDrone
  produtos: Produto[]
  servicos: Servico[]
  /** Anotações livres, palavras-chave ou texto ditado pelo técnico. */
  notas: string
}

const CHAVES: SecaoRelatorio[] = ['resumo', 'condicaoChegada', 'diagnostico', 'servicosExecutados', 'testes', 'recomendacoes']

/* ---------- utilidades de texto ---------- */

const cap = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)
const minuscula = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t)
const unicos = <T,>(l: T[]) => Array.from(new Set(l))

function lista(itens: string[]): string {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}
function semPonto(t: string) { return t.trim().replace(/[.\s]+$/, '') }
function frases(t: string): string[] { return t.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean) }

/* ---------- vocabulário do domínio ---------- */

interface Comp { id: string; nome: string; plural: string; g: 'o' | 'a'; re: RegExp; itemRe: RegExp }

const COMPS: Comp[] = [
  { id: 'braco', nome: 'braço', plural: 'braços', g: 'o', re: /\bbracos?\b/, itemRe: /braco/ },
  { id: 'motor', nome: 'motor', plural: 'motores', g: 'o', re: /\bmotor(es)?\b/, itemRe: /motor/ },
  { id: 'helice', nome: 'hélice', plural: 'hélices', g: 'a', re: /\bhelices?\b/, itemRe: /helice/ },
  { id: 'esc', nome: 'ESC (controlador do motor)', plural: 'ESCs (controladores dos motores)', g: 'o', re: /\bescs?\b|\bcontroladore?s?\b/, itemRe: /\besc\b|controlador/ },
  { id: 'bomba', nome: 'bomba de pulverização', plural: 'bombas de pulverização', g: 'a', re: /\bbombas?\b/, itemRe: /bomba/ },
  { id: 'bico', nome: 'bico', plural: 'bicos', g: 'o', re: /\bbicos?\b/, itemRe: /bico/ },
  { id: 'radar', nome: 'radar', plural: 'radares', g: 'o', re: /\bradar(es)?\b/, itemRe: /radar/ },
  { id: 'bateria', nome: 'bateria', plural: 'baterias', g: 'a', re: /\bbaterias?\b/, itemRe: /bateria/ },
  { id: 'conector', nome: 'conector', plural: 'conectores', g: 'o', re: /\bconectore?s?\b|\bchicotes?\b/, itemRe: /conector|chicote|plugue/ },
  { id: 'mangueira', nome: 'mangueira', plural: 'mangueiras', g: 'a', re: /\bmangueiras?\b/, itemRe: /mangueira/ },
  { id: 'trem', nome: 'trem de pouso', plural: 'trens de pouso', g: 'o', re: /\btrem\b|\bpe de pouso|\bpernas? de pouso/, itemRe: /trem|pouso/ },
]

const adj = (radical: string, c: Comp, pl: boolean) => `${radical}${c.g === 'a' ? 'a' : 'o'}${pl ? 's' : ''}`

function refComp(c: Comp, nums: string[], plural = false): { txt: string; pl: boolean } {
  if (nums.length === 0 && plural) return { txt: `${c.g === 'a' ? 'as' : 'os'} ${c.plural}`, pl: true }
  if (nums.length === 0) return { txt: `${c.g === 'a' ? 'a' : 'o'} ${c.nome}`, pl: false }
  if (nums.length === 1) return { txt: `${c.g === 'a' ? 'a' : 'o'} ${c.nome} ${nums[0]}`, pl: false }
  return { txt: `${c.g === 'a' ? 'as' : 'os'} ${c.plural} ${lista(nums)}`, pl: true }
}

function posicoes(c: Comp, clausula: string): string[] {
  const re = new RegExp(`(?:${c.re.source})\\s*(?:n[o°º.]?\\s*)?(\\d)`, 'g')
  const out: string[] = []
  for (const m of clausula.matchAll(re)) out.push(m[m.length - 1])
  return unicos(out)
}

interface Achado {
  id: string
  re: RegExp
  comp?: Comp
  visivel?: boolean
  /** Frase completa do que foi constatado. */
  frase: (ref: string, pl: boolean, m: string, c?: Comp) => string
  /** Expressão curta para o resumo. */
  curto: (ref: string, pl: boolean, m: string, c?: Comp) => string
  efeito?: string
  rec?: string
}

const comp = (id: string) => COMPS.find((c) => c.id === id)!

const ACHADOS: Achado[] = [
  {
    id: 'braco', comp: comp('braco'), visivel: true,
    re: /braco[^,;.]{0,30}(trinc|rachad|quebr|empen|danific|torto)|(trinc|rachad|quebr|empen|danific)[^,;.]{0,30}braco/,
    frase: (r, pl, m, c) => `${r} ${pl ? 'estavam' : 'estava'} ${/quebr/.test(m) ? adj('quebrad', c!, pl) : /empen|torto/.test(m) ? adj('empenad', c!, pl) : adj('trincad', c!, pl)}, com perda de rigidez na estrutura`,
    curto: (r, pl, m, c) => `${r.replace(/^(o|a|os|as) /, '')} ${/quebr/.test(m) ? adj('quebrad', c!, pl) : /empen|torto/.test(m) ? adj('empenad', c!, pl) : adj('trincad', c!, pl)}`,
    efeito: 'A falha compromete o conjunto de propulsão e impede a operação segura do equipamento.',
    rec: 'Reapertar os parafusos dos braços após o primeiro dia de operação e evitar decolar com carga máxima nas primeiras horas de uso.',
  },
  {
    id: 'motor_trava', comp: comp('motor'),
    re: /motor[^,;.]{0,25}(trav|tranc|preso|agarr|duro|dura)|(trav|tranc)[^,;.]{0,25}motor/,
    frase: (r, pl) => `${r} ${pl ? 'apresentavam' : 'apresentava'} giro irregular, travando durante a rotação`,
    curto: (r, pl) => `${r.replace(/^(o|a|os|as) /, '')} ${pl ? 'travando' : 'travando'}`,
    efeito: 'O defeito indica desgaste de rolamento ou resíduo no rotor e causa perda de empuxo e instabilidade em voo.',
    rec: 'Manter os motores livres de poeira e resíduos de calda; qualquer ruído ou resistência no giro deve ser avaliado antes da próxima operação.',
  },
  {
    id: 'motor_quente', comp: comp('motor'),
    re: /motor[^,;.]{0,25}(superaquec|esquent|quente|aquec)/,
    frase: (r, pl) => `${r} ${pl ? 'apresentavam' : 'apresentava'} superaquecimento nos testes de bancada`,
    curto: (r) => `superaquecimento ${r.replace(/^o /, 'no ').replace(/^os /, 'nos ')}`,
    efeito: 'O sintoma é compatível com sobrecarga, atrito interno ou ventilação insuficiente.',
  },
  {
    id: 'motor_ruido', comp: comp('motor'),
    re: /motor[^,;.]{0,25}(ruido|barulho|vibr|zunid)/,
    frase: (r, pl) => `${r} ${pl ? 'apresentavam' : 'apresentava'} ruído e vibração acima do normal`,
    curto: (r) => `ruído e vibração ${r.replace(/^o /, 'no ').replace(/^os /, 'nos ')}`,
    efeito: 'O quadro sugere rolamento desgastado ou rotor desbalanceado.',
  },
  {
    id: 'helice', comp: comp('helice'), visivel: true,
    re: /helice[^,;.]{0,25}(lasc|quebr|trinc|dano|racha|empen|torta|ponta)|(lasc|quebr|trinc|racha)[^,;.]{0,25}helice/,
    frase: (r, pl, m, c) => `${r} ${pl ? 'estavam' : 'estava'} ${/quebr/.test(m) ? adj('quebrad', c!, pl) : adj('lascad', c!, pl)}`,
    curto: (r, pl, m, c) => `${r.replace(/^(o|a|os|as) /, '')} ${/quebr/.test(m) ? adj('quebrad', c!, pl) : adj('lascad', c!, pl)}`,
    efeito: 'Hélice danificada gera desbalanceamento, vibração e perda de eficiência.',
  },
  {
    id: 'esc', comp: comp('esc'),
    re: /\bescs?\b[^,;.]{0,25}(queim|pifou|falh|dano)|(queim|pifou)[^,;.]{0,25}\bescs?\b|controlador[^,;.]{0,25}queim/,
    frase: (r, pl) => `${r} ${pl ? 'apresentavam' : 'apresentava'} sinais de queima, sem comando do motor`,
    curto: (r, pl, _m, c) => `${r.replace(/^(o|a|os|as) /, '')} ${adj('queimad', c!, pl)}`,
    efeito: 'A falha do controlador interrompe a alimentação do motor e pode provocar queda em voo.',
  },
  {
    id: 'bomba', comp: comp('bomba'),
    re: /bomba[^,;.]{0,30}(sem pressao|pressao baixa|baixa pressao|nao (bombe|pux|suga|empurr)|fraca|falh|travad|queim)|(sem pressao|pressao baixa)[^,;.]{0,25}bomba/,
    frase: (r) => `${r} operava sem pressão adequada, com vazão abaixo da especificação`,
    curto: (r) => `pressão insuficiente ${r.replace(/^a /, 'na ')}`,
    efeito: 'A baixa pressão prejudica a uniformidade da aplicação e pode indicar desgaste do diafragma ou entrada de ar.',
    rec: 'Fazer a lavagem completa do circuito de calda ao fim de cada jornada para preservar a bomba.',
  },
  {
    id: 'vazamento',
    re: /vazament|vazando|\bvaza\b|pingando|escorrendo/,
    frase: () => 'Foi constatado vazamento no circuito de pulverização, com perda de calda nas conexões',
    curto: () => 'vazamento no circuito de pulverização',
    efeito: 'O vazamento reduz a vazão efetiva e pode atingir a eletrônica próxima.',
    rec: 'Conferir conexões e mangueiras do circuito de calda nas primeiras aplicações após o reparo.',
  },
  {
    id: 'bico', comp: comp('bico'),
    re: /bicos?[^,;.]{0,25}(entup|obstru|sujo|tamp|incrust)|entup/,
    frase: (r, pl, _m, c) => `${r} ${pl ? 'estavam' : 'estava'} ${adj('entupid', c!, pl)} por resíduo de calda seca`,
    curto: (r, pl, _m, c) => `${r.replace(/^(o|a|os|as) /, '')} ${adj('entupid', c!, pl)}`,
    efeito: 'O entupimento distorce o padrão de aplicação e sobrecarrega a bomba.',
    rec: 'Limpar os bicos com água e escova macia ao fim de cada dia de aplicação; nunca usar arame ou objeto metálico para desobstruir.',
  },
  {
    id: 'radar', comp: comp('radar'),
    re: /radar[^,;.]{0,30}(falh|erro|sem leitura|nao le|dano|queim|desalinh|nao funciona)|(falh|erro)[^,;.]{0,25}radar/,
    frase: (r) => `${r} apresentava falha de leitura, sem informação confiável de altitude ou obstáculos`,
    curto: (r) => `falha ${r.replace(/^o /, 'no ')}`,
    efeito: 'Sem o radar, o equipamento perde o seguimento de terreno e a detecção de obstáculos.',
    rec: 'Manter a face do radar limpa e sem respingos de calda; recalibrar sempre que houver troca ou impacto na região.',
  },
  {
    id: 'corrosao',
    re: /corros|ferrugem|defensivo[^,;.]{0,25}(residu|acumul|atac|corro)|residuo[^,;.]{0,15}defensivo/,
    visivel: true,
    frase: () => 'Havia corrosão por resíduo de defensivo agrícola em partes metálicas e terminais',
    curto: () => 'corrosão por resíduo de defensivo',
    efeito: 'A corrosão aumenta a resistência elétrica e acelera o desgaste de conectores e parafusos.',
    rec: 'Lavar o drone com água limpa e pano úmido ao fim de cada jornada, sem jato de alta pressão, e secar antes de guardar.',
  },
  {
    id: 'conector', comp: comp('conector'),
    re: /conectore?s?[^,;.]{0,25}(oxid|corro|sujo|solto|frouxo|derret)|oxid/,
    frase: (r, pl, _m, c) => `${r} ${pl ? 'estavam' : 'estava'} ${adj('oxidad', c!, pl)}, com mau contato`,
    curto: (r, pl, _m, c) => `${r.replace(/^(o|a|os|as) /, '')} ${adj('oxidad', c!, pl)}`,
    efeito: 'O mau contato provoca falhas intermitentes e aquecimento nos terminais.',
  },
  {
    id: 'bateria', comp: comp('bateria'),
    re: /bateria[^,;.]{0,25}(estuf|inch|dilat|deform)|estufad/,
    frase: (r, pl, _m, c) => `${r} ${pl ? 'estavam' : 'estava'} ${adj('estufad', c!, pl)}, com deformação do invólucro`,
    curto: (r, pl, _m, c) => `${r.replace(/^(o|a|os|as) /, '')} ${adj('estufad', c!, pl)}`,
    efeito: 'Bateria estufada representa risco de incêndio e não deve ser carregada nem usada.',
    rec: 'Descartar a bateria estufada em ponto de coleta apropriado e armazenar as demais com carga de 50 a 60% fora do sol.',
  },
  {
    id: 'trem', comp: comp('trem'), visivel: true,
    re: /(trem|pe de pouso|perna de pouso)[^,;.]{0,25}(quebr|trinc|dano|torto|empen|solto)/,
    frase: (r, pl, _m, c) => `${r} ${pl ? 'estavam' : 'estava'} ${adj('danificad', c!, pl)} pelo impacto`,
    curto: (r, pl, _m, c) => `${r.replace(/^(o|a|os|as) /, '')} ${adj('danificad', c!, pl)}`,
    efeito: 'A estrutura de apoio comprometida afeta a decolagem e o pouso.',
  },
]

const PLURAIS = 'bracos|helices|motores|bicos|baterias|conectores|escs|mangueiras|radares'
const RE_QUEDA = /queda|caiu|cair|colis|bateu|batida|tombou|capot|acidente|impacto/
const RE_TROCA = /troqu|troc|substitu|instal|coloqu|novo|nova|repus/

/* ---------- análise das anotações ---------- */

interface Detectado { achado: Achado; nums: string[]; trecho: string; plural: boolean }
interface Troca { comp: Comp; nums: string[] }

interface Analise {
  queda: boolean
  achados: Detectado[]
  trocas: Troca[]
  reparos: string[]
  limpeza: string[]
  calibracoes: string[]
  firmware: boolean
  testeVoo: boolean | null
  testeVazao: boolean | null
  vazaoObs: boolean
}

function analisar(notas: string): Analise {
  const n = normalizar(notas)
  const clausulas = n.split(/[,;.\n]+/).map((c) => c.trim()).filter(Boolean)
  const achados: Detectado[] = []
  for (const a of ACHADOS) {
    let nums: string[] = []
    let trecho = ''
    let achou = false
    let plural = false
    for (const cl of clausulas) {
      const m = a.re.exec(cl)
      if (!m) continue
      if (/(troqu|troc|substitu|instal|coloqu)/.test(cl) && !/(trinc|quebr|queim|travad|trav|entup|lasc|oxid|estuf|rachad|empen|falh)/.test(cl)) continue
      achou = true
      trecho = trecho || m[0]
      if (a.comp) {
        nums = unicos([...nums, ...posicoes(a.comp, cl)])
        if (new RegExp(`\\b(${PLURAIS})\\b`).test(cl)) plural = true
      }
    }
    if (achou) achados.push({ achado: a, nums, trecho, plural })
  }
  // motor travando e superaquecendo: a frase de "travando" já cobre; evita duplicar o mesmo motor
  const trocas: Troca[] = []
  for (const cl of clausulas) {
    if (!RE_TROCA.test(cl)) continue
    for (const c of COMPS) if (c.re.test(cl)) {
      const existente = trocas.find((t) => t.comp.id === c.id)
      const nums = posicoes(c, cl)
      if (existente) existente.nums = unicos([...existente.nums, ...nums])
      else trocas.push({ comp: c, nums })
    }
  }
  const reparos = unicos(clausulas.filter((cl) => /(soldei|solda|reparei|reparo|colei|reforc|ressold|rebobin)/.test(cl)).map((cl) => cl))
  const limpeza: string[] = []
  if (/(limp(ei|eza)|lavei|higieniz|desentup|desobstru)/.test(n)) {
    if (/bico|entup|desentup|desobstru/.test(n)) limpeza.push('Limpeza e desobstrução dos bicos de pulverização')
    if (/(limp(ei|eza)|lavei|higieniz)[^,;.]{0,25}(geral|drone|corpo|estrutura|motor|conector|filtro)|limpeza geral|lavei/.test(n)) limpeza.push('Limpeza geral, com remoção de resíduos de calda e poeira')
    if (/filtro/.test(n)) limpeza.push('Limpeza dos filtros do circuito de calda')
    if (!limpeza.length) limpeza.push('Limpeza geral do equipamento')
  }
  const calibracoes: string[] = []
  if (/calibr/.test(n)) {
    if (/bussola|compasso/.test(n)) calibracoes.push('Calibração da bússola')
    if (/\bimu\b|acelerometro|girosc/.test(n)) calibracoes.push('Calibração da IMU (acelerômetro e giroscópio)')
    if (/calibr[^,;.]{0,20}radar|radar[^,;.]{0,20}calibr/.test(n)) calibracoes.push('Calibração do radar')
    if (/calibr[^,;.]{0,20}(vazao|bomba|fluxo)|(vazao|bomba)[^,;.]{0,20}calibr/.test(n)) calibracoes.push('Calibração da vazão da bomba')
    if (/calibr[^,;.]{0,20}camera|camera[^,;.]{0,20}calibr/.test(n)) calibracoes.push('Calibração da câmera')
    if (!calibracoes.length) calibracoes.push('Calibração dos sensores de voo')
  }
  const firmware = /firmware|atualiz(ei|ado|acao|ada)/.test(n)
  const vooMenciona = /(teste|voo)[^,;.]{0,20}voo|voo de teste|voo teste|hover|pairou|voou|testei em voo|teste de voo/.test(n)
  const vooFalha = /(voo|teste)[^,;.]{0,25}(falh|reprov|nao passou|instavel|vibr|ruim)/.test(n)
  const vazaoMenciona = /vazao|teste de (bomba|pulveriz)|teste de aplicacao|pulverizou|pressao ok/.test(n)
  const vazaoFalha = /(vazao|pulveriz|pressao)[^,;.]{0,25}(falh|reprov|nao passou|irregular|ruim|baixa)/.test(n) && /teste/.test(n)
  return {
    queda: RE_QUEDA.test(n),
    achados, trocas, reparos, limpeza, calibracoes, firmware,
    testeVoo: vooMenciona ? !vooFalha : null,
    testeVazao: vazaoMenciona ? !vazaoFalha : null,
    vazaoObs: false,
  }
}

/* ---------- geração simulada ---------- */

function pecaDoItem(os: OrdemServico, c: Comp, usados: Set<string>): ItemComercial | undefined {
  const it = os.itens.find((i) => i.tipo === 'peca' && !usados.has(i.id) && c.itemRe.test(normalizar(i.descricao)))
  if (it) usados.add(it.id)
  return it
}

function variante(ctx: ContextoRelatorio, v: number, passo = 0): number {
  return (ctx.os.numero + v + passo) % 3
}

function textoRelato(relato: string): string {
  const t = semPonto(relato)
  if (!t) return ''
  return (t.length > 220 ? `${t.slice(0, 217).trim()}...` : t)
}

function curtoDe(d: Detectado): string {
  const r = d.achado.comp ? refComp(d.achado.comp, d.nums, d.plural) : { txt: '', pl: false }
  const t = d.achado.curto(r.txt, r.pl, d.trecho, d.achado.comp)
  const c = d.achado.comp
  if (c && (t.startsWith(c.nome) || t.startsWith(c.plural))) return `${r.pl ? (c.g === 'a' ? 'as' : 'os') : c.g} ${t}`
  return t
}

function secaoChegada(ctx: ContextoRelatorio, an: Analise, v: number): string {
  const { os, equipamento } = ctx
  const relato = textoRelato(os.relatoCliente)
  const partes: string[] = []
  const horas = equipamento?.horasVoo ? `, com ${numero(equipamento.horasVoo)} horas de voo acumuladas` : ''
  const abertura = [
    `O equipamento deu entrada na oficina em ${dataCurta(os.abertura)}${horas}.`,
    `Recebido em ${dataCurta(os.abertura)}${horas}, o equipamento foi registrado e fotografado antes de qualquer intervenção.`,
    `Na entrada, em ${dataCurta(os.abertura)}${horas}, o drone foi conferido e fotografado ainda sem desmontagem.`,
  ][variante(ctx, v)]
  partes.push(abertura)
  if (relato) {
    partes.push([
      `O relato do cliente na entrada foi: "${relato}".`,
      `Relato registrado na recepção: "${relato}".`,
      `Na recepção, o cliente descreveu o problema assim: "${relato}".`,
    ][variante(ctx, v, 1)])
  }
  const visiveis = an.achados.filter((d) => d.achado.visivel)
  if (an.queda) {
    partes.push([
      'O equipamento apresentava sinais de impacto, compatíveis com queda ou colisão durante a operação.',
      'Pelas marcas na estrutura, o drone sofreu queda ou colisão antes de chegar à oficina.',
      'Havia indícios claros de impacto, o que aponta para queda ou colisão em campo.',
    ][variante(ctx, v, 2)])
  }
  if (visiveis.length) {
    const itens = visiveis.map(curtoDe)
    partes.push(`Na recepção, ${itens.length > 1 || visiveis[0].plural || visiveis[0].nums.length > 1 ? 'já eram visíveis' : 'já era visível'} ${lista(itens)}.`)
  } else if (!an.queda && !relato) {
    partes.push('Não havia danos externos evidentes na recepção; a inspeção detalhada foi feita após a desmontagem.')
  }
  const nChegada = os.fotos.filter((f) => f.fase === 'chegada').length
  if (nChegada) partes.push(`O estado de chegada está documentado em ${nChegada} ${nChegada === 1 ? 'foto' : 'fotos'}.`)
  return partes.join(' ')
}

function secaoDiagnostico(ctx: ContextoRelatorio, an: Analise, v: number): string {
  const { os } = ctx
  const diag = semPonto(os.diagnostico)
  const partes: string[] = []
  if (an.achados.length) {
    partes.push([
      'Após a desmontagem e a inspeção das peças, foram constatados os seguintes problemas.',
      'A desmontagem e os testes de bancada revelaram o que segue.',
      'Com o equipamento desmontado, a avaliação técnica identificou as falhas abaixo.',
    ][variante(ctx, v)])
    const efeitos = new Set<string>()
    for (const d of an.achados) {
      const r = d.achado.comp ? refComp(d.achado.comp, d.nums, d.plural) : { txt: '', pl: false }
      const f = d.achado.frase(r.txt, r.pl, d.trecho, d.achado.comp)
      const ef = d.achado.efeito && !efeitos.has(d.achado.efeito) ? ` ${d.achado.efeito}` : ''
      if (d.achado.efeito) efeitos.add(d.achado.efeito)
      partes.push(`${cap(f)}.${ef}`)
    }
    if (an.queda) partes.push('Em conjunto, os danos são compatíveis com o impacto sofrido pelo equipamento.')
  } else if (diag) {
    partes.push('Após a desmontagem e os testes de bancada, a avaliação técnica registrou o que segue.')
  } else {
    partes.push('Foi feita inspeção completa de estrutura, propulsão, sistema de pulverização, sensores e eletrônica, sem falhas adicionais além das relatadas pelo cliente.')
  }
  if (diag && !normalizar(partes.join(' ')).includes(normalizar(diag).slice(0, 40))) partes.push(`Diagnóstico registrado na OS: ${diag}.`)
  const nDano = os.fotos.filter((f) => f.fase === 'dano').length
  if (nDano) partes.push(`As peças danificadas estão registradas em ${nDano} ${nDano === 1 ? 'foto' : 'fotos'}, com a respectiva legenda.`)
  return partes.join(' ')
}

function linhasServicos(ctx: ContextoRelatorio, an: Analise): string[] {
  const { os } = ctx
  const usados = new Set<string>()
  const linhas: string[] = []
  for (const t of an.trocas) {
    const r = refComp(t.comp, t.nums)
    const item = pecaDoItem(os, t.comp, usados)
    const qtd = item && item.quantidade > 1 ? `, ${item.quantidade} unidades` : ''
    const peca = item ? ` (${item.descricao}${qtd})` : ''
    linhas.push(`Substituição ${r.txt.replace(/^o /, 'do ').replace(/^a /, 'da ').replace(/^os /, 'dos ').replace(/^as /, 'das ')}${peca}`)
  }
  for (const it of os.itens) {
    if (it.tipo === 'peca' && !usados.has(it.id)) {
      usados.add(it.id)
      linhas.push(`Substituição de ${minuscula(it.descricao)}${it.quantidade > 1 ? ` (${it.quantidade} unidades)` : ''}`)
    }
  }
  for (const r of an.reparos) linhas.push(`Reparo realizado: ${r.replace(/^(eu )?/, '')}`)
  linhas.push(...an.limpeza)
  linhas.push(...an.calibracoes)
  if (an.firmware) linhas.push('Atualização do firmware do equipamento para a versão mais recente')
  for (const it of os.itens) {
    if (it.tipo !== 'servico') continue
    if (linhas.some((l) => similaridade(it.descricao, l) >= 0.6 || similaridade(l, it.descricao) >= 0.6)) continue
    linhas.push(cap(it.descricao))
  }
  return unicos(linhas)
}

function secaoServicos(ctx: ContextoRelatorio, an: Analise): string {
  const l = linhasServicos(ctx, an)
  if (!l.length) return 'Revisão geral e inspeção dos sistemas do equipamento, sem substituição de peças.'
  return l.map((x) => `- ${x}`).join('\n')
}

function secaoTestes(ctx: ContextoRelatorio, an: Analise, v: number): string {
  const { os } = ctx
  const partes: string[] = []
  const vooOk = an.testeVoo
  if (vooOk === true || (vooOk === null && an.testeVazao === null && (an.trocas.length || os.itens.length))) {
    partes.push([
      'Foi realizado voo de teste com decolagem, estabilização em hover e deslocamentos, sem vibração anormal e com resposta correta de motores e sensores.',
      'No voo de teste, o equipamento decolou, manteve o hover estável e respondeu bem aos comandos, sem ruídos ou vibração fora do normal.',
      'O voo de teste foi concluído sem intercorrências: hover estável, resposta normal dos comandos e leituras corretas dos sensores.',
    ][variante(ctx, v)])
  } else if (vooOk === false) {
    partes.push('O voo de teste apresentou comportamento fora do esperado, e o equipamento permanece em observação até nova verificação.')
  }
  if (an.testeVazao === true) {
    partes.push('O teste de vazão e pressão da bomba ficou dentro dos parâmetros do fabricante, com padrão de pulverização uniforme em todos os bicos.')
  } else if (an.testeVazao === false) {
    partes.push('O teste de vazão ainda apresentou irregularidade e requer nova verificação antes da liberação.')
  }
  const aprovado = vooOk !== false && an.testeVazao !== false
  if (aprovado) {
    const nSaida = os.fotos.filter((f) => f.fase === 'saida').length
    partes.push(`Concluídos os testes, o equipamento foi liberado em condições normais de operação${nSaida ? `, conforme o registro fotográfico de saída (${nSaida} ${nSaida === 1 ? 'foto' : 'fotos'})` : ''}.`)
  }
  if (!partes.length) partes.push('Os testes finais ainda não foram registrados nesta OS.')
  return partes.join(' ')
}

function secaoRecomendacoes(ctx: ContextoRelatorio, an: Analise): string {
  const recs = unicos(an.achados.map((d) => d.achado.rec).filter((x): x is string => !!x))
  if (an.queda) recs.unshift('Antes das próximas operações, reconhecer a área de voo e revisar a rota para evitar obstáculos que causem nova colisão.')
  const horas = ctx.equipamento?.horasVoo ?? 0
  if (horas > 0) {
    const proxima = (Math.floor(horas / 100) + 1) * 100
    const falta = proxima - horas
    recs.push(falta <= 25
      ? `O equipamento tem ${numero(horas)} horas de voo e está próximo da revisão geral de ${proxima} horas; recomenda-se agendá-la nas próximas semanas.`
      : `Realizar a próxima revisão geral com ${numero(proxima)} horas de voo (hoje o equipamento marca ${numero(horas)} horas).`)
  } else {
    recs.push('Realizar revisão preventiva a cada 100 horas de voo ou no início de cada safra.')
  }
  if (!recs.some((r) => /lavag|lavar|limpar/.test(normalizar(r)))) recs.push('Lavar o sistema de pulverização com água limpa ao fim de cada jornada e guardar o equipamento seco e protegido.')
  return recs.slice(0, 5).map((r) => `- ${r}`).join('\n')
}

function secaoResumo(ctx: ContextoRelatorio, an: Analise, v: number): string {
  const { os, equipamento, modelo, cliente } = ctx
  const nome = `${modelo?.nome ? `DJI Agras ${modelo.nome.replace(/^(DJI\s*)?(Agras\s*)?/i, '')}` : 'equipamento'}${equipamento?.serial ? ` (série ${equipamento.serial})` : ''}`
  const dono = cliente ? ` de ${cliente.nome}` : ''
  const queixa = textoRelato(os.relatoCliente)
  const curtos = an.achados.map(curtoDe)
  const execs = linhasServicos(ctx, an).map((x) => minuscula(x))
  const a = `O ${nome}${dono} passou por manutenção na oficina do Grupo AERO${queixa ? `, a partir do relato "${queixa.length > 110 ? `${queixa.slice(0, 107).trim()}...` : queixa}"` : ''}.`
  const b = curtos.length
    ? [
      `Na avaliação técnica foram constatados ${lista(curtos)}.`,
      `A inspeção identificou ${lista(curtos)}.`,
      `Os testes de bancada apontaram ${lista(curtos)}.`,
    ][variante(ctx, v)]
    : 'A inspeção completa não encontrou falhas além das relatadas.'
  const c = execs.length ? `Foram executados: ${lista(execs.slice(0, 4))}${execs.length > 4 ? ' e outros serviços' : ''}.` : ''
  const fim = an.testeVoo === false || an.testeVazao === false
    ? 'O equipamento segue em acompanhamento até a conclusão dos testes.'
    : 'Após os testes finais, o equipamento foi liberado em condições normais de operação.'
  return [a, b, c, fim].filter(Boolean).join(' ')
}

function gerarSecoes(ctx: ContextoRelatorio, v: number): Record<SecaoRelatorio, string> {
  const an = analisar(ctx.notas)
  return {
    resumo: secaoResumo(ctx, an, v),
    condicaoChegada: secaoChegada(ctx, an, v),
    diagnostico: secaoDiagnostico(ctx, an, v),
    servicosExecutados: secaoServicos(ctx, an),
    testes: secaoTestes(ctx, an, v),
    recomendacoes: secaoRecomendacoes(ctx, an),
  }
}

/* ---------- Gemini ---------- */

const SISTEMA = 'Você é um técnico redator de oficina de drones agrícolas DJI Agras. Escreva laudos de manutenção em português do Brasil, em linguagem técnica clara, na terceira pessoa e no passado, sem inventar fatos que não estejam nas anotações, nos dados da OS ou nas fotos. Responda somente um objeto JSON.'

function promptGemini(ctx: ContextoRelatorio, secoes?: SecaoRelatorio[]): string {
  const { os, cliente, equipamento, modelo } = ctx
  const itens = os.itens.map((i) => `${i.tipo}: ${i.descricao} x${i.quantidade}`).join('; ') || 'nenhum'
  const fotos = os.fotos.map((f) => `${f.fase}: ${f.legenda || 'sem legenda'}`).join('; ') || 'nenhuma'
  const chaves = (secoes ?? CHAVES).join(', ')
  return [
    `Dados da OS ${os.numero}: cliente ${cliente?.nome ?? '-'}; modelo ${modelo?.nome ?? '-'}; série ${equipamento?.serial ?? '-'}; horas de voo ${equipamento?.horasVoo ?? '-'}; entrada em ${dataCurta(os.abertura)}.`,
    `Relato do cliente: ${os.relatoCliente || '-'}`,
    `Diagnóstico registrado: ${os.diagnostico || '-'}`,
    `Itens da OS: ${itens}`,
    `Legendas das fotos: ${fotos}`,
    `Anotações do técnico: ${ctx.notas || '-'}`,
    `Devolva um JSON com as chaves: ${chaves}. Cada valor é texto. Em servicosExecutados e recomendacoes use uma linha por item iniciada por "- ". Em resumo, condicaoChegada, diagnostico e testes use parágrafos corridos.`,
  ].join('\n')
}

function imagensDaOS(os: OrdemServico): string[] {
  return os.fotos.map((f) => f.url).filter((u) => /^data:image\/(jpeg|png|webp)/.test(u)).slice(0, 6)
}

/* ---------- API pública ---------- */

export async function gerarRelatorio(ctx: ContextoRelatorio): Promise<RelatorioOS> {
  if (iaReal()) {
    try {
      const bruto = await chamarGemini({ sistema: SISTEMA, prompt: promptGemini(ctx), imagens: imagensDaOS(ctx.os), json: true })
      const j = JSON.parse(bruto.replace(/^```json\s*|\s*```$/g, '')) as Record<string, unknown>
      if (CHAVES.every((k) => typeof j[k] === 'string' && (j[k] as string).trim())) {
        return {
          geradoEm: new Date().toISOString(),
          resumo: j.resumo as string, condicaoChegada: j.condicaoChegada as string, diagnostico: j.diagnostico as string,
          servicosExecutados: j.servicosExecutados as string, testes: j.testes as string, recomendacoes: j.recomendacoes as string,
          notasTecnico: ctx.notas,
        }
      }
    } catch { /* cai no simulado */ }
  } else {
    await esperar(2600)
  }
  const s = gerarSecoes(ctx, 0)
  return { geradoEm: new Date().toISOString(), ...s, notasTecnico: ctx.notas }
}

const JARGAO: [RegExp, string][] = [
  [/\bESCs?\b/g, 'controlador do motor'], [/\bIMU\b/g, 'sensor de movimento'], [/\bhover\b/g, 'voo parado'],
  [/\bfirmware\b|\bfirmware\b/gi, 'programa interno'], [/\brotor\b/g, 'eixo'], [/\bpulverização\b/g, 'aplicação'],
]

export async function reescreverSecao(secao: SecaoRelatorio, textoAtual: string, instrucao: string, ctx: ContextoRelatorio): Promise<string> {
  if (iaReal()) {
    try {
      const prompt = `${promptGemini(ctx, [secao])}\nTrecho atual da seção "${secao}":\n${textoAtual || '(vazio)'}\nInstrução de reescrita: ${instrucao || 'reescreva com outras palavras, mantendo os fatos'}`
      const j = JSON.parse((await chamarGemini({ sistema: SISTEMA, prompt, json: true })).replace(/^```json\s*|\s*```$/g, '')) as Record<string, unknown>
      if (typeof j[secao] === 'string' && (j[secao] as string).trim()) return j[secao] as string
    } catch { /* cai no simulado */ }
  } else {
    await esperar(1100)
  }
  const ins = normalizar(instrucao)
  const ehLista = secao === 'servicosExecutados' || secao === 'recomendacoes'
  const base = textoAtual.trim()
  const sorteio = 1 + Math.floor(Math.random() * 2)
  const regenerado = gerarSecoes({ ...ctx, notas: instrucao.trim() && !/curt|resum|enxut|simples|leigo|claro|objetiv/.test(ins) ? `${ctx.notas}, ${instrucao}` : ctx.notas }, sorteio)[secao]
  if (base && /curt|resum|enxut|objetiv|menos/.test(ins)) {
    if (ehLista) return base.split('\n').slice(0, 3).join('\n')
    return frases(base).slice(0, 2).join(' ')
  }
  if (base && /simples|leigo|claro|facil|cliente/.test(ins)) {
    return JARGAO.reduce((t, [re, por]) => t.replace(re, por), base)
  }
  if (base && /detalh|complet|alonga|expand|mais/.test(ins)) {
    if (ehLista) {
      const extra = regenerado.split('\n').filter((l) => !base.includes(l))
      return [base, ...extra].join('\n')
    }
    const extra = frases(regenerado).filter((f) => !base.includes(f.slice(0, 30)))
    return [base, ...extra].join(' ')
  }
  return regenerado
}
